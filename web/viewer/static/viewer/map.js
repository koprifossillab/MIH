/* MIH 뷰어 — 시점마다 PaleoDEM 배경, PaleoCoastlines 해안선, PBDB 산지를 겹친다.
 *
 * 자료는 파이프라인이 만든 파일(data/…)만 읽는다. 층서표와 퇴적 환경 나무도 index.json 에서
 * 받는다(pipeline/timescale.py·environments.py 가 한 곳). PBDB 에 바로 묻는 것은 셋이다 —
 * 산지 산출 목록, 분류군 찾기, 분류군 이름 후보. PBDB 는 CORS 를 열어 두었다(`*`).
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var DATA = app.dataset.dataBase.replace(/x$/, "");
  var LABELS_URL = app.dataset.labelsUrl;
  // 시점 파일은 하루 캐시된다(views.FRAME_MAX_AGE). 다시 가공해도 이름이 같아, 주소에 가공 시각을 붙여
  // 가공할 때마다 새 주소가 되게 한다 — 안 붙이면 013 에서 고친 노릭절 산지가 하루 동안 안 보였다.
  var BUILT = "";
  function dataUrl(path) { return DATA + path + (BUILT ? "?b=" + encodeURIComponent(BUILT) : ""); }
  var CSRF = app.dataset.csrf;
  var PBDB = "https://paleobiodb.org/data1.2/";
  var PBDB_COLL_PAGE = "https://paleobiodb.org/classic/basicCollectionSearch?collection_no=";
  // 산지를 시점에 올리는 규칙 — index.json 의 rules 로 덮어쓴다(pipeline/common.py 한 곳이 정한다).
  var WINDOW_MA = 2.5;
  var VAGUE = {};                 // 모호한 등급(세·기·대 …)의 PBDB 시대 이름 — index.json 의 rules.vague_intervals(016)

  // 속이 찬 세모 — 모호한 연대의 산지(016). Leaflet 에는 세모 표지가 없어 캔버스에 직접 그린다.
  // 원 표지(CircleMarker)를 물려받아 반지름·색·눌림 판정은 그대로 쓰고, 그리는 모양만 바꾼다.
  L.Canvas.include({
    _updateTriangle: function (layer) {
      if (!this._drawing || layer._empty()) return;
      var p = layer._point, ctx = this._ctx, r = Math.max(layer._radius, 1) * 1.45;
      if (this._drawnLayers) this._drawnLayers[layer._leaflet_id] = layer;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y - r);
      ctx.lineTo(p.x + r * 0.866, p.y + r * 0.5);
      ctx.lineTo(p.x - r * 0.866, p.y + r * 0.5);
      ctx.closePath();
      this._fillStroke(ctx, layer);
    },
  });
  L.TriangleMarker = L.CircleMarker.extend({
    _updatePath: function () { this._renderer._updateTriangle(this); },
  });
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
    opacity: 0.6,                           // 점 불투명도 — 겹친 점과 밑그림이 함께 보이게
    showWide: true,                         // 모호한 연대(절 단위로 정해지지 않은) 산지를 보일지(016)
    maxSpan: Infinity,                      // 연대 범위(max_ma − min_ma)가 이 이하인 산지만(018)
    taxonRank: "", taxonLow: false,         // 찾은 분류군의 계급 — 과 이하이면 커서만 대도 산출 목록
    grids: {},                              // 기온 격자(파일 → {w, h, data, offset})
    countries: [], countryBy: {}, country: null,   // 국가로 거르기
    dist: null,                             // 찾은 분류군의 산출 시대 분포(센 결과)
    distBase: null,                         // 그 바탕 — PBDB 절 단위 수, 산출이 적으면 산출 기록 자체(014)
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
  // 시대: 산지 연대 중간값이 든 기(Period)의 층서표 색.
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
  // 산지를 보일지 — 켠 환경, 고른 나라, 그리고 연대 거르기(ageOk).
  function passes(environment, cc, precise, maxMa, minMa) {
    if (!state.enabled[termKey(environment)]) return false;
    if (!ageOk(precise, maxMa, minMa)) return false;
    return !state.country || cc === state.country;
  }

  // 연대로 거르기 — 두 가지를 따로 본다. 모호한 연대(시대 이름의 등급, 016)를 보이기로 했는지, 그리고
  // 연대 범위의 길이가 고른 값 이하인지(018). 등급은 "어떻게 매겼나", 길이는 "시간이 얼마나 불확실한가" 다.
  var SPAN_STEPS = [1, 2, 3, 5, 8, 10, 15, 20, 30, 50, Infinity];
  function ageOk(precise, maxMa, minMa) {
    if (!precise && !state.showWide) return false;
    return !(Number(maxMa) - Number(minMa) > state.maxSpan + 1e-6);
  }
  // 범위 길이 때문에만 가려진 것 — 모호한 연대를 끈 것과 따로 센다
  function tooWide(precise, maxMa, minMa) {
    return (precise || state.showWide) && !ageOk(precise, maxMa, minMa);
  }
  function fmtSpan(v) { return v === Infinity ? "제한 없음" : v + " Myr 이하"; }
  // 범위가 길어 가린 수를 적는다. what: "산지" · "산출 산지"
  function spanNote(hidden, what) {
    $("span-value").textContent = fmtSpan(state.maxSpan);
    $("span-note").textContent = state.maxSpan === Infinity ? "" :
      "연대 범위가 " + state.maxSpan + " Myr 를 넘어 가린 " + what + " " + fmtNum(hidden) + "곳.";
  }

  // 연대가 절 단위로 정해졌는가(pipeline/intervals.is_vague 의 반대). PBDB 시대 이름 둘 가운데 하나라도
  // 모호한 등급(세·기·대 …)이면 모호한 연대다. 절 이름 여럿으로 정해진 범위("Norian–Rhaetian")는 정해진 기록이다(016).
  function isPrecise(early, late) {
    return !(early && VAGUE[early]) && !(late && VAGUE[late]);
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

  // 겹 순서: 배경(380) < 기온(390) < 해안선·국경(400) < 화석(450)
  map.createPane("base").style.zIndex = 380;
  map.createPane("climate").style.zIndex = 390;
  var relief = L.imageOverlay("", WORLD, { interactive: false, className: "relief", pane: "base" }).addTo(map);
  // 기온 격자는 1° 칸의 가운데가 정수 경위도다(361×181). 그림 가장자리를 반 칸 밖에 둬야 칸이 제자리에 앉는다.
  var climateLayer = L.imageOverlay("", [[-90.5, -180.5], [90.5, 180.5]],
    { interactive: false, className: "climate", pane: "climate", opacity: 0.55 });
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
    return dataUrl(files[reliefWidth()] || f.relief);
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
        var n = state.dist && state.taxon ? state.dist.units[u.id] || 0 : null;
        b.className = "chip" + (picked[rank] && picked[rank].id === u.id ? " on" : "") + (here[u.id] ? " here" : "") +
          (n === 0 ? " none-found" : "");
        b.style.background = u.color;
        b.style.color = ink(u.color);
        b.textContent = chipName(u);
        if (n) b.insertAdjacentHTML("beforeend", '<span class="cnt">' + fmtNum(n) + "</span>");
        b.title = u.full + " · " + u.en + " · " + u.base + "–" + u.top + " Ma" + (here[u.id] ? " · 지금 지도" : "") +
          (n !== null ? " · " + state.taxon + " 산출 " + fmtNum(n) + "건" : "");
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
    $("now-label").textContent = f.label + (f.climate ? " · 전 지구 평균 " + f.climate.gmst.toFixed(1) + " ℃" : "");
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
    drawClimate(f);
    loadFossils(f);
    state.taxonReady = state.taxon ? searchTaxon(state.taxon) : null;
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
    getJSON(dataUrl(f.coastline.file)).then(function (geo) {
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
      if (state.taxon) computeDist();   // 산출 시대의 수도 고른 퇴적기원을 따른다(014)
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

  // 환경 칸마다의 수. 평소에는 산지 수, 분류군을 찾는 동안에는 그 분류군의 산출 건수(weight = n_occs)다.
  // 꺼 둔 환경의 칸에도 수를 적는다 — 켜면 몇 건이 더해지는지 보이게.
  function syncCounts(rows, col, weight) {
    var counts = {};
    rows.forEach(function (row) {
      var t = termKey(row[col.environment]), n = weight ? weight(row) : 1;
      counts["term:" + t] = (counts["term:" + t] || 0) + n;
      var g = state.termGroup[t], top = t === UNLISTED ? "o" : state.termTop[t];
      counts["group:" + g] = (counts["group:" + g] || 0) + n;
      counts["top:" + top] = (counts["top:" + top] || 0) + n;
    });
    $("env-count-note").textContent = weight ? "수: " + state.taxon + " 산출 건수(지금 지도)" : "수: 산지 수(지금 지도)";
    document.querySelectorAll("#envtree [data-count]").forEach(function (el) {
      var n = counts[el.dataset.count] || 0;
      el.textContent = fmtNum(n);
      var row = el.closest(".env");
      row.classList.toggle("zero", n === 0);
      if (el.dataset.count === "group:o-unlisted") row.hidden = n === 0;
    });
  }

  // ── 화석 산지 ─────────────────────────────────────────────────────
  function loadFossils(f) {
    $("fossil-count").textContent = "";
    state.payload = null;
    fossilLayer.clearLayers();
    if (!f.fossils || !f.fossils.file) return;
    var want = f.age;
    getJSON(dataUrl(f.fossils.file)).then(function (payload) {
      if (frame().age !== want) return;
      state.payload = payload;
      var col = columns(payload);
      payload.byNo = {};
      payload.rows.forEach(function (row) { payload.byNo[row[col.collection_no]] = row; });
      drawFossils();
      // 찾은 분류군도 산지 자료의 좌표(이 시점 나이로 계산한 것, 017)로 옮기고, 같은 시대 다른 산지를 그린다
      if (state.taxon) drawTaxa();
    });
  }

  // 점 하나. 테두리를 흰색으로 두어 푸른 바다 위 푸른 점, 짙은 땅 위 붉은 점도 보이게 한다.
  // 반투명하게 두어(기본 60%) 겹친 점과 그 밑의 해안선·지형이 함께 보이게 한다.
  // **모호한 연대**(절 단위로 정해지지 않은)는 **속이 찬 세모**로 — 색·채움·테두리는 점과 같고 모양만 다르다.
  // 015 의 고리는 채움이 없어 잘 안 보였다(연구자). 세모는 같은 크기의 원보다 조금 크게 그려 눈에 띄게 한다(016).
  function marker(latlng, color, big, vague) {
    var a = state.opacity;
    var options = {
      renderer: renderer, radius: big ? 4.6 : 3.4, weight: big ? 1.2 : 0.7,
      color: "#ffffff", opacity: Math.min(1, a + 0.15), fillColor: color, fillOpacity: a,
    };
    return vague ? new L.TriangleMarker(latlng, options) : L.circleMarker(latlng, options);
  }

  // 산지 행의 연대가 절 단위로 정해졌는가 — 가공물의 precise 칸, 없으면(옛 가공물) 시대 이름으로 가른다.
  function rowPrecise(row, col) {
    return col.precise != null ? !!row[col.precise] : isPrecise(row[col.early_interval], row[col.late_interval]);
  }

  function columns(payload) {
    var col = {};
    payload.fields.forEach(function (name, k) { col[name] = k; });
    return col;
  }

  // 분류군을 찾는 동안에는 그 결과만 그린다(drawTaxa). 산지 점은 찾기를 지우면 돌아온다.
  function drawFossils() {
    var payload = state.payload;
    fossilLayer.clearLayers();
    if (!payload) return;
    var col = columns(payload);
    if (state.taxon) { $("fossil-count").textContent = "분류군 찾기 결과만 보인다"; return; }   // 수는 drawTaxa 가 적는다
    // 환경 칸의 수 — 나라와 연대 거르기는 따르고 환경은 따르지 않는다(018 부터 연대 거르기도 따른다)
    var inCountry = payload.rows.filter(function (row) {
      return (!state.country || row[col.cc] === state.country) && ageOk(rowPrecise(row, col), row[col.max_ma], row[col.min_ma]);
    });
    syncCounts(inCountry, col);
    spanNote(payload.rows.filter(function (row) {
      return (!state.country || row[col.cc] === state.country) && tooWide(rowPrecise(row, col), row[col.max_ma], row[col.min_ma]);
    }).length, "산지");
    var shown = 0, wide = 0;
    payload.rows.forEach(function (row) {
      var precise = rowPrecise(row, col);
      if (!passes(row[col.environment], row[col.cc], precise, row[col.max_ma], row[col.min_ma])) return;
      shown += 1;
      if (!precise) wide += 1;
      marker([row[col.paleolat], row[col.paleolng]], pointColor(row[col.environment], row[col.max_ma], row[col.min_ma]),
             false, !precise)
        .on("click", function (e) { openCollection(e.latlng, row, col); })
        .addTo(fossilLayer);
    });
    $("fossil-count").textContent = fmtNum(shown) + (shown === payload.rows.length ? "곳" : " / " + fmtNum(payload.rows.length) + "곳") +
      (wide ? " (모호한 연대 " + fmtNum(wide) + ")" : "");
    renderLegend();
  }

  // ── 산지 팝업 ─────────────────────────────────────────────────────
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
    var html = "<h3>" + esc(row[col.collection_name] || "이름 없는 산지") + "</h3><dl>" +
      "<dt>연대</dt><dd>" + esc(interval) + " (" + row[col.max_ma] + "–" + row[col.min_ma] + " Ma, 범위 " +
        +(row[col.max_ma] - row[col.min_ma]).toFixed(1) + " Myr)" +
        (rowPrecise(row, col) ? "" : '<br><small class="wide-note">▲ 모호한 연대 — 절 단위로 정해지지 않은 기록(세·기·대). 걸친 모든 시점에 보인다</small>') + "</dd>" +
      (row[col.formation] ? "<dt>지층</dt><dd>" + esc(row[col.formation]) + "</dd>" : "") +
      "<dt>환경</dt><dd>" + esc(env || "기록 없음") + (groupName ? "<br><small>" + esc(groupName) + "</small>" : "") + "</dd>" +
      "<dt>고좌표</dt><dd>" + row[col.paleolat] + "°, " + row[col.paleolng] + "°<br><small>" +
        (col.rotated != null && row[col.rotated]
          ? "이 지도 나이(" + fmtAge(frame().age) + ")로 계산 — PALEOMAP v19o"
          : "PBDB 제공 — 산지 연대의 중간값에서 계산한 자리") + "</small></dd>" +
      (row[col.cc] ? "<dt>지금 국가</dt><dd>" + esc(countryName(row[col.cc])) + "</dd>" : "") +
      (row.matched ? "<dt>찾은 분류군</dt><dd><i>" + row.matched.map(esc).join("</i>, <i>") + "</i></dd>" : "") +
      '</dl><a href="' + PBDB_COLL_PAGE + no + '" target="_blank" rel="noopener">PBDB 산지 ' + no + "</a>" +
      '<div class="muted taxa-box">산출 ' + row[col.n_occs] + "건 읽는 중…</div>";
    // 내용을 문자열이 아니라 요소로 준다. 문자열이면 popup.update() 가 처음 문자열로 다시
    // 그려, 받아 온 산출 목록이 "읽는 중…" 으로 되돌아간다.
    var el = document.createElement("div");
    el.className = "pop";
    el.innerHTML = html;
    var box = el.querySelector(".taxa-box");
    var popup = L.popup({ maxWidth: 340 }).setLatLng(latlng).setContent(el).openOn(map);
    // 그때 그 자리의 지표 기온 — 기온 층을 켜지 않아도 적는다.
    var f = frame();
    if (f.climate) {
      loadGrid(f.climate).then(function (grid) {
        var dl = el.querySelector("dl");
        dl.insertAdjacentHTML("beforeend", "<dt>그때 기온</dt><dd>" +
          tempAt(grid, Number(row[col.paleolat]), Number(row[col.paleolng])).toFixed(0) +
          " ℃ <small>(" + fmtAge(f.climate.source_age) + " 지도, Scotese 2021)</small></dd>");
        popup.update();
      });
    }
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
  // 산지 점과 같은 규칙으로 거른다(pipeline/common.py 의 belongs): 연대 범위가 시점
  // ±2.5 Myr 창과 겹치면. PBDB 의 overlap 도 같은 뜻이다. 모호한 연대는 세모로 그린다(016).
  var COLUMNS = { collection_no: 0, paleolng: 1, paleolat: 2, env: 3, n_occs: 4, collection_name: 5,
                  early_interval: 6, late_interval: 7, max_ma: 8, min_ma: 9, formation: 10, environment: 11, cc: 12,
                  precise: 13, rotated: 14 };
  var taxonSeq = 0;
  // 과 이하 — 커서만 대도 산출 목록이 뜨는 계급. 그 위(목·강…)는 산지 하나에 수십~수백 건이라 요약만.
  var LOW_RANKS = { family: 1, subfamily: 1, tribe: 1, subtribe: 1, genus: 1, subgenus: 1, species: 1, subspecies: 1 };
  var TOOLTIP_MAX = 15;

  function lookupRank(name) {
    return getJSON(PBDB + "taxa/single.json?name=" + encodeURIComponent(name) + "&vocab=pbdb")
      .then(function (d) { var r = (d.records || [])[0]; return r ? r.taxon_rank || "" : ""; })
      .catch(function () { return ""; });
  }

  // 커서를 댔을 때의 내용. 과 이하이면 이 산지에서 찾은 분류군 아래의 산출을 모두(15 건까지) 적는다.
  function taxonTip(row) {
    var head = "<b>" + esc(row[COLUMNS.collection_name] || "이름 없는 산지") + "</b>";
    if (!state.taxonLow) {
      return head + "<small>" + esc(state.taxon) + " 산출 " + row.occs.length + "건 — 누르면 목록</small>";
    }
    var items = row.occs.slice(0, TOOLTIP_MAX).map(function (o) {
      var shown = "<i>" + esc(o.accepted) + "</i>";
      if (o.identified && o.identified !== o.accepted) shown += " <small>(" + esc(o.identified) + ")</small>";
      return "<li>" + shown + (o.rank && o.rank !== "species" ? " <small>" + esc(RANK_KO[o.rank] || o.rank) + "</small>" : "") + "</li>";
    });
    if (row.occs.length > TOOLTIP_MAX) items.push("<li><small>외 " + (row.occs.length - TOOLTIP_MAX) + "건 — 누르면 모두</small></li>");
    return head + "<ul>" + items.join("") + "</ul>";
  }

  // ── 산출 시대 분포 ──────────────────────────────────────────────────
  // PBDB occs/diversity 가 절(stage)마다 산출 수(noc)를 한 번에 준다 — 삼엽충처럼 산출이 5만 건인
  // 분류군도 응답이 수 KB 다. 이것으로 (1) 산출이 있는 기를 아이콘으로 (2) 층서표 칩에 수를
  // (3) 시점 막대 밑에 시점별 산출 막대를 그리고 (4) 차례로 보기(011)의 시점 목록을 만든다.
  // PBDB 의 절 경계는 ICS 2024 와 조금 달라서, 절을 가운데 나이로 우리 단위에 넣는다.
  //
  // 퇴적기원으로 거르면 수도 따라가야 한다(014). diversity 는 우리 환경군으로 거를 수 없으므로, 산출이
  // OCC_LIMIT 건 이하인 분류군은 **산출 기록 자체(나이·환경)** 를 한 번 받아 두고 브라우저에서 센다 —
  // 그러면 지도와 같은 규칙(창과 겹침, 모호한 연대는 걸친 모든 시점)으로 셀 수 있다. 그보다 많은 분류군(삼엽충 4.5 만)은
  // 절 단위 수를 그대로 쓰고 퇴적기원이 수에 반영되지 않는다고 적는다.
  var OCC_LIMIT = 5000;

  function loadDistribution(name) {
    var key = name + "|" + (state.country || "");
    if (state.dist && state.dist.key === key) return Promise.resolve(state.dist);
    var cc = state.country ? "&cc=" + encodeURIComponent(state.country) : "";
    return Promise.all([
      getJSON(PBDB + "occs/diversity.json?base_name=" + encodeURIComponent(name) + cc + "&count=genera&time_reso=stage"),
      getJSON(PBDB + "taxa/single.json?name=" + encodeURIComponent(name) + "&show=app&vocab=pbdb").catch(function () { return {}; }),
    ]).then(function (both) {
      if (state.taxon !== name) return null;
      var stages = (both[0].records || []).filter(function (r) { return +r.noc > 0; }).map(function (r) {
        return { name: r.nam, base: +r.eag, top: +r.lag, n: +r.noc };
      });
      var base = { key: key, stages: stages, app: (both[1].records || [])[0] || null, occs: null,
                   stageTotal: stages.reduce(function (a, s) { return a + s.n; }, 0) };
      if (base.stageTotal > OCC_LIMIT) return base;
      return getJSON(PBDB + "occs/list.json?base_name=" + encodeURIComponent(name) + cc +
                     "&show=env&vocab=pbdb&limit=" + (OCC_LIMIT + 1)).then(function (d) {
        var recs = d.records || [];
        if (recs.length <= OCC_LIMIT) {
          base.occs = recs.map(function (r) {
            return { old: +r.max_ma, young: +r.min_ma, env: r.environment || "", early: r.early_interval, late: r.late_interval };
          });
        }
        return base;
      }).catch(function () { return base; });
    }).then(function (base) {
      if (!base || state.taxon !== name) return null;
      state.distBase = base;
      computeDist();
      if ($("coeval").checked) drawTaxa();     // "같은 시대" 구간은 절 분포로 잡는다
      return state.dist;
    }).catch(function () { state.dist = null; state.distBase = null; renderDist(); return null; });
  }

  // 받아 둔 것으로 분포를 센다. 퇴적기원 선택을 바꿀 때마다 다시 부른다(PBDB 에 다시 묻지 않는다).
  function computeDist() {
    var base = state.distBase;
    if (!base) { state.dist = null; renderDist(); renderChrono(); return; }
    var units = {}, frames = {}, total = 0;
    var addUnits = function (mid, n) {
      Object.keys(state.units).forEach(function (id) {
        var u = state.units[id];
        if (mid > u.top && mid <= u.base) units[id] = (units[id] || 0) + n;
      });
    };
    if (base.occs) {
      // 산출 하나하나 — 켠 환경만, 지도와 같은 규칙으로. 모호한 연대는(보이기로 했으면) 걸친 모든 단위·시점에
      // 더한다(015) — 지도에 그 모든 시점에서 보이는 것과 맞춘다.
      base.occs.forEach(function (o) {
        if (!state.enabled[termKey(o.env)]) return;
        var precise = isPrecise(o.early, o.late);
        if (!ageOk(precise, o.old, o.young)) return;
        total += 1;
        if (precise) addUnits((o.old + o.young) / 2, 1);
        else Object.keys(state.units).forEach(function (id) {
          var u = state.units[id];
          if (o.old > u.top && o.young < u.base) units[id] = (units[id] || 0) + 1;
        });
        state.frames.forEach(function (f, j) {
          if (o.old >= f.age - WINDOW_MA && o.young <= f.age + WINDOW_MA) frames[j] = (frames[j] || 0) + 1;
        });
      });
    } else {
      // 절 단위 수 — 퇴적기원을 거를 수 없다
      base.stages.forEach(function (s) {
        total += s.n;
        addUnits((s.base + s.top) / 2, s.n);
        state.frames.forEach(function (f, j) {
          if (s.base >= f.age - WINDOW_MA && s.top <= f.age + WINDOW_MA) frames[j] = (frames[j] || 0) + s.n;
        });
      });
    }
    state.dist = { key: base.key, stages: base.stages, app: base.app, units: units, frames: frames, total: total,
                   exact: !!base.occs, filtered: !!base.occs && (!allEnvEnabled() || state.maxSpan !== Infinity) };
    renderDist();
    renderChrono();
  }

  function allEnvEnabled() {
    return Object.keys(state.enabled).every(function (t) { return state.enabled[t]; });
  }

  // 산출 시대 칩을 누르면 그 기 안에서 찾은 분류군의 산출이 가장 많은 지도로 간다. 기의 가운데로
  // 가면(층서표 칩의 동작) 그 분류군이 없는 시점에 떨어지곤 했다 — Coelophysis 는 트라이아스기 가운데
  // 225 Ma 에 산출이 없다.
  function goToRichest(p) {
    var d = state.dist, best = -1;
    Object.keys(d.frames).forEach(function (j) {
      var age = state.frames[j].age;
      if (age > p.top && age <= p.base && (best < 0 || d.frames[j] > d.frames[best])) best = +j;
    });
    if (best < 0) { focusUnit(p); return; }
    stopTour();
    show(best, { focus: p });
    $("chrono-note").textContent = p.full + " 에서 " + state.taxon + " 산출이 가장 많은 " + fmtAge(state.frames[best].age) +
      " 지도(" + fmtNum(d.frames[best]) + "건).";
  }

  function renderDist() {
    var d = state.dist, box = $("taxon-dist"), strip = $("strip-taxon");
    box.hidden = !d || !state.taxon;
    strip.hidden = box.hidden;
    strip.innerHTML = "";
    if (box.hidden) return;
    $("dist-total").textContent = "산출 " + fmtNum(d.total) + "건" + (state.country ? " · " + countryName(state.country) : "") +
      (d.filtered ? " · 고른 퇴적기원·연대 범위만" : "");
    // 산출이 있는 기 — 층서표 색 아이콘에 수를 붙인다. 누르면 그 기의 가운데 지도로 간다.
    var periods = state.periods.slice().sort(byOldFirst).filter(function (p) { return d.units[p.id]; });
    $("dist-periods").innerHTML = "";
    periods.forEach(function (p) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "chip";
      b.style.background = p.color;
      b.style.color = ink(p.color);
      b.innerHTML = esc(p.ko) + '<span class="cnt">' + fmtNum(d.units[p.id]) + "</span>";
      b.title = p.full + " · 산출 " + fmtNum(d.units[p.id]) + "건 — 이 기에서 산출이 가장 많은 지도로";
      b.addEventListener("click", function () { goToRichest(p); });
      $("dist-periods").appendChild(b);
    });
    var a = d.app;
    $("dist-note").textContent = (!periods.length ? (d.exact ? "고른 퇴적기원에 드는 산출이 없다. " : "PBDB 에 절 단위로 매겨진 산출이 없다. ") : "") +
      (a && a.early_interval ? "처음 " + a.early_interval + " (" + a.firstapp_max_ma + "–" + a.firstapp_min_ma + " Ma) · 마지막 " +
        a.late_interval + " (" + a.lastapp_max_ma + "–" + a.lastapp_min_ma + " Ma). " : "") +
      (d.exact
        ? "칩과 막대의 수는 산출 하나하나를 지도와 같은 규칙으로 센 것이고, 고른 퇴적기원과 연대 범위를 따른다."
        : "산출이 " + fmtNum(OCC_LIMIT) + "건이 넘어 PBDB 가 절 단위로 센 수를 쓴다 — 퇴적기원·연대 범위 선택이 이 수에는 반영되지 않고, 절보다 넓게 매겨진 산출은 빠진다.");
    // 시점 막대 밑 — 시점마다 로그 높이의 막대
    var max = 0;
    Object.keys(d.frames).forEach(function (j) { max = Math.max(max, d.frames[j]); });
    Object.keys(d.frames).forEach(function (j) {
      var f = state.frames[j], n = d.frames[j];
      var bar = document.createElement("span");
      bar.style.left = ((OLDEST - Math.min(f.age, OLDEST)) / OLDEST * 100) + "%";
      bar.style.height = Math.max(2, Math.round(Math.log(1 + n) / Math.log(1 + max) * 14)) + "px";
      bar.title = fmtAge(f.age) + " · 산출 " + fmtNum(n) + "건";
      bar.addEventListener("click", function () { show(+j); });
      strip.appendChild(bar);
    });
  }

  function taxonUrl(name, age) {
    return PBDB + "occs/list.json?base_name=" + encodeURIComponent(name) +
      "&max_ma=" + (age + WINDOW_MA) + "&min_ma=" + Math.max(0, age - WINDOW_MA) +
      (state.country ? "&cc=" + encodeURIComponent(state.country) : "") +
      "&timerule=overlap&pgm=scotese&show=paleoloc,coll,class,env,loc&vocab=pbdb&limit=20000";
  }

  // ── 산출 시대 차례로 보기 ───────────────────────────────────────────
  // 가장 오래된 산출이 있는 시점부터 최근으로, 산출이 있는 시점만 넘긴다(분포 010 의 frames).
  // 시점마다 PBDB 답을 기다려 그린 뒤 머문다 — 고정 간격으로 넘기면 느린 답이 다음 시점에 섞인다.
  // 다음 시점의 질의는 미리 보내 둔다(getJSON 이 캐시에 담는다).
  var tour = { on: false, list: [], k: 0, timer: null };

  function startTour() {
    if (!state.dist || !state.taxon) return;
    tour.list = Object.keys(state.dist.frames).map(Number).sort(function (a, b) { return a - b; });
    if (!tour.list.length) return;
    if ($("play").checked) { $("play").checked = false; $("play").dispatchEvent(new Event("change")); }
    tour.on = true;
    tour.k = 0;
    $("tour").textContent = "■ 멈추기";
    $("tour").setAttribute("aria-pressed", "true");
    tourStep();
  }

  function stopTour(finished) {
    if (!tour.on) return;
    tour.on = false;
    clearTimeout(tour.timer);
    $("tour").textContent = "▶ 산출 시대 차례로 보기";
    $("tour").setAttribute("aria-pressed", "false");
    $("tour-status").textContent = finished ? "끝 — 가장 최근 산출 시점까지 보였다." : "";
  }

  function tourStep() {
    if (!tour.on) return;
    if (tour.k >= tour.list.length) { stopTour(true); return; }
    var j = tour.list[tour.k];
    show(j);
    var next = tour.list[tour.k + 1];
    if (next !== undefined) getJSON(taxonUrl(state.taxon, state.frames[next].age)).catch(function () {});
    $("tour-status").textContent = (tour.k + 1) + " / " + tour.list.length + " · " + fmtAge(state.frames[j].age) +
      " · 산출 " + fmtNum(state.dist.frames[j]) + "건(절 단위)";
    Promise.resolve(state.taxonReady).catch(function () {}).then(function () {
      if (!tour.on) return;
      tour.timer = setTimeout(function () { tour.k += 1; tourStep(); }, +$("tour-speed").value);
    });
  }

  function searchTaxon(name) {
    var f = frame();
    var seq = ++taxonSeq;
    if (state.taxon !== name) { state.dist = null; state.distBase = null; }
    state.taxon = name;
    state.taxa = null;
    loadDistribution(name);
    lookupRank(name).then(function (rank) {
      if (seq !== taxonSeq) return;
      state.taxonRank = rank;
      state.taxonLow = !!LOW_RANKS[rank];
      drawTaxa();
    });
    $("taxon-clear").hidden = false;
    $("taxon-status").textContent = name + " — " + fmtAge(f.age) + " 무렵을 PBDB 에 묻는 중…";
    drawFossils();
    // 결과를 그리고 나서 풀리는 약속을 돌려준다 — 차례로 보기(011)가 이것을 기다린다.
    return getJSON(taxonUrl(name, f.age)).then(function (data) {
      if (seq !== taxonSeq) return;
      if (data.errors) throw new Error(data.errors.join(" "));
      // 산출을 산지로 묶는다 — 한 산지의 여러 산출이 같은 자리에 겹쳐 그려지지 않게.
      var byColl = {}, rows = [];
      (data.records || []).forEach(function (r) {
        // 연대 범위의 상한은 없다 — 모호한 연대는 precise = 0 으로 세모로 그린다(016)
        if (r.paleolat == null || r.paleolng == null) return;
        var row = byColl[r.collection_no];
        if (!row) {
          row = byColl[r.collection_no] = [r.collection_no, r.paleolng, r.paleolat, "", 0, r.collection_name,
            r.early_interval, r.late_interval || "", r.max_ma, r.min_ma, r.formation || "",
            r.environment || "", r.cc || "", isPrecise(r.early_interval, r.late_interval) ? 1 : 0, 0];
          row.pbdb = [r.paleolng, r.paleolat];
          row.matched = [];
          row.occs = [];
          rows.push(row);
        }
        row[COLUMNS.n_occs] += 1;
        var taxon = r.accepted_name || r.identified_name;
        if (row.matched.indexOf(taxon) < 0) row.matched.push(taxon);
        row.occs.push({ accepted: taxon, identified: r.identified_name, rank: r.accepted_rank || r.identified_rank });
      });
      state.taxa = rows;
      drawTaxa();
    }).catch(function (err) {
      if (seq !== taxonSeq) return;
      $("taxon-status").textContent = "찾지 못했다: " + (err.message || err);
    });
  }

  // ── 같은 시대 다른 산지 (속 이하) ───────────────────────────────────
  // 지금 지도에서 찾은 분류군 산출들의 연대 범위를 한 구간(가장 젊은 min ~ 가장 오래된 max)으로
  // 잡고, 그 구간과 연대가 겹치는 다른 산지(그 분류군이 안 나온 곳)를 작고 흐리게 함께 그린다.
  // 환경 거르기는 따르고 국가 거르기는 따르지 않는다 — 나라를 골라 그 나라의 분류군을 보면서
  // 같은 시대의 다른 나라 기록과 견주려는 것이다.
  var GENUS_RANKS = { genus: 1, subgenus: 1, species: 1, subspecies: 1 };

  // "같은 시대" 의 구간. 산출 하나하나의 범위를 합치면 넓게 매겨진 산출 하나(예: 83.6–66 Ma)가 구간을
  // 지도 전체로 넓혀, 거의 모든 산지가 "같은 시대" 가 된다(Tyrannosaurus 70 Ma 에서 14,288 곳 중
  // 14,204 곳). 그래서 **절 단위 분포(010)에서 그 분류군이 실제로 나온 절**, 그중 지도 시점의 창에 걸치는
  // 절들로 구간을 잡는다. 절 단위 산출이 없는 시점만 산출 범위의 합으로 돌아간다.
  function coevalSpan(rows) {
    if (!rows.length) return null;
    var f = frame(), lo = f.age - WINDOW_MA, hi = f.age + WINDOW_MA, stages = [];
    // 지도 나이가 든 절을 먼저 쓴다. 창에 살짝 걸친 이웃 절까지 넣으면(70 Ma 창이 캄파이나절 끝 0.3 Myr
    // 에 걸친다) 구간이 다시 넓어진다. 나이가 든 절에 산출이 없으면 창과 가장 많이 겹치는 절 하나.
    var cands = ((state.dist && state.dist.stages) || []).filter(function (s) { return s.base >= lo && s.top <= hi; });
    stages = cands.filter(function (s) { return f.age > s.top && f.age <= s.base; });
    if (!stages.length && cands.length) {
      var overlapOf = function (s) { return Math.min(s.base, hi) - Math.max(s.top, lo); };
      stages = [cands.sort(function (a, b) { return overlapOf(b) - overlapOf(a); })[0]];
    }
    if (stages.length) {
      var names = stages.map(function (s) { return stageName(s); });
      return { old: Math.max.apply(null, stages.map(function (s) { return s.base; })),
               young: Math.min.apply(null, stages.map(function (s) { return s.top; })),
               label: names.join("·") };
    }
    var old = -Infinity, young = Infinity;
    rows.forEach(function (row) {
      old = Math.max(old, Number(row[COLUMNS.max_ma]));
      young = Math.min(young, Number(row[COLUMNS.min_ma]));
    });
    return { old: old, young: young, label: "산출 범위" };
  }

  // PBDB 절 이름 → 한글판 이름(가운데 나이가 든 우리 절). 없으면 PBDB 이름 그대로.
  function stageName(s) {
    var mid = (s.base + s.top) / 2, found = s.name;
    Object.keys(state.units).forEach(function (id) {
      var u = state.units[id];
      if (u.rank === "age" && mid > u.top && mid <= u.base) found = u.ko;
    });
    return found;
  }

  function drawCoeval(rows) {
    var note = $("coeval-note");
    $("coeval-row").hidden = !GENUS_RANKS[state.taxonRank];
    if (!GENUS_RANKS[state.taxonRank] || !$("coeval").checked) { note.textContent = ""; return 0; }
    var span = coevalSpan(rows), payload = state.payload;
    if (!span || !payload) {
      note.textContent = span ? "산지 자료를 읽는 중…" : "이 시점에는 찾은 분류군의 산출이 없어 견줄 시대가 없다.";
      return 0;
    }
    var col = columns(payload), own = {}, n = 0, inside = $("coeval-rule").value === "inside";
    rows.forEach(function (row) { own[row[COLUMNS.collection_no]] = true; });
    payload.rows.forEach(function (row) {
      var precise = rowPrecise(row, col);
      if (own[row[col.collection_no]] || !state.enabled[termKey(row[col.environment])]) return;
      if (!ageOk(precise, row[col.max_ma], row[col.min_ma])) return;
      var old = row[col.max_ma], young = row[col.min_ma];
      // 겹침: 연대 범위가 구간에 걸치면 / 안: 연대 범위 전체가 구간 안에 들면
      if (inside ? (old > span.old + 1e-6 || young < span.young - 1e-6) : (old < span.young || young > span.old)) return;
      n += 1;
      var a = state.opacity * 0.6, color = pointColor(row[col.environment], row[col.max_ma], row[col.min_ma]);
      var small = { renderer: renderer, radius: 2.6, weight: 0.6, color: "#ffffff", opacity: Math.min(1, a + 0.15),
                    fillColor: color, fillOpacity: a };
      (precise ? L.circleMarker([row[col.paleolat], row[col.paleolng]], small)
               : new L.TriangleMarker([row[col.paleolat], row[col.paleolng]], small))
        .bindTooltip("<b>" + esc(row[col.collection_name] || "이름 없는 산지") + "</b><small>" +
                     esc(row[col.early_interval]) + (row[col.late_interval] ? "–" + esc(row[col.late_interval]) : "") +
                     " · " + esc(countryName(row[col.cc])) + " · 같은 시대 다른 산지" + (precise ? "" : " · ▲ 모호한 연대") + "</small>",
                     { className: "occ-tip", sticky: true, direction: "auto", opacity: 0.96 })
        .on("click", function (e) { openCollection(e.latlng, row, col); })
        .addTo(taxonLayer);
    });
    note.textContent = "같은 시대(" + span.label + ", " + span.old + "–" + span.young + " Ma)" +
      (inside ? " 안에 드는" : "와 겹치는") + " 다른 산지 " + fmtNum(n) + "곳을 작은 점으로 함께 보인다" +
      (state.country ? " — 국가와 상관없이" : "") + ".";
    return n;
  }

  // PBDB 에 바로 물은 산출의 고좌표는 산지 연대의 중간값에서 계산한 하나뿐이다. 산지 자료에 같은 산지가 있으면
  // 그 좌표(이 시점 나이로 계산한 것)로 옮겨 산지 점·해안선과 맞춘다(017). 없으면 PBDB 좌표 그대로.
  function placeTaxa(rows) {
    var payload = state.payload, col = payload && columns(payload);
    rows.forEach(function (row) {
      var own = payload && payload.byNo[row[COLUMNS.collection_no]];
      var rotated = own && col.rotated != null && own[col.rotated];
      row[COLUMNS.paleolng] = rotated ? own[col.paleolng] : row.pbdb[0];
      row[COLUMNS.paleolat] = rotated ? own[col.paleolat] : row.pbdb[1];
      row[COLUMNS.rotated] = rotated ? 1 : 0;
    });
  }

  function drawTaxa() {
    taxonLayer.clearLayers();
    var rows = state.taxa;
    if (!state.taxon || !rows) return;
    placeTaxa(rows);
    var shown = 0, occs = 0, visible = [];
    var ok = function (row) {
      return passes(row[COLUMNS.environment], row[COLUMNS.cc], row[COLUMNS.precise], row[COLUMNS.max_ma], row[COLUMNS.min_ma]);
    };
    var inCountry = function (row) { return !state.country || row[COLUMNS.cc] === state.country; };
    rows.forEach(function (row) { if (ok(row)) visible.push(row); });
    // 환경 칸의 수 = 이 지도에서 찾은 분류군의 산출 건수(나라·연대 거르기는 따르되 환경은 거르지 않고 센다)
    syncCounts(rows.filter(function (row) {
      return inCountry(row) && ageOk(row[COLUMNS.precise], row[COLUMNS.max_ma], row[COLUMNS.min_ma]);
    }), COLUMNS, function (row) { return row[COLUMNS.n_occs]; });
    spanNote(rows.filter(function (row) {
      return inCountry(row) && tooWide(row[COLUMNS.precise], row[COLUMNS.max_ma], row[COLUMNS.min_ma]);
    }).length, "산출 산지");
    drawCoeval(visible);            // 먼저 그려 찾은 분류군의 점 밑에 깐다
    rows.forEach(function (row) {
      if (!ok(row)) return;
      shown += 1;
      occs += row[COLUMNS.n_occs];
      marker([row[COLUMNS.paleolat], row[COLUMNS.paleolng]],
             pointColor(row[COLUMNS.environment], row[COLUMNS.max_ma], row[COLUMNS.min_ma]), true, !row[COLUMNS.precise])
        .bindTooltip(function () { return taxonTip(row); },
                     { className: "occ-tip", sticky: true, direction: "auto", opacity: 0.96 })
        .on("click", function (e) { openCollection(e.latlng, row, COLUMNS); })
        .addTo(taxonLayer);
    });
    $("taxon-status").textContent = state.taxon +
      (state.taxonRank ? " (" + (RANK_KO[state.taxonRank] || state.taxonRank) + ")" : "") + " — " +
      fmtAge(frame().age) + " 무렵 산지 " + fmtNum(shown) + "곳 (산출 " + fmtNum(occs) + "건)" +
      (state.country ? ", " + countryName(state.country) : "") + "." +
      (state.taxonLow ? " 산지에 커서를 대면 그 아래 산출이 뜬다." : "");
    renderLegend();
  }

  // 점을 다시 그린다 — 색·환경·나라를 바꿨을 때. PBDB 에 다시 묻지 않는다.
  function redraw() { drawFossils(); drawTaxa(); }

  function clearTaxon() {
    stopTour();
    taxonSeq += 1;
    state.taxon = "";
    state.taxa = null;
    state.taxonRank = "";
    state.taxonLow = false;
    state.dist = null;
    state.distBase = null;
    renderDist();
    renderChrono();
    $("coeval-row").hidden = true;
    $("coeval-note").textContent = "";
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
    stopTour();
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
  // 목록은 index.json 의 countries(PBDB 산지에 나오는 국가 코드 + Natural Earth 한글 이름).
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
          "</small></span><span class=\"meta\">" + esc(c.cc) + " · 산지 " + fmtNum(c.collections) + "</span></li>";
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
    $("country-clear").addEventListener("click", function () { setCountry(null); map.flyToBounds(WORLD, { duration: 0.6 }); });
    // 시점을 옮기면 나라가 움직인다 — 그 시점의 자리로 다시 당긴다.
    $("country-focus").addEventListener("click", function () { drawBorders(frame(), true); });
  }

  function setCountry(cc) {
    state.country = cc;
    $("country").value = cc ? countryName(cc) : "";
    $("country-clear").hidden = !cc;
    $("country-focus").hidden = !cc;
    noteCountry();
    drawBorders(frame(), true);
    if (state.taxon) searchTaxon(state.taxon); else redraw();
  }

  function noteCountry() {
    var c = state.countryBy[state.country];
    $("country-note").textContent = !c ? "" :
      c.ko + (c.ocean ? " (대양, PBDB 해양 시추 등)" : "") + " — 지금 이 나라(땅)에서 나온 산지만 보인다. 전체 " +
      fmtNum(c.collections) + "곳.";
  }

  // 국경선: 켰거나 나라를 골랐을 때만 받는다. 나라를 막 골랐으면 그 나라 쪽으로 지도를 옮긴다.
  function drawBorders(f, focus) {
    borderLayer.clearLayers();
    var want = f.age, show = $("borders").checked;
    if (!f.borders || (!show && !state.country)) return;
    getJSON(dataUrl(f.borders)).then(function (geo) {
      if (frame().age !== want) return;
      borderLayer.clearLayers();
      var iso = state.country && countryIso(state.country);
      var picked = null;
      borderLayer.addData(show ? geo : { type: "FeatureCollection", features: geo.features.filter(function (ft) {
        return ft.properties.cc === iso;
      }) });
      borderLayer.eachLayer(function (layer) { if (layer.feature.properties.cc === iso) { picked = layer; layer.bringToFront(); } });
      if (focus) focusCountry(picked);
      $("borders-note").textContent = iso && !picked && !state.countryBy[state.country].ocean
        ? countryName(state.country) + " 땅은 " + fmtAge(want) + " 판 모델에 아직 없다(그보다 젊은 지각)." : "";
    });
  }

  // ── 고기후: 지표 기온 (Scotese 2021) ────────────────────────────────
  // 가공물은 회색조 PNG 한 장(361×181, 값 = 기온 + offset). 이것을 캔버스로 읽어 (1) 색을 입혀
  // 겹치고 (2) 커서·산지 자리의 기온을 읽는다. 색표는 여기에만 있다.
  var TEMP_STOPS = [[-40, [44, 62, 158]], [-20, [70, 125, 205]], [0, [127, 196, 232]], [10, [232, 240, 214]],
                    [20, [249, 214, 140]], [30, [240, 140, 70]], [40, [178, 24, 43]]];
  function tempColor(t) {
    if (t <= TEMP_STOPS[0][0]) return TEMP_STOPS[0][1];
    for (var k = 1; k < TEMP_STOPS.length; k++) {
      var hi = TEMP_STOPS[k];
      if (t <= hi[0]) {
        var lo = TEMP_STOPS[k - 1], f = (t - lo[0]) / (hi[0] - lo[0]);
        return [0, 1, 2].map(function (c) { return Math.round(lo[1][c] + (hi[1][c] - lo[1][c]) * f); });
      }
    }
    return TEMP_STOPS[TEMP_STOPS.length - 1][1];
  }

  function loadGrid(info) {
    if (!state.grids[info.file]) {
      state.grids[info.file] = new Promise(function (resolve, reject) {
        var img = new Image();
        img.onload = function () {
          var c = document.createElement("canvas");
          c.width = img.width; c.height = img.height;
          var ctx = c.getContext("2d", { willReadFrequently: true });
          ctx.drawImage(img, 0, 0);
          var px = ctx.getImageData(0, 0, c.width, c.height).data, values = new Float32Array(c.width * c.height);
          for (var k = 0; k < values.length; k++) values[k] = px[k * 4] - info.offset;
          resolve({ w: c.width, h: c.height, values: values });
        };
        img.onerror = reject;
        img.src = dataUrl(info.file);
      });
    }
    return state.grids[info.file];
  }

  // 격자 칸의 가운데가 정수 경위도(북 90 → 남 −90, 서 −180 → 동 180)다.
  function tempAt(grid, lat, lng) {
    var row = Math.round(90 - lat), col = Math.round(((lng + 180) % 360 + 360) % 360);
    row = Math.max(0, Math.min(grid.h - 1, row));
    col = Math.max(0, Math.min(grid.w - 1, col));
    return grid.values[row * grid.w + col];
  }

  function drawClimate(f) {
    var on = $("climate").checked, info = f.climate;
    $("temp-legend").hidden = !on;
    $("climate-note").textContent = !info ? "이 시점에는 기온 지도가 없다." :
      (info.source_age === f.age ? "" : "가장 가까운 " + fmtAge(info.source_age) + " 지도. ") +
      "전 지구 평균 " + info.gmst.toFixed(1) + " ℃. HadCM3L 모의를 대리 자료에 맞춘 값이다.";
    if (!on || !info) { map.removeLayer(climateLayer); return; }
    var want = f.age;
    loadGrid(info).then(function (grid) {
      if (frame().age !== want || !$("climate").checked) return;
      var c = document.createElement("canvas");
      c.width = grid.w; c.height = grid.h;
      var ctx = c.getContext("2d"), out = ctx.createImageData(grid.w, grid.h);
      for (var k = 0; k < grid.values.length; k++) {
        var rgb = tempColor(grid.values[k]);
        out.data[k * 4] = rgb[0]; out.data[k * 4 + 1] = rgb[1]; out.data[k * 4 + 2] = rgb[2]; out.data[k * 4 + 3] = 255;
      }
      ctx.putImageData(out, 0, 0);
      climateLayer.setUrl(c.toDataURL());
      if (!map.hasLayer(climateLayer)) climateLayer.addTo(map);
    });
  }

  // 커서 자리의 기온 — 기온 층을 켰을 때만.
  var readout = L.control({ position: "bottomleft" });
  readout.onAdd = function () { var div = L.DomUtil.create("div", "temp-readout"); div.id = "temp-readout"; return div; };
  readout.addTo(map);
  map.on("mousemove", function (e) {
    var f = frame(), box = $("temp-readout");
    if (!f || !f.climate || !$("climate").checked) { box.textContent = ""; return; }
    loadGrid(f.climate).then(function (grid) {
      box.textContent = "기온 " + tempAt(grid, e.latlng.lat, e.latlng.lng).toFixed(0) + " ℃ · " +
        e.latlng.lat.toFixed(1) + "°, " + e.latlng.lng.toFixed(1) + "°";
    });
  });
  map.on("mouseout", function () { $("temp-readout").textContent = ""; });

  // 고른 나라의 범위로 지도를 당긴다.
  // - 국경 조각들 가운데 가장 큰 조각을 잡고, 그 둘레(20°)의 조각만 함께 넣는다 — 알래스카·하와이,
  //   날짜변경선에서 잘린 러시아 동쪽 끝 같은 조각까지 넣으면 지구 전체로 물러난다
  // - 국경이 없으면(대양 코드, 그 시점에 아직 없는 땅) 그 나라 산지들의 범위로
  function focusCountry(picked) {
    var bounds = null;
    if (picked) {
      var pieces = [];
      (picked.feature.geometry.coordinates || []).forEach(function (line) {
        var b = L.latLngBounds(line.map(function (p) { return [p[1], p[0]]; }));
        pieces.push({ b: b, n: line.length });
      });
      pieces.sort(function (a, b) { return b.n - a.n; });
      if (pieces.length) {
        var big = pieces[0].b;
        bounds = L.latLngBounds(big.getSouthWest(), big.getNorthEast());
        // 둘레는 경위도로 20° 를 더한 상자다. 비율(pad)로 넓히면 러시아처럼 넓은 나라는 지구를 다 덮는다.
        var near = L.latLngBounds([big.getSouth() - 20, big.getWest() - 20], [big.getNorth() + 20, big.getEast() + 20]);
        pieces.slice(1).forEach(function (p) { if (near.intersects(p.b)) bounds.extend(p.b); });
      }
    }
    if (!bounds && state.payload) {
      var col = columns(state.payload), pts = [];
      state.payload.rows.forEach(function (row) {
        if (row[col.cc] === state.country) pts.push([row[col.paleolat], row[col.paleolng]]);
      });
      if (pts.length) bounds = L.latLngBounds(pts);
    }
    if (!bounds) return;
    map.flyToBounds(bounds, { maxZoom: 6, padding: [40, 40], duration: 0.8 });
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
      state.taxa.forEach(function (row) { if (passes(row[COLUMNS.environment], row[COLUMNS.cc], row[COLUMNS.precise], row[COLUMNS.max_ma], row[COLUMNS.min_ma])) add(row[COLUMNS.max_ma], row[COLUMNS.min_ma]); });
    } else if (state.payload) {
      var col = columns(state.payload);
      state.payload.rows.forEach(function (row) { if (passes(row[col.environment], row[col.cc], rowPrecise(row, col), row[col.max_ma], row[col.min_ma])) add(row[col.max_ma], row[col.min_ma]); });
    }
    box.innerHTML = Object.keys(seen).map(function (id) { return seen[id]; }).sort(byOldFirst).map(function (p) {
      return '<span class="leg"><i class="dot" style="background:' + p.color + '"></i>' + esc(p.ko) + "</span>";
    }).join("");
  }

  // ── 조작 ────────────────────────────────────────────────────────────
  function bind() {
    // 손으로 시점을 옮기면 차례로 보기를 멈춘다.
    $("slider").addEventListener("input", function () { stopTour(); show(+this.value); });
    $("older").addEventListener("click", function () { stopTour(); show(state.i - 1); });
    $("younger").addEventListener("click", function () { stopTour(); show(state.i + 1); });
    document.addEventListener("keydown", function (e) {
      if (e.target.tagName === "INPUT" && e.target.type !== "range" && e.target.type !== "checkbox") return;
      if (e.key === "ArrowLeft") { stopTour(); show(state.i - 1); e.preventDefault(); }
      if (e.key === "ArrowRight") { stopTour(); show(state.i + 1); e.preventDefault(); }
    });
    $("tour").addEventListener("click", function () { if (tour.on) stopTour(); else startTour(); });
    $("coeval").addEventListener("change", drawTaxa);
    $("show-wide").addEventListener("change", function () {
      state.showWide = this.checked;
      if (state.taxon) computeDist();
      redraw();
    });
    // 연대 범위 막대 — 칸 번호를 SPAN_STEPS 의 값으로(018)
    $("max-span").max = SPAN_STEPS.length - 1;
    $("max-span").value = SPAN_STEPS.length - 1;
    $("max-span").addEventListener("input", function () {
      state.maxSpan = SPAN_STEPS[+this.value];
      $("span-value").textContent = fmtSpan(state.maxSpan);
      if (state.taxon) computeDist();
      redraw();
    });
    $("coeval-rule").addEventListener("change", drawTaxa);
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
    $("climate").addEventListener("change", function () { drawClimate(frame()); });
    $("climate-opacity").addEventListener("input", function () {
      climateLayer.setOpacity(+this.value / 100);
      $("climate-opacity-value").textContent = this.value + "%";
    });
    $("point-opacity").addEventListener("input", function () {
      state.opacity = +this.value / 100;
      $("point-opacity-value").textContent = this.value + "%";
      redraw();
    });
    document.querySelectorAll('input[name="color-by"]').forEach(function (radio) {
      radio.addEventListener("change", function () { if (radio.checked) { state.colorBy = radio.value; redraw(); } });
    });
    $("grid").addEventListener("change", function () {
      if (this.checked) gridLayer.addTo(map); else map.removeLayer(gridLayer);
    });
    $("taxon-form").addEventListener("submit", function (e) {
      e.preventDefault();
      stopTour();
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
      if (index.rules) {
        WINDOW_MA = index.rules.window_ma;
        (index.rules.vague_intervals || []).forEach(function (name) { VAGUE[name] = true; });
      }
      BUILT = index.built_at || "";
      $("slider").max = state.frames.length - 1;
      sources(index.sources || []);
      initTimescale(index.timescale || { units: [] });
      $("temp-bar").style.background = "linear-gradient(90deg," + [-40, -30, -20, -10, 0, 10, 20, 30, 40].map(function (t) {
        return "rgb(" + tempColor(t).join(",") + ")";
      }).join(",") + ")";
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
