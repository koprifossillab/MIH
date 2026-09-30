/* 대기 화면(tupandactyl 005) — 빈티지 종이 위의 베게너 초상 메달, 파이프 연기, 헤엄쳐 와 메달을 두르는 메소사우루스,
 * 펜으로 쓰듯 나타나는 제목. 지도(map.js)는 첫 배경이 그려지면 WegenerSplash.ready() 를 부른다 — 움직임이 끝났으면
 * 곧 걷고, 아직이면 끝난 뒤에 걷는다. 누르거나 Esc·Enter·Space 로 건너뛴다. 화면 움직임 줄이기를 켠 사람에게는
 * 끝 모습(두른 메소사우루스·제목)만 보인다.
 *
 * 헤엄은 "길 따라가기" 로 만든다 — 머리가 물결치는 길을 가고 몸의 각 마디는 머리가 지나간 자리를 밟는다. 바다뱀·뱀장어가
 * 헤엄치는 방식이라 몸 전체가 한 물결로 꿈틀거린다. 거기에 꼬리로 갈수록 커지는 작은 물결을 한 겹 더 얹어(물을 미는
 * 미끄러짐) 뻣뻣하지 않게 한다. 길의 끝은 메달을 도는 원이라, 머리가 한 바퀴 돌면 몸이 저절로 메달을 두른다.
 */
