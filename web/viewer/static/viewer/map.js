/* MIH 뷰어 — 시점마다 PaleoDEM 배경, PaleoCoastlines 해안선, PBDB 채집지를 겹친다.
 *
 * 자료는 파이프라인이 만든 파일(data/…)만 읽는다. PBDB 에 바로 묻는 것은 둘뿐이다 —
 * 채집지를 눌렀을 때의 산출 목록, 분류군 찾기. PBDB 는 CORS 를 열어 두었다(`*`).
 */
(function () {
  "use strict";

  var app = document.getElementById("app");
  var DATA = app.dataset.dataBase.replace(/x$/, "");
  var PBDB = "https://paleobiodb.org/data1.2/";
  var PBDB_COLL_PAGE = "https://paleobiodb.org/classic/basicCollectionSearch?collection_no=";
  var WINDOW_MA = 2.5;        // 파이프라인(pipeline/common.py)과 같은 값
  var MAX_SPAN_MA = 20;
  var WORLD = [[-90, -180], [90, 180]];
  var ENV_LABEL = { m: "바다", t: "뭍", o: "해안·기타·미상" };

  var $ = function (id) { return document.getElementById(id); };
  var state = { frames: [], i: 0, env: { m: true, t: true, o: true }, taxon: "", playing: null };
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

  // ── 지도 ────────────────────────────────────────────────────────────
  var map = L.map("map", {
    crs: L.CRS.EPSG4326,
    center: [0, 0], zoom: 2, minZoom: 1, maxZoom: 8,
    maxBounds: [[-100, -200], [100, 200]], maxBoundsViscosity: 0.8,
    worldCopyJump: false, attributionControl: true,
  });
  map.attributionControl.setPrefix(false);
  map.fitBounds(WORLD);
  // 패널이 접히거나 탭이 가려졌다 돌아오면 지도 칸의 크기가 바뀐다. 창 크기와 상관없이
  // 바뀌므로 Leaflet 이 스스로 알지 못한다 — 크기가 0 이던 칸이 커지면 점이 안 그려진다.
  if (window.ResizeObserver) {
    var wasEmpty = true;
    new ResizeObserver(function (entries) {
      var box = entries[0].contentRect;
      map.invalidateSize();
      if (wasEmpty && box.width > 0 && box.height > 0) map.fitBounds(WORLD);
      wasEmpty = !(box.width > 0 && box.height > 0);
    }).observe(document.getElementById("map"));
  }

  var relief = L.imageOverlay("", WORLD, { interactive: false, className: "relief" }).addTo(map);
  // 해안선은 SVG 로, 화석은 그 위 전용 창의 캔버스로 그린다. 둘 다 캔버스로 두면 나중에
  // 생긴 해안선 캔버스가 화석 캔버스를 덮어 점을 눌러도 아무 일이 없다.
  var coastLayer = L.geoJSON(null, {
    style: { color: getComputedStyle(document.documentElement).getPropertyValue("--coast").trim() || "#ff3da8",
             weight: 1.2, opacity: 0.9, fill: false },
    interactive: false,
    renderer: L.svg(),
  }).addTo(map);
  map.createPane("fossils").style.zIndex = 450;
  var renderer = L.canvas({ padding: 0.3, pane: "fossils" });
  var fossilLayer = L.layerGroup().addTo(map);
  var taxonLayer = L.layerGroup().addTo(map);
  var gridLayer = L.layerGroup();
  window.MIH = { map: map, fossils: fossilLayer, taxa: taxonLayer };   // 콘솔에서 들여다보기용
  for (var lon = -180; lon <= 180; lon += 30) gridLayer.addLayer(L.polyline([[-90, lon], [90, lon]], { color: "#fff", weight: 0.5, opacity: 0.35, interactive: false }));
  for (var lat = -60; lat <= 60; lat += 30) gridLayer.addLayer(L.polyline([[lat, -180], [lat, 180]], { color: "#fff", weight: lat === 0 ? 1 : 0.5, opacity: 0.35, interactive: false }));

  var COLORS = { m: "#ffd23f", t: "#e4572e", o: "#f5f5f5" };

  // ── 시점 ────────────────────────────────────────────────────────────
  function frame() { return state.frames[state.i]; }

  function show(i) {
    state.i = Math.max(0, Math.min(state.frames.length - 1, i));
    var f = frame();
    $("slider").value = state.i;
    $("now-age").textContent = fmtAge(f.age);
    $("now-period").textContent = f.period.ko + " (" + f.period.en + ")";
    $("now-label").textContent = f.label;
    try { history.replaceState(null, "", "#age=" + f.age); } catch (e) { /* 미리보기 등 */ }

    relief.setUrl(DATA + f.relief);
    drawCoast(f);
    drawFossils(f);
    if (state.taxon) searchTaxon(state.taxon);
    // 이웃 시점 배경을 미리 받아 둔다 — 넘길 때 빈 화면이 덜 보인다.
    [state.i - 1, state.i + 1].forEach(function (j) {
      if (state.frames[j]) { var img = new Image(); img.src = DATA + state.frames[j].relief; }
    });
  }

  function drawCoast(f) {
    coastLayer.clearLayers();
    var note = $("coast-note");
    if (!f.coastline) {
      note.textContent = "이 시점 ±10 Myr 안에 해안선 자료가 없다.";
      return;
    }
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

  function drawFossils(f) {
    fossilLayer.clearLayers();
    $("fossil-count").textContent = "";
    if (!f.fossils || !f.fossils.file) return;
    var want = f.age;
    getJSON(DATA + f.fossils.file).then(function (payload) {
      if (frame().age !== want) return;
      fossilLayer.clearLayers();
      var col = {};
      payload.fields.forEach(function (name, k) { col[name] = k; });
      var counts = { m: 0, t: 0, o: 0 };
      var dim = !!state.taxon;
      payload.rows.forEach(function (row) {
        var env = row[col.env];
        counts[env] += 1;
        if (!state.env[env]) return;
        L.circleMarker([row[col.paleolat], row[col.paleolng]], {
          renderer: renderer, radius: 3.2, weight: 0.6, color: "#222",
          fillColor: COLORS[env], fillOpacity: dim ? 0.25 : 0.9, opacity: dim ? 0.3 : 1,
        }).on("click", function (e) { openCollection(e.latlng, row, col); })
          .addTo(fossilLayer);
      });
      ["m", "t", "o"].forEach(function (k) { $("count-" + k).textContent = counts[k].toLocaleString("ko-KR"); });
      $("fossil-count").textContent = payload.rows.length.toLocaleString("ko-KR") + "곳";
    });
  }

  // ── 채집지 팝업 ─────────────────────────────────────────────────────
  function openCollection(latlng, row, col) {
    var no = row[col.collection_no];
    var interval = row[col.early_interval] + (row[col.late_interval] ? " – " + row[col.late_interval] : "");
    var html = "<h3>" + esc(row[col.collection_name] || "이름 없는 채집지") + "</h3><dl>" +
      "<dt>연대</dt><dd>" + esc(interval) + " (" + row[col.max_ma] + "–" + row[col.min_ma] + " Ma)</dd>" +
      (row[col.formation] ? "<dt>지층</dt><dd>" + esc(row[col.formation]) + "</dd>" : "") +
      "<dt>환경</dt><dd>" + esc(row[col.environment] || "미상") + " · " + ENV_LABEL[row[col.env]] + "</dd>" +
      "<dt>고좌표</dt><dd>" + row[col.paleolat] + "°, " + row[col.paleolng] + "°</dd>" +
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
        var group = [r.phylum, r["class"]].filter(function (x) { return x && x !== "NO_CLASS_SPECIFIED"; }).join(" · ");
        return "<li><i>" + esc(r.accepted_name || r.identified_name) + "</i>" + (group ? " <small>" + esc(group) + "</small>" : "") + "</li>";
      });
      box.className = items.length ? "" : "muted";
      box.innerHTML = items.length ? '<ul class="taxa">' + items.join("") + "</ul>" : "산출 기록이 없다.";
      popup.update();
    }).catch(function () {
      box.textContent = "PBDB 에 닿지 못했다 — 위 링크로 본다.";
    });
  }

  // ── 분류군 찾기 ─────────────────────────────────────────────────────
  // 채집지 점과 같은 규칙으로 거른다(pipeline/common.py 의 belongs): 연대 범위가 시점
  // ±2.5 Myr 창과 겹치고, 범위가 20 Myr 이하. PBDB 의 overlap 도 같은 뜻이다.
  var taxonSeq = 0;
  function searchTaxon(name) {
    var f = frame();
    var seq = ++taxonSeq;
    state.taxon = name;
    $("taxon-clear").hidden = false;
    $("taxon-status").textContent = name + " — " + fmtAge(f.age) + " 무렵을 PBDB 에 묻는 중…";
    var url = PBDB + "occs/list.json?base_name=" + encodeURIComponent(name) +
      "&max_ma=" + (f.age + WINDOW_MA) + "&min_ma=" + Math.max(0, f.age - WINDOW_MA) +
      "&timerule=overlap&pgm=scotese&show=paleoloc,coll,class&vocab=pbdb&limit=20000";
    getJSON(url).then(function (data) {
      if (seq !== taxonSeq) return;
      taxonLayer.clearLayers();
      if (data.errors) throw new Error(data.errors.join(" "));
      var shown = 0;
      (data.records || []).forEach(function (r) {
        if (r.max_ma - r.min_ma > MAX_SPAN_MA) return;
        if (r.paleolat == null || r.paleolng == null) return;
        shown += 1;
        L.circleMarker([r.paleolat, r.paleolng], {
          renderer: renderer, radius: 4.5, weight: 1.5, color: "#003d2b", fillColor: "#2ee6a6", fillOpacity: 0.95,
        }).bindTooltip(esc(r.accepted_name || r.identified_name) + " · " + esc(r.collection_name))
          .on("click", function (e) {
            openCollection(e.latlng, [r.collection_no, r.paleolng, r.paleolat, "o", "?", r.collection_name,
              r.early_interval, r.late_interval || "", r.max_ma, r.min_ma, "", ""], COLUMNS);
          })
          .addTo(taxonLayer);
      });
      $("taxon-status").textContent = name + " — " + fmtAge(f.age) + " 무렵 산출 " + shown.toLocaleString("ko-KR") + "건.";
      drawFossils(f);
    }).catch(function (err) {
      if (seq !== taxonSeq) return;
      $("taxon-status").textContent = "찾지 못했다: " + (err.message || err);
    });
  }
  var COLUMNS = { collection_no: 0, paleolng: 1, paleolat: 2, env: 3, n_occs: 4, collection_name: 5,
                  early_interval: 6, late_interval: 7, max_ma: 8, min_ma: 9, formation: 10, environment: 11 };

  function clearTaxon() {
    taxonSeq += 1;
    state.taxon = "";
    taxonLayer.clearLayers();
    $("taxon").value = "";
    $("taxon-clear").hidden = true;
    $("taxon-status").textContent = "PBDB 에 바로 묻는다. 시점을 옮기면 다시 묻는다.";
    drawFossils(frame());
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
    document.querySelectorAll("[data-env]").forEach(function (box) {
      box.addEventListener("change", function () { state.env[box.dataset.env] = box.checked; drawFossils(frame()); });
    });
    $("coast").addEventListener("change", function () { drawCoast(frame()); });
    $("grid").addEventListener("change", function () {
      if (this.checked) gridLayer.addTo(map); else map.removeLayer(gridLayer);
    });
    $("taxon-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var name = $("taxon").value.trim();
      if (name) searchTaxon(name); else clearTaxon();
    });
    $("taxon-clear").addEventListener("click", clearTaxon);
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
      bind();
      var wanted = parseFloat((location.hash.match(/age=([\d.]+)/) || [])[1]);
      var start = state.frames.findIndex(function (f) { return f.age === wanted; });
      if (start < 0) start = state.frames.findIndex(function (f) { return f.age === 250; });
      show(start < 0 ? 0 : start);
    }).catch(function () { /* 자료가 없다는 안내는 템플릿이 띄운다 */ });
  }

  start();
})();
