/* MIH 뷰어 — 시점마다 PaleoDEM 배경, PaleoCoastlines 해안선, PBDB 채집지를 겹친다.
 *
 * 자료는 파이프라인이 만든 파일(data/…)만 읽는다. 층서표와 퇴적 환경 나무도 index.json 에서
 * 받는다(pipeline/timescale.py·environments.py 가 한 곳). PBDB 에 바로 묻는 것은 셋이다 —
 * 채집지 산출 목록, 분류군 찾기, 분류군 이름 후보. PBDB 는 CORS 를 열어 두었다(`*`).
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var DATA = app.dataset.dataBase.replace(/x$/, "");
  var LABELS_URL = app.dataset.labelsUrl;
  var CSRF = app.dataset.csrf;
  var PBDB = "https://paleobiodb.org/data1.2/";
  var PBDB_COLL_PAGE = "https://paleobiodb.org/classic/basicCollectionSearch?collection_no=";
  var WINDOW_MA = 2.5;        // pipeline/common.py 와 같은 값
  var MAX_SPAN_MA = 20;
  var OLDEST = 540;
  var WORLD = [[-90, -180], [90, 180]];
  var UNKNOWN_COLOR = "#f5f5f5";
  var UNLISTED = "__unlisted__";

  var $ = function (id) { return document.getElementById(id); };
  var state = {
    frames: [], i: 0, taxon: "", playing: null,
    units: {}, kids: {}, focus: null,       // 층서표: 고른 단위(없으면 지금 지도의 절)
    periods: [],                            // 기 단위 — 시대 색에 쓴다
    tree: [], termTop: {}, termGroup: {},   // 퇴적 환경 나무
    groupColor: {}, topColor: {},
    enabled: {},                            // 켠 원 용어(UNLISTED 포함)
    payload: null,
    colorBy: "env",                         // 점 색: env(퇴적기원) · age(기 단위 시대)
    countries: [], countryBy: {}, country: null,   // 국가로 거르기
    labels: { env: {} }, editable: false, needsKey: false, editing: false,
  };
  var cache = {};

  function getJSON(url) {
    if (!cache[url]) {
      cache[url] = fetch(url).then(function (r) {
        if (!r.ok) throw new Error(r.status + " " + url);
        return r.json();
      }).catch(function (err) { delete cache[url]; throw err; });
    }
    return cache[url];
  }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function fmtAge(age) { return (age % 1 ? age.toFixed(1) : String(age)) + " Ma"; }
  function fmtNum(n) { return Number(n).toLocaleString("ko-KR"); }

  // ── 점 색 ───────────────────────────────────────────────────────────
  // 퇴적기원: 환경군의 색(해양기원 하늘색→남색, 육상기원 주황→빨강, 미상 흰색).
  // 시대: 채집지 연대 중간값이 든 기(Period)의 층서표 색.
  function envColor(environment) {
    return state.groupColor[state.termGroup[termKey(environment)]] || UNKNOWN_COLOR;
  }
  function periodOf(maxMa, minMa) {
    var mid = (Number(maxMa) + Number(minMa)) / 2;
    for (var k = 0; k < state.periods.length; k++) {
      var p = state.periods[k];
      if (mid > p.top && mid <= p.base) return p;
    }
    return mid === 0 ? state.periods[0] : null;
  }
  function pointColor(environment, maxMa, minMa) {
    if (state.colorBy === "age") {
      var p = periodOf(maxMa, minMa);
      return p ? p.color : UNKNOWN_COLOR;
    }
    return envColor(environment);
  }
  // 채집지를 보일지 — 켠 환경, 고른 나라.
  function passes(environment, cc) {
    if (!state.enabled[termKey(environment)]) return false;
    return !state.country || cc === state.country;
  }

  // 배경색 위 글자색 — 층서표 색은 밝은 것과 짙은 것이 섞여 있다.
  function ink(hex) {
    var n = parseInt(hex.slice(1), 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
    return (0.299 * r + 0.587 * g + 0.114 * b) > 150 ? "#1b1b1b" : "#ffffff";
  }

  // ── 지도 ────────────────────────────────────────────────────────────
  var map = L.map("map", {
    crs: L.CRS.EPSG4326,
    center: [0, 0], zoom: 1, minZoom: 1, maxZoom: 7,
    maxBounds: [[-100, -200], [100, 200]], maxBoundsViscosity: 0.8,
    worldCopyJump: false, attributionControl: true,
  });
  map.attributionControl.setPrefix(false);
  map.fitBounds(WORLD);
  if (window.ResizeObserver) {
    var wasEmpty = true;
    new ResizeObserver(function (entries) {
      var box = entries[0].contentRect;
      map.invalidateSize();
      if (wasEmpty && box.width > 0 && box.height > 0) map.fitBounds(WORLD);
      wasEmpty = !(box.width > 0 && box.height > 0);
    }).observe($("map"));
  }

  var relief = L.imageOverlay("", WORLD, { interactive: false, className: "relief" }).addTo(map);
  // 해안선은 SVG 로, 화석은 그 위 전용 창의 캔버스로 그린다. 둘 다 캔버스로 두면 나중에
  // 생긴 해안선 캔버스가 화석 캔버스를 덮어 점을 눌러도 아무 일이 없다.
  var coastLayer = L.geoJSON(null, {
    style: { color: "#ff3da8", weight: 1.2, opacity: 0.9, fill: false },
    interactive: false, renderer: L.svg(),
  }).addTo(map);
  // 국경선: 현재 국경을 그때 자리로 돌린 것. 반투명하게, 고른 나라만 또렷하게.
  var borderLayer = L.geoJSON(null, {
    style: function (feature) {
      var picked = state.country && countryIso(state.country) === feature.properties.cc;
      return picked ? { color: "#ffd400", weight: 2.2, opacity: 0.95, fill: false }
                    : { color: "#ffffff", weight: 0.7, opacity: 0.4, fill: false };
    },
    interactive: false, renderer: L.svg(),
  }).addTo(map);
  map.createPane("fossils").style.zIndex = 450;
  var renderer = L.canvas({ padding: 0.3, pane: "fossils" });
  var fossilLayer = L.layerGroup().addTo(map);
  var taxonLayer = L.layerGroup().addTo(map);
  var gridLayer = L.layerGroup();
  for (var lon = -180; lon <= 180; lon += 30) gridLayer.addLayer(L.polyline([[-90, lon], [90, lon]], { color: "#fff", weight: 0.5, opacity: 0.35, interactive: false }));
  for (var lat = -60; lat <= 60; lat += 30) gridLayer.addLayer(L.polyline([[lat, -180], [lat, 180]], { color: "#fff", weight: lat === 0 ? 1 : 0.5, opacity: 0.35, interactive: false }));
  window.MIH = { map: map, fossils: fossilLayer, taxa: taxonLayer, borders: borderLayer, state: state };   // 콘솔에서 들여다보기용

  // 배경 해상도: EPSG:4326 에서 세계 폭은 512·2^zoom 픽셀이다. zoom 2 까지는 2048,
  // 그보다 확대하면 4096 을 부른다(6 분 격자가 3601 칸이라 그 이상은 얻을 것이 없다).
  function reliefWidth() { return map.getZoom() >= 3 ? "4096" : "2048"; }
  function reliefUrl(f) {
    var files = f.relief_files || {};
    return DATA + (files[reliefWidth()] || f.relief);
  }
  map.on("zoomend", function () {
    var f = frame();
    if (!f) return;
    var url = reliefUrl(f);
    if (relief._url !== url) relief.setUrl(url);
    noteRelief(f);
  });
  function noteRelief(f) {
    $("relief-note").textContent = "배경: PaleoDEM " + (f.grid === "6min" ? "0.1° 격자" : "1° 격자") +
      ", " + reliefWidth() + " 폭 그림.";
  }

  // ── 층서표 ──────────────────────────────────────────────────────────
  var RANK_ORDER = ["era", "period", "subperiod", "epoch", "age"];
  function unit(id) { return state.units[id]; }
  function chain(u) { var out = []; while (u) { out.unshift(u); u = unit(u.parent); } return out; }
  function descendants(u, rank) {
    var out = [];
    (state.kids[u.id] || []).forEach(function (k) {
      if (k.rank === rank) out.push(k); else out = out.concat(descendants(k, rank));
    });
    return out;
  }
  function byOldFirst(a, b) { return b.base - a.base; }
  // 칩에 적는 이름: 전기·중기·후기 세는 위 단위를 알고 있으니 짧게, 석탄기는 아기를 붙인다.
  function chipName(u) {
    if (u.rank === "epoch" && unit(u.parent).rank === "subperiod") return u.full.replace("아기 ", " ");
    return u.ko;
  }
  function frameUnits(f) { return (f.units || []).map(unit).filter(Boolean); }

  function initTimescale(ts) {
    ts.units.forEach(function (u) {
      state.units[u.id] = u;
      (state.kids[u.parent] = state.kids[u.parent] || []).push(u);
    });
    Object.keys(state.kids).forEach(function (k) { state.kids[k].sort(byOldFirst); });
    state.periods = ts.units.filter(function (u) { return u.rank === "period"; })
      .sort(function (a, b) { return a.top - b.top; });
    // 시점 막대 밑의 기·세 띠 — 막대와 같게 왼쪽이 540 Ma 다.
    var rows = { period: $("strip-period"), epoch: $("strip-epoch") };
    ts.units.forEach(function (u) {
      if (!rows[u.rank] || u.top >= OLDEST) return;
      var left = (OLDEST - Math.min(u.base, OLDEST)) / OLDEST * 100;
      var width = (Math.min(u.base, OLDEST) - u.top) / OLDEST * 100;
      var band = document.createElement("span");
      band.style.cssText = "left:" + left + "%;width:" + width + "%;background:" + u.color;
      band.title = u.full + " (" + u.base + "–" + u.top + " Ma)";
      band.addEventListener("click", function () { focusUnit(u); });
      rows[u.rank].appendChild(band);
    });
  }

  function renderChrono() {
    var f = frame();
    var here = {};
    frameUnits(f).forEach(function (u) { here[u.id] = true; });
    // 지금 지도의 단위로 채우고, 고른 단위가 있으면 그것과 그 위를 덮어쓴다. 고른 단위 안에
    // 지도가 있으면 아래 줄(세·절)은 지도의 것이 그대로 남는다.
    var picked = {};
    frameUnits(f).forEach(function (u) { picked[u.rank] = u; });
    if (state.focus) {
      var inside = f.age > state.focus.top && f.age <= state.focus.base;
      var below = RANK_ORDER.slice(RANK_ORDER.indexOf(state.focus.rank) + 1);
      if (!inside) below.forEach(function (r) { delete picked[r]; });
      chain(state.focus).forEach(function (u) { picked[u.rank] = u; });
    }
    var lists = {
      era: Object.keys(state.units).map(unit).filter(function (u) { return u.rank === "era"; }).sort(byOldFirst),
      period: picked.era ? descendants(picked.era, "period") : [],
      epoch: picked.period ? descendants(picked.period, "epoch") : [],
      age: picked.epoch ? descendants(picked.epoch, "age") : [],
    };
    document.querySelectorAll("#chrono .chips").forEach(function (box) {
      var rank = box.dataset.rank;
      box.innerHTML = "";
      lists[rank].forEach(function (u) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "chip" + (picked[rank] && picked[rank].id === u.id ? " on" : "") + (here[u.id] ? " here" : "");
        b.style.background = u.color;
        b.style.color = ink(u.color);
        b.textContent = chipName(u);
        b.title = u.full + " · " + u.en + " · " + u.base + "–" + u.top + " Ma" + (here[u.id] ? " · 지금 지도" : "");
        b.addEventListener("click", function () { focusUnit(u); });
        box.appendChild(b);
      });
      if (!lists[rank].length) box.innerHTML = '<span class="none">' + (rank === "age" && picked.epoch ? "절로 나뉘지 않았다" : "—") + "</span>";
    });
  }

  // 단위를 고르면 그 안의 지도 가운데 단위 한가운데에 가장 가까운 것으로 간다.
  // 안에 지도가 없으면(짧은 절) 가장 가까운 지도로 가고 그렇다고 적는다.
  function focusUnit(u) {
    var mid = (u.top + u.base) / 2;
    var best = -1, bestInside = -1;
    state.frames.forEach(function (f, j) {
      var d = Math.abs(f.age - mid);
      if (best < 0 || d < Math.abs(state.frames[best].age - mid)) best = j;
      var inside = f.age > u.top && f.age <= u.base;
      if (inside && (bestInside < 0 || d < Math.abs(state.frames[bestInside].age - mid))) bestInside = j;
    });
    var j = bestInside >= 0 ? bestInside : best;
    show(j, { focus: u });
    $("chrono-note").textContent = bestInside >= 0
      ? u.full + " (" + u.base + "–" + u.top + " Ma) 안의 " + fmtAge(state.frames[j].age) + " 지도."
      : u.full + " (" + u.base + "–" + u.top + " Ma) 안에는 지도 시점이 없다 — 가장 가까운 " + fmtAge(state.frames[j].age) + " 지도를 보인다.";
  }

  function renderHeader(f) {
    $("now-age").textContent = fmtAge(f.age);
    $("now-units").innerHTML = frameUnits(f).filter(function (u) { return u.rank !== "subperiod"; }).map(function (u) {
      return '<span class="unit" style="background:' + u.color + ";color:" + ink(u.color) + '" title="' + esc(u.en) + '">' +
        esc(u.rank === "epoch" ? chipName(u) : u.ko) + "</span>";
    }).join('<span class="sep">›</span>');
    $("now-label").textContent = f.label;
  }

  // ── 시점 ────────────────────────────────────────────────────────────
  function frame() { return state.frames[state.i]; }

  function show(i, opts) {
    opts = opts || {};
    state.i = Math.max(0, Math.min(state.frames.length - 1, i));
    state.focus = opts.focus || null;
    if (!opts.focus) $("chrono-note").textContent = "";
    var f = frame();
    $("slider").value = state.i;
    renderHeader(f);
    renderChrono();
    try { history.replaceState(null, "", "#age=" + f.age); } catch (e) { /* 미리보기 등 */ }

    relief.setUrl(reliefUrl(f));
    noteRelief(f);
    drawCoast(f);
    drawBorders(f, false);
    loadFossils(f);
    if (state.taxon) searchTaxon(state.taxon);
    [state.i - 1, state.i + 1].forEach(function (j) {
      if (state.frames[j]) { var img = new Image(); img.src = reliefUrl(state.frames[j]); }
    });
  }

  function drawCoast(f) {
    coastLayer.clearLayers();
    var note = $("coast-note");
    if (!f.coastline) { note.textContent = "이 시점 ±10 Myr 안에 해안선 자료가 없다."; return; }
    note.textContent = f.coastline.age === f.age
      ? "PaleoCoastlines " + fmtAge(f.coastline.age) + "."
      : "가장 가까운 " + fmtAge(f.coastline.age) + " 해안선을 그었다.";
    var want = f.age;
    getJSON(DATA + f.coastline.file).then(function (geo) {
      if (frame().age !== want) return;
      coastLayer.clearLayers();
      if ($("coast").checked) coastLayer.addData(geo);
    });
  }

  // ── 퇴적 환경 나무 ──────────────────────────────────────────────────
  function termKey(term) { return state.termTop.hasOwnProperty(term) ? term : UNLISTED; }

  function initEnvironments(tree) {
    state.tree = tree;
    var box = $("envtree");
    box.innerHTML = "";
    tree.forEach(function (top) {
      state.topColor[top.id] = top.color || UNKNOWN_COLOR;
      var topEl = node("top", top.id, top.id, top.ko, top.en, swatch(top.color));
      // 환경군은 펼쳐 둔다 — 접어 두면 작은 ▸ 단추를 찾지 못해 없는 것처럼 보였다.
      // 원 용어(셋째 단계)는 많아서 접어 둔다.
      var groupsEl = document.createElement("div");
      groupsEl.className = "kids";
      top.groups.forEach(function (g) {
        var terms = g.id === "o-unlisted" ? [UNLISTED] : g.terms.map(function (t) { return t.term; });
        terms.forEach(function (t) { state.termTop[t] = top.id; state.termGroup[t] = g.id; state.enabled[t] = true; });
        state.groupColor[g.id] = g.color || UNKNOWN_COLOR;
        var gEl = node("group", g.id, g.id, g.ko, g.en, swatch(g.color));
        var termsEl = document.createElement("div");
        termsEl.className = "kids";
        termsEl.hidden = true;
        g.terms.forEach(function (t) {
          termsEl.appendChild(node("term", t.term, "term:" + t.term, t.ko, t.term, ""));
        });
        if (termsEl.children.length > 1) wireToggle(gEl, termsEl);
        gEl.appendChild(termsEl);
        groupsEl.appendChild(gEl);
      });
      wireToggle(topEl, groupsEl);
      topEl.appendChild(groupsEl);
      box.appendChild(topEl);
    });
    delete state.termTop[UNLISTED];
    box.addEventListener("change", function (e) {
      var input = e.target;
      if (!input.dataset.level) return;
      var on = input.checked;
      termsUnder(input.dataset.level, input.dataset.id).forEach(function (t) { state.enabled[t] = on; });
      syncChecks();
      redraw();
    });
    box.addEventListener("click", function (e) {
      var pen = e.target.closest(".pen");
      if (pen) startEdit(pen.closest(".row"));
    });
    syncChecks();
    applyLabels();
  }

  // 환경 칸의 색 견본 — 퇴적기원 색일 때만 보인다(시대 색일 때는 범례가 따로 뜬다).
  function swatch(color) {
    return '<i class="dot env-dot" style="background:' + esc(color || UNKNOWN_COLOR) + '"></i>';
  }

  // 한 칸: [펼침] [체크 · 한글 이름 · 원 용어(반투명)] [✎] [수]. 이름은 덮어쓰기 표를 거쳐 적는다.
  function node(level, id, labelId, ko, original, prefix) {
    var el = document.createElement("div");
    el.className = "env " + level;
    el.dataset.id = id;
    el.innerHTML = '<div class="row"><button type="button" class="tog" aria-label="펼치기" hidden>▸</button>' +
      '<label><input type="checkbox" data-level="' + level + '" data-id="' + esc(id) + '"> ' + prefix +
      ' <span class="name" data-label="' + esc(labelId) + '" data-default="' + esc(ko) + '">' + esc(ko) + "</span>" +
      (original ? ' <span class="orig">' + esc(original) + "</span>" : "") + "</label>" +
      '<button type="button" class="pen" title="이름 고치기" aria-label="' + esc(ko) + ' 이름 고치기">✎</button>' +
      '<small class="n" data-count="' + level + ":" + esc(id) + '"></small></div>';
    return el;
  }

  // ── 명칭 고치기 ─────────────────────────────────────────────────────
  // 기본 이름은 index.json(파이프라인), 고친 이름은 서버의 덮어쓰기 표(/labels)에 있다.
  function labelFor(id, fallback) {
    var name = state.labels.env[id];
    return name || fallback;
  }

  function applyLabels() {
    document.querySelectorAll("#envtree .name[data-label]").forEach(function (span) {
      var custom = state.labels.env[span.dataset.label];
      span.textContent = custom || span.dataset.default;
      span.classList.toggle("custom", !!custom);
      span.title = custom ? "고친 이름 · 기본: " + span.dataset.default : "";
    });
  }

  function loadLabels() {
    return fetch(LABELS_URL, { cache: "no-store" }).then(function (r) { return r.json(); }).then(function (data) {
      state.labels = { env: data.env || {} };
      state.editable = !!data.editable;
      state.needsKey = !!data.needs_key;
      $("edit-toggle").hidden = !state.editable;
      $("key-row").hidden = !state.needsKey;
      applyLabels();
    }).catch(function () { /* 덮어쓰기가 없으면 기본 이름으로 그린다 */ });
  }

  function setEditing(on) {
    state.editing = on;
    app.classList.toggle("editing", on);
    $("editbar").hidden = !on;
    $("edit-toggle").setAttribute("aria-pressed", String(on));
    $("edit-toggle").textContent = on ? "✓ 고치기 마침" : "✎ 명칭 고치기";
    if (on) {
      // 원 용어까지 고칠 수 있게 모두 펼친다.
      document.querySelectorAll("#envtree .kids[hidden]").forEach(function (k) {
        k.hidden = false;
        var tog = k.parentNode.querySelector(":scope > .row > .tog");
        if (tog) { tog.textContent = "▾"; tog.setAttribute("aria-expanded", "true"); }
      });
    } else {
      document.querySelectorAll("#envtree .editor").forEach(function (ed) { ed.cancel(); });
    }
  }

  function startEdit(row) {
    if (row.querySelector(".editor")) return;
    var span = row.querySelector(".name");
    var label = row.querySelector("label");
    var form = document.createElement("form");
    form.className = "editor";
    form.innerHTML = '<input type="text" maxlength="60" aria-label="새 이름">' +
      '<button type="submit">저장</button><button type="button" class="cancel">취소</button>';
    var input = form.querySelector("input");
    input.value = span.textContent;
    input.placeholder = "기본: " + span.dataset.default;
    label.hidden = true;
    row.querySelector(".pen").hidden = true;
    label.after(form);
    input.focus();
    input.select();
    form.cancel = function () { form.remove(); label.hidden = false; row.querySelector(".pen").hidden = false; };
    form.querySelector(".cancel").addEventListener("click", form.cancel);
    input.addEventListener("keydown", function (e) { if (e.key === "Escape") form.cancel(); });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var name = input.value.trim();
      if (name === span.dataset.default) name = "";          // 기본과 같으면 덮어쓰기를 지운다
      saveLabel(span.dataset.label, name).then(function () { form.cancel(); });
    });
  }

  function saveLabel(id, name) {
    var status = $("edit-status");
    status.textContent = "저장하는 중…";
    return fetch(LABELS_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-CSRFToken": CSRF },
      body: JSON.stringify({ kind: "env", id: id, name: name, key: $("editor-key").value }),
    }).then(function (r) {
      return r.json().then(function (data) {
        if (!r.ok) throw new Error(data.error || r.status);
        return data;
      });
    }).then(function (data) {
      state.labels = { env: data.env || {} };
      applyLabels();
      status.textContent = name ? "저장했다." : "기본 이름으로 돌렸다.";
    }).catch(function (err) {
      status.textContent = "저장하지 못했다: " + (err.message || err);
      throw err;
    });
  }

  function wireToggle(el, kids) {
    var tog = el.querySelector(".tog");
    var paint = function () {
      tog.textContent = kids.hidden ? "▸" : "▾";
      tog.setAttribute("aria-label", kids.hidden ? "펼치기" : "접기");
      tog.setAttribute("aria-expanded", String(!kids.hidden));
    };
    tog.hidden = false;
    paint();
    tog.addEventListener("click", function () { kids.hidden = !kids.hidden; paint(); });
  }

  function termsUnder(level, id) {
    var all = Object.keys(state.enabled);
    if (level === "term") return [id === "" ? "" : id];
    if (level === "group") return all.filter(function (t) { return state.termGroup[t] === id; });
    return all.filter(function (t) { return (t === UNLISTED ? "o" : state.termTop[t]) === id; });
  }

  // 위 칸의 체크는 아래 용어들로 정한다 — 모두 켜짐/모두 꺼짐/섞임(indeterminate).
  function syncChecks() {
    document.querySelectorAll("#envtree input[data-level]").forEach(function (input) {
      var terms = termsUnder(input.dataset.level, input.dataset.id);
      var on = terms.filter(function (t) { return state.enabled[t]; }).length;
      input.checked = on > 0 && on === terms.length;
      input.indeterminate = on > 0 && on < terms.length;
    });
  }

  function syncCounts(rows, col) {
    var counts = {};
    rows.forEach(function (row) {
      var t = termKey(row[col.environment]);
      counts["term:" + t] = (counts["term:" + t] || 0) + 1;
      var g = state.termGroup[t], top = t === UNLISTED ? "o" : state.termTop[t];
      counts["group:" + g] = (counts["group:" + g] || 0) + 1;
      counts["top:" + top] = (counts["top:" + top] || 0) + 1;
    });
    document.querySelectorAll("#envtree [data-count]").forEach(function (el) {
      var n = counts[el.dataset.count] || 0;
      el.textContent = fmtNum(n);
      var row = el.closest(".env");
      row.classList.toggle("zero", n === 0);
      if (el.dataset.count === "group:o-unlisted") row.hidden = n === 0;
    });
  }

  // ── 화석 채집지 ─────────────────────────────────────────────────────
  function loadFossils(f) {
    $("fossil-count").textContent = "";
    state.payload = null;
    fossilLayer.clearLayers();
    if (!f.fossils || !f.fossils.file) return;
    var want = f.age;
    getJSON(DATA + f.fossils.file).then(function (payload) {
      if (frame().age !== want) return;
      state.payload = payload;
      drawFossils();
    });
  }

  // 점 하나. 테두리를 흰색으로 두어 푸른 바다 위 푸른 점, 짙은 땅 위 붉은 점도 보이게 한다.
  function marker(latlng, color, big) {
    return L.circleMarker(latlng, {
      renderer: renderer, radius: big ? 4.6 : 3.4, weight: big ? 1.4 : 0.8,
      color: big ? "#111" : "#ffffff", opacity: 0.9, fillColor: color, fillOpacity: 0.95,
    });
  }

  function columns(payload) {
    var col = {};
    payload.fields.forEach(function (name, k) { col[name] = k; });
    return col;
  }

  // 분류군을 찾는 동안에는 그 결과만 그린다(drawTaxa). 채집지 점은 찾기를 지우면 돌아온다.
  function drawFossils() {
    var payload = state.payload;
    fossilLayer.clearLayers();
    if (!payload) return;
    var col = columns(payload);
    var inCountry = state.country
      ? payload.rows.filter(function (row) { return row[col.cc] === state.country; }) : payload.rows;
    syncCounts(inCountry, col);
    if (state.taxon) { $("fossil-count").textContent = "분류군 찾기 결과만 보인다"; return; }
    var shown = 0;
    payload.rows.forEach(function (row) {
      if (!passes(row[col.environment], row[col.cc])) return;
      shown += 1;
      marker([row[col.paleolat], row[col.paleolng]], pointColor(row[col.environment], row[col.max_ma], row[col.min_ma]))
        .on("click", function (e) { openCollection(e.latlng, row, col); })
        .addTo(fossilLayer);
    });
    $("fossil-count").textContent = fmtNum(shown) + (shown === payload.rows.length ? "곳" : " / " + fmtNum(payload.rows.length) + "곳");
    renderLegend();
  }

  // ── 채집지 팝업 ─────────────────────────────────────────────────────
  function openCollection(latlng, row, col) {
    var no = row[col.collection_no];
    var interval = row[col.early_interval] + (row[col.late_interval] ? " – " + row[col.late_interval] : "");
    var env = row[col.environment];
    var group = state.termGroup[termKey(env)];
    var groupName = "";
    state.tree.forEach(function (top) {
      top.groups.forEach(function (g) {
        if (g.id === group) groupName = labelFor(top.id, top.ko) + " › " + labelFor(g.id, g.ko);
      });
    });
    var html = "<h3>" + esc(row[col.collection_name] || "이름 없는 채집지") + "</h3><dl>" +
      "<dt>연대</dt><dd>" + esc(interval) + " (" + row[col.max_ma] + "–" + row[col.min_ma] + " Ma)</dd>" +
      (row[col.formation] ? "<dt>지층</dt><dd>" + esc(row[col.formation]) + "</dd>" : "") +
      "<dt>환경</dt><dd>" + esc(env || "기록 없음") + (groupName ? "<br><small>" + esc(groupName) + "</small>" : "") + "</dd>" +
      "<dt>고좌표</dt><dd>" + row[col.paleolat] + "°, " + row[col.paleolng] + "°</dd>" +
      (row[col.cc] ? "<dt>지금 국가</dt><dd>" + esc(countryName(row[col.cc])) + "</dd>" : "") +
      (row.matched ? "<dt>찾은 분류군</dt><dd><i>" + row.matched.map(esc).join("</i>, <i>") + "</i></dd>" : "") +
      '</dl><a href="' + PBDB_COLL_PAGE + no + '" target="_blank" rel="noopener">PBDB 채집지 ' + no + "</a>" +
      '<div class="muted taxa-box">산출 ' + row[col.n_occs] + "건 읽는 중…</div>";
    // 내용을 문자열이 아니라 요소로 준다. 문자열이면 popup.update() 가 처음 문자열로 다시
    // 그려, 받아 온 산출 목록이 "읽는 중…" 으로 되돌아간다.
    var el = document.createElement("div");
    el.className = "pop";
    el.innerHTML = html;
    var box = el.querySelector(".taxa-box");
    var popup = L.popup({ maxWidth: 340 }).setLatLng(latlng).setContent(el).openOn(map);
    getJSON(PBDB + "occs/list.json?coll_id=" + no + "&show=class&vocab=pbdb&limit=500").then(function (data) {
      var items = (data.records || []).map(function (r) {
        var grp = [r.phylum, r["class"]].filter(function (x) { return x && x !== "NO_CLASS_SPECIFIED"; }).join(" · ");
        return "<li><i>" + esc(r.accepted_name || r.identified_name) + "</i>" + (grp ? " <small>" + esc(grp) + "</small>" : "") + "</li>";
      });
      box.className = items.length ? "" : "muted";
      box.innerHTML = items.length ? '<ul class="taxa">' + items.join("") + "</ul>" : "산출 기록이 없다.";
      popup.update();
    }).catch(function () { box.textContent = "PBDB 에 닿지 못했다 — 위 링크로 본다."; });
  }

  // ── 분류군 찾기 ─────────────────────────────────────────────────────
  // 채집지 점과 같은 규칙으로 거른다(pipeline/common.py 의 belongs): 연대 범위가 시점
  // ±2.5 Myr 창과 겹치고, 범위가 20 Myr 이하. PBDB 의 overlap 도 같은 뜻이다.
  var COLUMNS = { collection_no: 0, paleolng: 1, paleolat: 2, env: 3, n_occs: 4, collection_name: 5,
                  early_interval: 6, late_interval: 7, max_ma: 8, min_ma: 9, formation: 10, environment: 11, cc: 12 };
  var taxonSeq = 0;
  function searchTaxon(name) {
    var f = frame();
    var seq = ++taxonSeq;
    state.taxon = name;
    state.taxa = null;
    $("taxon-clear").hidden = false;
    $("taxon-status").textContent = name + " — " + fmtAge(f.age) + " 무렵을 PBDB 에 묻는 중…";
    drawFossils();
    var url = PBDB + "occs/list.json?base_name=" + encodeURIComponent(name) +
      "&max_ma=" + (f.age + WINDOW_MA) + "&min_ma=" + Math.max(0, f.age - WINDOW_MA) +
      (state.country ? "&cc=" + encodeURIComponent(state.country) : "") +
      "&timerule=overlap&pgm=scotese&show=paleoloc,coll,class,env,loc&vocab=pbdb&limit=20000";
    getJSON(url).then(function (data) {
      if (seq !== taxonSeq) return;
      if (data.errors) throw new Error(data.errors.join(" "));
      // 산출을 채집지로 묶는다 — 한 채집지의 여러 산출이 같은 자리에 겹쳐 그려지지 않게.
      var byColl = {}, rows = [];
      (data.records || []).forEach(function (r) {
        if (r.max_ma - r.min_ma > MAX_SPAN_MA) return;
        if (r.paleolat == null || r.paleolng == null) return;
        var row = byColl[r.collection_no];
        if (!row) {
          row = byColl[r.collection_no] = [r.collection_no, r.paleolng, r.paleolat, "", 0, r.collection_name,
            r.early_interval, r.late_interval || "", r.max_ma, r.min_ma, r.formation || "",
            r.environment || "", r.cc || ""];
          row.matched = [];
          rows.push(row);
        }
        row[COLUMNS.n_occs] += 1;
        var taxon = r.accepted_name || r.identified_name;
        if (row.matched.indexOf(taxon) < 0) row.matched.push(taxon);
      });
      state.taxa = rows;
      drawTaxa();
    }).catch(function (err) {
      if (seq !== taxonSeq) return;
      $("taxon-status").textContent = "찾지 못했다: " + (err.message || err);
    });
  }

  function drawTaxa() {
    taxonLayer.clearLayers();
    var rows = state.taxa;
    if (!state.taxon || !rows) return;
    var shown = 0, occs = 0;
    rows.forEach(function (row) {
      if (!passes(row[COLUMNS.environment], row[COLUMNS.cc])) return;
      shown += 1;
      occs += row[COLUMNS.n_occs];
      marker([row[COLUMNS.paleolat], row[COLUMNS.paleolng]],
             pointColor(row[COLUMNS.environment], row[COLUMNS.max_ma], row[COLUMNS.min_ma]), true)
        .bindTooltip(esc(row.matched.slice(0, 3).join(", ") + (row.matched.length > 3 ? " …" : "")) +
                     " · " + esc(row[COLUMNS.collection_name]))
        .on("click", function (e) { openCollection(e.latlng, row, COLUMNS); })
        .addTo(taxonLayer);
    });
    $("taxon-status").textContent = state.taxon + " — " + fmtAge(frame().age) + " 무렵 채집지 " +
      fmtNum(shown) + "곳 (산출 " + fmtNum(occs) + "건)" + (state.country ? ", " + countryName(state.country) : "") + ".";
    renderLegend();
  }

  // 점을 다시 그린다 — 색·환경·나라를 바꿨을 때. PBDB 에 다시 묻지 않는다.
  function redraw() { drawFossils(); drawTaxa(); }

  function clearTaxon() {
    taxonSeq += 1;
    state.taxon = "";
    state.taxa = null;
    taxonLayer.clearLayers();
    $("taxon").value = "";
    $("taxon-clear").hidden = true;
    $("taxon-status").textContent = "두 글자 이상 치면 PBDB 에서 후보를 찾는다(앞부분·중간 모두). 시점을 옮기면 다시 묻는다.";
    drawFossils();
  }

  // ── 분류군 이름 후보(자동완성) ──────────────────────────────────────
  // 두 곳에 함께 묻는다: taxa/auto 는 앞부분 일치로 빠르고, taxa/list 의 match_name=%…% 는
  // 이름 가운데가 맞는 것까지 준다(조금 느리다). 같은 이름은 하나로 합치고 산출 수로 줄 세운다.
  var RANK_KO = {
    2: "아종", 3: "종", 4: "아속", 5: "속", 6: "아족", 7: "족", 8: "아과", 9: "과", 10: "상과",
    11: "하목", 12: "아목", 13: "목", 14: "상목", 15: "하강", 16: "아강", 17: "강", 18: "상강",
    19: "아문", 20: "문", 21: "상문", 22: "아계", 23: "계", 25: "분기군", 26: "비공식",
    subspecies: "아종", species: "종", subgenus: "아속", genus: "속", subtribe: "아족", tribe: "족",
    subfamily: "아과", family: "과", superfamily: "상과", infraorder: "하목", suborder: "아목",
    order: "목", superorder: "상목", infraclass: "하강", subclass: "아강", "class": "강",
    superclass: "상강", subphylum: "아문", phylum: "문", superphylum: "상문", kingdom: "계",
    "unranked clade": "분기군", informal: "비공식",
  };
  var suggest = { seq: 0, items: [], active: -1, timer: null };

  function suggestFetch(text) {
    var seq = ++suggest.seq;
    var q = encodeURIComponent(text);
    var prefix = getJSON(PBDB + "taxa/auto.json?name=" + q + "&limit=12").then(function (d) {
      return (d.records || []).filter(function (r) { return r.typ === "txn" && /^[A-Z]/.test(r.nam); }).map(function (r) {
        return { name: r.nam, rank: RANK_KO[r.rnk] || "", occs: +r.noc || 0, group: "" };
      });
    }).catch(function () { return []; });
    var middle = text.length < 3 ? Promise.resolve([]) :
      getJSON(PBDB + "taxa/list.json?match_name=%25" + q + "%25&taxon_status=valid&order=n_occs.desc&limit=15&show=class&vocab=pbdb")
        .then(function (d) {
          return (d.records || []).map(function (r) {
            var grp = [r.phylum, r["class"]].filter(function (x) { return x && x !== "NO_CLASS_SPECIFIED" && x !== r.taxon_name; }).join(" · ");
            return { name: r.taxon_name, rank: RANK_KO[r.taxon_rank] || r.taxon_rank, occs: +r.n_occs || 0, group: grp };
          });
        }).catch(function () { return []; });
    // 앞부분 후보가 먼저 오면 먼저 보이고, 가운데 후보가 오면 합쳐서 다시 그린다.
    prefix.then(function (a) { if (seq === suggest.seq) renderSuggest(merge(a, [])); });
    Promise.all([prefix, middle]).then(function (both) {
      if (seq === suggest.seq) renderSuggest(merge(both[0], both[1]), true);
    });
  }

  function merge(a, b) {
    var seen = {}, out = [];
    a.concat(b).forEach(function (it) {
      var key = it.name.toLowerCase();
      if (seen[key]) { if (!seen[key].group && it.group) seen[key].group = it.group; return; }
      seen[key] = it;
      out.push(it);
    });
    return out.sort(function (x, y) { return y.occs - x.occs; }).slice(0, 12);
  }

  function renderSuggest(items, done) {
    var list = $("taxon-list");
    suggest.items = items;
    suggest.active = -1;
    var text = $("taxon").value.trim();
    var re = text ? new RegExp("(" + text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + ")", "i") : null;
    list.innerHTML = items.map(function (it, k) {
      var name = esc(it.name);
      if (re) name = name.replace(re, "<b>$1</b>");
      return '<li role="option" id="sg-' + k + '" data-k="' + k + '"><span class="nm">' + name + "</span>" +
        '<span class="meta">' + esc(it.rank) + (it.group ? " · " + esc(it.group) : "") + " · 산출 " + fmtNum(it.occs) + "</span></li>";
    }).join("") || (done ? '<li class="empty-sg">후보가 없다</li>' : '<li class="empty-sg">찾는 중…</li>');
    list.hidden = false;
    $("taxon").setAttribute("aria-expanded", "true");
  }

  function closeSuggest() {
    suggest.seq += 1;
    clearTimeout(suggest.timer);
    $("taxon-list").hidden = true;
    $("taxon").setAttribute("aria-expanded", "false");
    $("taxon").removeAttribute("aria-activedescendant");
  }

  function pickSuggest(k) {
    var it = suggest.items[k];
    if (!it) return;
    $("taxon").value = it.name;
    closeSuggest();
    searchTaxon(it.name);
  }

  function moveActive(step) {
    var n = suggest.items.length;
    if (!n) return;
    suggest.active = (suggest.active + step + n) % n;
    document.querySelectorAll("#taxon-list li").forEach(function (li, k) { li.classList.toggle("active", k === suggest.active); });
    $("taxon").setAttribute("aria-activedescendant", "sg-" + suggest.active);
  }

  function bindSuggest() {
    var input = $("taxon");
    input.addEventListener("input", function () {
      clearTimeout(suggest.timer);
      var text = input.value.trim();
      if (text.length < 2) { closeSuggest(); return; }
      suggest.timer = setTimeout(function () { renderSuggest([], false); suggestFetch(text); }, 250);
    });
    input.addEventListener("keydown", function (e) {
      if ($("taxon-list").hidden) return;
      if (e.key === "ArrowDown") { moveActive(1); e.preventDefault(); }
      else if (e.key === "ArrowUp") { moveActive(-1); e.preventDefault(); }
      else if (e.key === "Enter" && suggest.active >= 0) { pickSuggest(suggest.active); e.preventDefault(); }
      else if (e.key === "Escape") { closeSuggest(); }
    });
    $("taxon-list").addEventListener("mousedown", function (e) {
      var li = e.target.closest("li[data-k]");
      if (li) { e.preventDefault(); pickSuggest(+li.dataset.k); }
    });
    input.addEventListener("blur", function () { setTimeout(closeSuggest, 150); });
  }

  // ── 국가 ────────────────────────────────────────────────────────────
  // 목록은 index.json 의 countries(PBDB 채집지에 나오는 국가 코드 + Natural Earth 한글 이름).
  // PBDB 는 영국을 UK, 대양을 O1~O7 로 적는다 — 국경선 파일은 ISO(GB)다.
  function countryIso(cc) { var c = state.countryBy[cc]; return c ? c.iso : cc; }
  function countryName(cc) { var c = state.countryBy[cc]; return c ? c.ko : cc; }

  function initCountries(list) {
    state.countries = list;
    list.forEach(function (c) { state.countryBy[c.cc] = c; });
    var input = $("country"), box = $("country-list"), active = -1, items = [];
    var norm = function (s) { return String(s || "").toLowerCase().replace(/\s+/g, ""); };
    var render = function () {
      var q = norm(input.value);
      items = !q ? [] : state.countries.filter(function (c) {
        return norm(c.ko).indexOf(q) >= 0 || norm(c.en).indexOf(q) >= 0 || norm(c.cc) === q || norm(c.iso) === q ||
          (c.aka || []).some(function (a) { return norm(a).indexOf(q) >= 0; });
      }).slice(0, 12);
      active = -1;
      box.innerHTML = items.map(function (c, k) {
        return '<li role="option" data-k="' + k + '"><span class="nm-plain">' + esc(c.ko) + ' <small>' + esc(c.en) +
          "</small></span><span class=\"meta\">" + esc(c.cc) + " · 채집지 " + fmtNum(c.collections) + "</span></li>";
      }).join("") || (q ? '<li class="empty-sg">없다</li>' : "");
      box.hidden = !q;
    };
    var pick = function (k) {
      var c = items[k];
      if (!c) return;
      box.hidden = true;
      setCountry(c.cc);
    };
    input.addEventListener("input", render);
    input.addEventListener("keydown", function (e) {
      if (box.hidden) return;
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        active = (active + (e.key === "ArrowDown" ? 1 : -1) + items.length) % Math.max(items.length, 1);
        box.querySelectorAll("li").forEach(function (li, k) { li.classList.toggle("active", k === active); });
        e.preventDefault();
      } else if (e.key === "Enter") { pick(active >= 0 ? active : 0); e.preventDefault(); }
      else if (e.key === "Escape") { box.hidden = true; }
    });
    box.addEventListener("mousedown", function (e) {
      var li = e.target.closest("li[data-k]");
      if (li) { e.preventDefault(); pick(+li.dataset.k); }
    });
    input.addEventListener("blur", function () { setTimeout(function () { box.hidden = true; }, 150); });
    $("country-clear").addEventListener("click", function () { setCountry(null); });
  }

  function setCountry(cc) {
    state.country = cc;
    $("country").value = cc ? countryName(cc) : "";
    $("country-clear").hidden = !cc;
    noteCountry();
    drawBorders(frame(), true);
    if (state.taxon) searchTaxon(state.taxon); else redraw();
  }

  function noteCountry() {
    var c = state.countryBy[state.country];
    $("country-note").textContent = !c ? "" :
      c.ko + (c.ocean ? " (대양, PBDB 해양 시추 등)" : "") + " — 지금 이 나라(땅)에서 나온 채집지만 보인다. 전체 " +
      fmtNum(c.collections) + "곳.";
  }

  // 국경선: 켰거나 나라를 골랐을 때만 받는다. 나라를 막 골랐으면 그 나라 쪽으로 지도를 옮긴다.
  function drawBorders(f, focus) {
    borderLayer.clearLayers();
    var want = f.age, show = $("borders").checked;
    if (!f.borders || (!show && !state.country)) return;
    getJSON(DATA + f.borders).then(function (geo) {
      if (frame().age !== want) return;
      borderLayer.clearLayers();
      var iso = state.country && countryIso(state.country);
      var picked = null;
      borderLayer.addData(show ? geo : { type: "FeatureCollection", features: geo.features.filter(function (ft) {
        return ft.properties.cc === iso;
      }) });
      borderLayer.eachLayer(function (layer) { if (layer.feature.properties.cc === iso) { picked = layer; layer.bringToFront(); } });
      if (focus && picked) map.fitBounds(picked.getBounds(), { maxZoom: 4, padding: [30, 30] });
      $("borders-note").textContent = iso && !picked && !state.countryBy[state.country].ocean
        ? countryName(state.country) + " 땅은 " + fmtAge(want) + " 판 모델에 아직 없다(그보다 젊은 지각)." : "";
    });
  }

  // ── 범례(시대 색) ───────────────────────────────────────────────────
  // 퇴적기원 색은 환경 나무의 색 견본이 범례를 겸한다. 시대 색일 때는 지금 보이는 점의 기를 적는다.
  function renderLegend() {
    var box = $("legend");
    app.classList.toggle("color-age", state.colorBy === "age");
    if (state.colorBy !== "age") { box.innerHTML = ""; return; }
    var seen = {};
    var add = function (maxMa, minMa) { var p = periodOf(maxMa, minMa); if (p) seen[p.id] = p; };
    if (state.taxon && state.taxa) {
      state.taxa.forEach(function (row) { if (passes(row[COLUMNS.environment], row[COLUMNS.cc])) add(row[COLUMNS.max_ma], row[COLUMNS.min_ma]); });
    } else if (state.payload) {
      var col = columns(state.payload);
      state.payload.rows.forEach(function (row) { if (passes(row[col.environment], row[col.cc])) add(row[col.max_ma], row[col.min_ma]); });
    }
    box.innerHTML = Object.keys(seen).map(function (id) { return seen[id]; }).sort(byOldFirst).map(function (p) {
      return '<span class="leg"><i class="dot" style="background:' + p.color + '"></i>' + esc(p.ko) + "</span>";
    }).join("");
  }

  // ── 조작 ────────────────────────────────────────────────────────────
  function bind() {
    $("slider").addEventListener("input", function () { show(+this.value); });
    $("older").addEventListener("click", function () { show(state.i - 1); });
    $("younger").addEventListener("click", function () { show(state.i + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" && e.target.type !== "range" && e.target.type !== "checkbox") return;
      if (e.key === "ArrowLeft") { show(state.i - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { show(state.i + 1); e.preventDefault(); }
    });
    $("play").addEventListener("change", function () {
      clearInterval(state.playing);
      state.playing = null;
      if (this.checked) {
        state.playing = setInterval(function () {
          show(state.i + 1 < state.frames.length ? state.i + 1 : 0);
        }, 1500);
      }
    });
    $("coast").addEventListener("change", function () { drawCoast(frame()); });
    $("borders").addEventListener("change", function () { drawBorders(frame(), false); });
    document.querySelectorAll('input[name="color-by"]').forEach(function (radio) {
      radio.addEventListener("change", function () { if (radio.checked) { state.colorBy = radio.value; redraw(); } });
    });
    $("grid").addEventListener("change", function () {
      if (this.checked) gridLayer.addTo(map); else map.removeLayer(gridLayer);
    });
    $("taxon-form").addEventListener("submit", function (e) {
      e.preventDefault();
      closeSuggest();
      var name = $("taxon").value.trim();
      if (name) searchTaxon(name); else clearTaxon();
    });
    $("taxon-clear").addEventListener("click", clearTaxon);
    $("edit-toggle").addEventListener("click", function () { setEditing(!state.editing); });
    bindSuggest();
  }

  function sources(list) {
    $("sources").innerHTML = list.map(function (s) {
      return "<li>" + esc(s.citation) + ' — <a href="' + esc(s.license_url) + '" target="_blank" rel="noopener">' + esc(s.license) + "</a></li>";
    }).join("");
    map.attributionControl.addAttribution("PaleoDEM · PaleoCoastlines (Scotese 외) · PBDB — CC BY 4.0");
  }

  function start() {
    getJSON(DATA + "index.json").then(function (index) {
      // 슬라이더 왼쪽이 옛날이다.
      state.frames = index.frames.slice().sort(function (a, b) { return b.age - a.age; });
      $("slider").max = state.frames.length - 1;
      sources(index.sources || []);
      initTimescale(index.timescale || { units: [] });
      initEnvironments(index.environments || []);
      initCountries(index.countries || []);
      loadLabels();
      bind();
      var wanted = parseFloat((location.hash.match(/age=([\d.]+)/) || [])[1]);
      var first = state.frames.findIndex(function (f) { return f.age === wanted; });
      if (first < 0) first = state.frames.findIndex(function (f) { return f.age === 250; });
      show(first < 0 ? 0 : first);
    }).catch(function (err) { console.error(err); });
  }

  start();
})();