(function () {
  "use strict";
  var box = document.getElementById("splash");
  var Meso = window.WegenerMeso;
  if (!box || !Meso) return;
  var TAU = Math.PI * 2;
  var INK = "#3b2a1a", PAPER = "#efe4cc";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var cv = box.querySelector(".splash-fx"), ctx = cv.getContext("2d");
  var medal = box.querySelector(".splash-medal"), title = box.querySelector(".splash-title");
  var W = 0, H = 0, dpr = 1, C = [0, 0], Rm = 0, ring = null, path = null;

  // 시간표(초) — 연기를 뱉는 순간 메소사우루스가 들어온다
  var T_ENTER = .9, T_SWIM = 4.8, T_WRITE = 3.0;
  var T_SEATED = T_ENTER + T_SWIM, T_DONE = T_SEATED + .2 + T_WRITE;
  var t0 = 0, raf = 0, mapReady = false, skipped = false, closed = false;

  // ── 자리 ─────────────────────────────────────────────────────────
  // 메달 가운데와 반지름은 DOM 의 .splash-medal 에서 읽는다(CSS 가 창 크기에 맞춘다)
  function layout() {
    dpr = Math.min(2, window.devicePixelRatio || 1);
    W = box.clientWidth; H = box.clientHeight;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var a = box.getBoundingClientRect(), m = medal.getBoundingClientRect();
    C = [m.left - a.left + m.width / 2, m.top - a.top + m.height / 2];
    Rm = m.width / 2 * (472 / 480);            // wegener.svg 의 메달 테두리 반지름(960 틀의 472)
    ring = Meso.emblemRing(C[0], C[1], Rm);
    path = buildPath();
  }

  // 머리가 가는 길 — 왼쪽 화면 밖에서 물결치며 와 메달 밑(B)에서 오른쪽을 보고, 메달을 시계 반대 방향으로 돈다.
  // 점을 조밀하게 찍고 누적 길이를 둔다. 몸이 화면 밖에서도 있게 시작점 앞으로 몸길이만큼 더 늘인다
  function buildPath() {
    var R = ring.R, L = ring.L, B = [C[0], C[1] + R];
    var y0 = Math.min(H - 40, B[1] + H * .16);
    var P0 = [-30, y0], P1 = [W * .18, y0], P2 = [B[0] - R * 1.7, B[1]], P3 = B;
    var base = [];
    for (var i = 0; i <= 80; i++) base.push([P0[0] - L * 1.1 * (1 - i / 80), y0]);           // 화면 밖 곧은 길
    for (i = 1; i <= 200; i++) {
      var k = i / 200, m = 1 - k;
      base.push([m * m * m * P0[0] + 3 * m * m * k * P1[0] + 3 * m * k * k * P2[0] + k * k * k * P3[0],
                 m * m * m * P0[1] + 3 * m * m * k * P1[1] + 3 * m * k * k * P2[1] + k * k * k * P3[1]]);
    }
    // 원에 닿기 전까지 물결 — 파장은 몸길이의 0.62, 진폭은 0.09. 메달에 가까워지며 잦아든다
    var len = cumulative(base), total = len[len.length - 1], lam = L * .62, amp = L * .09, out = [];
    for (i = 0; i < base.length; i++) {
      var a = base[Math.max(0, i - 1)], b = base[Math.min(base.length - 1, i + 1)];
      var d = Math.atan2(b[1] - a[1], b[0] - a[0]), nx = -Math.sin(d), ny = Math.cos(d);
      var left = total - len[i], env = smooth(Math.min(1, left / (R * 2.2)));
      var off = amp * env * Math.sin(TAU * len[i] / lam);
      out.push([base[i][0] + nx * off, base[i][1] + ny * off]);
    }
    // 원 — 메달 밑에서 시계 반대 방향(화면에서 각이 줄어드는 쪽)으로 머리가 엠블럼의 머리 자리에 닿을 때까지
    var turn = TAU - (Meso.EMBLEM.head - Math.PI / 2 + TAU) % TAU;          // 0.97 바퀴
    var steps = Math.ceil(turn * R / 3);
    for (i = 1; i <= steps; i++) {
      var an = Math.PI / 2 - turn * i / steps;
      out.push([C[0] + R * Math.cos(an), C[1] + R * Math.sin(an)]);
    }
    var cum = cumulative(out);
    return { pts: out, len: cum, total: cum[cum.length - 1], start: len[80], onRing: len[len.length - 1] };
  }
  function cumulative(pts) {
    var out = [0];
    for (var i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    return out;
  }
  function at(s) {                            // 길 위 누적 길이 s 의 자리(이분 탐색)
    var L = path.len, lo = 0, hi = L.length - 1;
    s = Math.max(0, Math.min(path.total, s));
    while (hi - lo > 1) { var mid = (lo + hi) >> 1; if (L[mid] < s) lo = mid; else hi = mid; }
    var k = (s - L[lo]) / ((L[hi] - L[lo]) || 1), a = path.pts[lo], b = path.pts[hi];
    return [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, Math.atan2(b[1] - a[1], b[0] - a[0])];
  }
  function smooth(k) { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); }
  // 머리의 빠르기 — 거의 고르게 헤엄치다 메달을 돌며 늦춘다
  function progress(k) { k = Math.max(0, Math.min(1, k)); return 1 - Math.pow(1 - k, 1.3); }

  // 몸 — 머리가 지나온 길 위의 점들 + 꼬리로 갈수록 커지는 작은 물결
  function body(t) {
    var k = (t - T_ENTER) / T_SWIM;
    var head = path.start + (path.total - path.start) * progress(k);
    var settle = smooth((t - T_ENTER - T_SWIM * .72) / (T_SWIM * .28));      // 끝 무렵 물결을 거둔다
    var L = ring.L, P = [];
    for (var i = 0; i <= Meso.N; i++) {
      var s = i / Meso.N, q = at(head - s * L), nx = -Math.sin(q[2]), ny = Math.cos(q[2]);
      var wav = L * .034 * (.15 + .85 * s * s) * Math.sin(TAU * (s / .42 - 1.7 * t)) * (1 - settle);
      P.push([q[0] + nx * wav, q[1] + ny * wav]);
    }
    return { P: P, settle: settle, beat: Math.sin(TAU * 1.7 * t) };
  }

  // ── 파이프 연기 ─────────────────────────────────────────────────────
  // wegener.svg 의 960 틀에서 입(578, 600)·대통 윗면(752, 664)
  var puffs = [];
  function toScreen(px, py) { var k = medal.getBoundingClientRect().width / 960; return [C[0] + (px - 480) * k, C[1] + (py - 480) * k]; }
  var owed = 0;                                                               // 한 틀에 못 낸 연기 알갱이(소수)
  function emit(t, dt) {
    var k = medal.getBoundingClientRect().width / 960;
    if (t > T_ENTER && t < T_ENTER + .9) {                                    // 한 모금 뱉는다 — 입에서 앞(오른쪽)으로 길게 흘러 나간다
      owed += 34 * dt;
      for (; owed >= 1; owed--) {
        var m = toScreen(582, 604), sp = 420 + Math.random() * 260;
        puffs.push({ x: m[0], y: m[1], vx: sp * k, vy: (-40 - Math.random() * 70) * k, r: 8 * k, g: 120 * k,
                     a: .16 + Math.random() * .06, life: 2.8 + Math.random() * 1.2, age: 0, drag: 1.1, wob: Math.random() * TAU, wa: 26 * k });
      }
    }
    if (Math.random() < dt * 5) {                                             // 대통에서 가늘게 피어오른다
      var b = toScreen(752 + (Math.random() - .5) * 18, 660);
      puffs.push({ x: b[0], y: b[1], vx: (Math.random() - .3) * 14 * k, vy: (-70 - Math.random() * 40) * k, r: 4 * k,
                   g: 40 * k, a: .15, life: 3.6, age: 0, drag: .25, wob: Math.random() * TAU, wa: 30 * k });
    }
  }
  function drawSmoke(dt) {
    puffs = puffs.filter(function (p) { return p.age < p.life; });
    puffs.forEach(function (p) {
      p.age += dt;
      var f = Math.exp(-p.drag * dt);
      p.vx *= f; p.vy = p.vy * f - 10 * dt;                                   // 식으며 떠오른다
      p.x += (p.vx + Math.sin(p.age * 2.4 + p.wob) * p.wa) * dt; p.y += p.vy * dt;
      var r = p.r + p.g * Math.sqrt(p.age), al = p.a * Math.pow(Math.max(0, 1 - p.age / p.life), 1.4) * Math.min(1, p.age * 5);
      var gr = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
      gr.addColorStop(0, "rgba(128,114,98," + al + ")"); gr.addColorStop(.6, "rgba(128,114,98," + al * .45 + ")"); gr.addColorStop(1, "rgba(128,114,98,0)");
      ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    });
  }

  // ── 그리기 ───────────────────────────────────────────────────────
  var last = 0;
  function frame(now) {
    var t = skipped ? 99 : (now - t0) / 1000, dt = Math.min(.05, Math.max(0, t - last)); last = t;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    box.classList.toggle("lit", t > .15);                                     // 메달이 떠오른다(CSS)
    if (!skipped && !reduce) { emit(t, dt); drawSmoke(dt); }
    if (t >= T_SEATED || skipped || reduce) {
      Meso.draw(ctx, ring.P, ring.L, { fill: INK, eye: PAPER, tuck: 1, teeth: true });
    } else if (t > T_ENTER) {
      var b = body(t);
      Meso.draw(ctx, b.P, ring.L, { fill: INK, eye: PAPER, beat: b.beat, tuck: b.settle, teeth: true });
    }
    // 제목 — 왼쪽부터 펜으로 쓰듯. 끝이 번진 가림막을 옮긴다
    var w = skipped || reduce ? 1 : Math.max(0, Math.min(1, (t - T_SEATED - .2) / T_WRITE));
    title.style.setProperty("--ink", (w * 118 - 8).toFixed(1) + "%");
    if (t >= T_DONE || skipped || reduce) { box.classList.add("settled"); maybeClose(); }
    if (!closed && (t < T_DONE + 4 || puffs.length)) raf = requestAnimationFrame(frame);
  }

  function maybeClose() {
    if (closed || !mapReady || !box.classList.contains("settled")) return;
    closed = true;
    box.classList.add("done");                                               // .6 초 흐려지며 걷힌다(CSS)
    setTimeout(function () { cancelAnimationFrame(raf); box.remove(); }, 700);
  }
  function skip() {
    if (box.classList.contains("failed")) return;
    skipped = true;
    if (mapReady) maybeClose();
  }

  function start() {
    layout();
    t0 = performance.now(); last = 0;
    raf = requestAnimationFrame(frame);
  }
  box.addEventListener("click", function (e) { if (!e.target.closest("button")) skip(); });
  document.addEventListener("keydown", function (e) {
    if (!closed && (e.key === "Escape" || e.key === "Enter" || e.key === " ")) skip();
  });
  window.addEventListener("resize", function () { if (!closed) layout(); });

  window.WegenerSplash = {
    // 지도가 준비됐다 — 움직임이 끝났으면 걷는다
    ready: function () { mapReady = true; box.classList.add("map-ready"); maybeClose(); },
  };
  // 메달 그림이 오면 시작한다(자리를 재야 한다). 늦어도 0.5 초 뒤에는 시작
  var img = medal.querySelector("img"), begun = false;
  function go() { if (!begun) { begun = true; start(); } }
  if (img && !img.complete) { img.addEventListener("load", go); img.addEventListener("error", go); setTimeout(go, 500); } else go();
})();
