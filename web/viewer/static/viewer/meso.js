/* 메소사우루스 그리기(tupandactyl 005) — 대기 화면(splash.js)과 아이콘 만들기(design/make_icons.js)가 함께 쓴다.
 *
 * 몸은 머리(s = 0)에서 꼬리 끝(s = 1)까지의 등뼈 선 하나로 정한다. 등뼈의 점들만 주면 옆모습의 몸 윤곽·다리·눈·
 * 바늘 이빨을 그 선을 따라 붙인다. 헤엄(길을 따라가는 몸)이든, 몸을 만 화석 자세든 등뼈만 바꾸면 된다.
 * 비율은 복원도에서 — 머리뼈 0.14, 목 0.06, 몸통 0.28, 꼬리 0.52. 폭은 몸길이에 대한 비.
 */
(function (root) {
  "use strict";
  var TAU = Math.PI * 2;
  var N = 96;                          // 등뼈 마디 수
  // 옆모습의 등(UP)·배(DN) 쪽 두께
  var UP = [[0, .002], [.03, .005], [.10, .011], [.14, .02], [.17, .014], [.22, .02], [.34, .027], [.44, .024], [.5, .018], [.7, .01], [1, .0015]];
  var DN = [[0, .002], [.03, .004], [.10, .009], [.14, .016], [.17, .013], [.22, .022], [.34, .032], [.44, .026], [.5, .017], [.7, .008], [1, .0015]];

  function table(tab, s) {
    for (var i = 1; i < tab.length; i++) {
      if (s <= tab[i][0]) {
        var a = tab[i - 1], b = tab[i], k = (s - a[0]) / (b[0] - a[0]);
        k = k * k * (3 - 2 * k);
        return a[1] + (b[1] - a[1]) * k;
      }
    }
    return tab[tab.length - 1][1];
  }

  // 등뼈 점들의 방향 — 꼬리 쪽을 가리키는 각. 배 쪽 법선은 머리가 오른쪽을 볼 때 화면 아래
  function directions(P) {
    var D = [];
    for (var i = 0; i < P.length; i++) {
      var a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)];
      D.push(Math.atan2(b[1] - a[1], b[0] - a[0]));
    }
    return D;
  }
  function belly(d) { return [Math.sin(d), -Math.cos(d)]; }

  // 몸 윤곽(닫힌 다각형) — 등 쪽 선을 머리→꼬리, 배 쪽 선을 꼬리→머리로
  // k: 굵기 배율 — 작은 아이콘에서는 몸을 굵게 그려야 보인다
  function outline(P, L, k) {
    var D = directions(P), up = [], dn = [];
    k = k || 1;
    for (var i = 0; i < P.length; i++) {
      var s = i / (P.length - 1), n = belly(D[i]), a = table(UP, s) * L * k, b = table(DN, s) * L * k;
      up.push([P[i][0] - n[0] * a, P[i][1] - n[1] * a]);
      dn.push([P[i][0] + n[0] * b, P[i][1] + n[1] * b]);
    }
    return up.concat(dn.reverse());
  }

  // 다리 물갈퀴 — [등뼈 자리, 길이, 폭, 젓는 세기]. 앞다리는 작고 뒷다리는 크다
  var LIMBS = [[.23, .055, .012, .6], [.47, .09, .018, 1]];
  function limbs(P, L, beat, tuck, k) {
    k = k || 1;
    var D = directions(P), out = [];
    LIMBS.forEach(function (lb) {
      var i = Math.round(lb[0] * (P.length - 1)), d = D[i], n = belly(d), dn = table(DN, lb[0]) * L * .8 * k;
      var shrink = (1 - .45 * tuck) * Math.sqrt(k);
      [0, 1].forEach(function (far) {
        out.push({
          far: !!far,
          x: P[i][0] + n[0] * dn, y: P[i][1] + n[1] * dn,
          a: d - .9 + .5 * (1 - tuck) * beat * lb[3] * (far ? -1 : 1) + (far ? .35 : 0) + tuck * .55,   // 붙이면 몸 쪽으로 눕힌다
          len: lb[1] * L * shrink, wid: lb[2] * L * shrink,
        });
      });
    });
    return out;
  }

  // 머리뼈는 휘지 않는다(연구자) — 등뼈의 머리 쪽 SKULL 마디를 목과 이어지는 자리에서 곧게 앞으로 편다.
  // 방향은 목(머리뼈 뒤 몇 마디)이 향하는 쪽. 몸이 길을 따라 휘어도 주둥이는 곧은 막대로 남는다
  var SKULL = .14;
  // span: 방향을 재는 목의 길이(몸길이에 대한 비). 길게 잴수록 머리의 까닥임이 작아진다 — 헤엄칠 때는 목과 몸통 앞쪽을
  // 함께 보아 흔들림을 줄이고(연구자: "머리가 너무 크게 까닥거린다"), 가만히 있을 때는 목 끝의 접선을 쓴다
  function rigid(P, span) {
    var last = P.length - 1, J = Math.round(SKULL * last), K = Math.min(last, J + Math.max(2, Math.round((span || .05) * last)));
    var Q = P[J], ux = Q[0] - P[K][0], uy = Q[1] - P[K][1], d = Math.hypot(ux, uy) || 1, step = d / (K - J);
    ux /= d; uy /= d;
    var out = P.slice();
    for (var i = 0; i < J; i++) out[i] = [Q[0] + ux * step * (J - i), Q[1] + uy * step * (J - i)];
    return out;
  }

  // ── 캔버스에 그리기 ──────────────────────────────────────────────
  // o: { fill, eye, beat(−1…1, 다리 젓기), tuck(0…1, 다리 붙이기), teeth(bool) }
  function draw(ctx, P, L, o) {
    P = rigid(P, o.neck);
    ctx.save();
    ctx.lineJoin = "round"; ctx.lineCap = "round";
    var lg = limbs(P, L, o.beat || 0, o.tuck || 0, o.k);
    lg.filter(function (l) { return l.far; }).forEach(function (l) { paddle(ctx, l, o.fill, .55); });
    var poly = outline(P, L, o.k);
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.fillStyle = o.fill; ctx.fill();
    lg.filter(function (l) { return !l.far; }).forEach(function (l) { paddle(ctx, l, o.fill, 1); });
    face(ctx, P, L, o);
    if (o.bones > 0) bones(ctx, P, L, lg, o);
    ctx.restore();
  }

  // 뼈대 — 검은 몸 속에 흰 뼈(대기 화면에서 메달을 두른 뒤 떠오른다). o.bones 0…1 은 드러난 정도로, 머리에서 꼬리 쪽으로 번진다.
  // 연구자가 준 골격도(옆모습 복원 골격)를 줄여 따른다 — 등뼈 마디와 등 쪽 가시돌기, 꼬리의 아래 가시(혈관궁), 뒤로 누운
  // 굵은 갈비뼈(메소사우루스는 갈비뼈가 두껍다), 팔다리의 긴 뼈 하나 + 아래팔(다리) 두 뼈 + 부채꼴 발가락,
  // 머리뼈의 긴 주둥이 윤곽·큰 눈구멍·아래턱. 측두창과 어깨·골반뼈는 뺐다(연구자 — 작은 그림에서는 군더더기)
  function bones(ctx, P, L, lg, o) {
    var D = directions(P), last = P.length - 1, k = o.k || 1, col = o.boneColor || o.eye;
    function alpha(s) { return Math.max(0, Math.min(1, (o.bones - s * .55) / .45)); }
    // 등뼈 선 위 s 자리에서 배 쪽으로 off 만큼 옮긴 점과 그 자리의 방향
    function at(s, off) {
      var f = s * last, i = Math.min(last - 1, Math.floor(f)), t = f - i;
      var x = P[i][0] + (P[i + 1][0] - P[i][0]) * t, y = P[i][1] + (P[i + 1][1] - P[i][1]) * t, d = D[i], n = belly(d);
      return { x: x + n[0] * off, y: y + n[1] * off, d: d, n: n, tx: Math.cos(d), ty: Math.sin(d) };
    }
    function up(s) { return table(UP, s) * L * k; }
    function dn(s) { return table(DN, s) * L * k; }
    function seg(a, b, w) { ctx.lineWidth = w; ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke(); }
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round";
    var thin = Math.max(.5, L * .0018 * k);

    // 머리뼈 — 주둥이 위아래 윤곽, 머리 뒤(뒤통수) 곡선, 큰 눈구멍, 아래턱의 뒤쪽 가지
    var a0 = alpha(0);
    if (a0 > 0) {
      ctx.globalAlpha = a0;
      ctx.lineWidth = thin; ctx.beginPath();
      for (var s = .004; s <= SKULL + .001; s += .004) { var q = at(s, -up(s) * .62); if (s === .004) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
      ctx.stroke(); ctx.beginPath();
      for (s = .004; s <= SKULL + .001; s += .004) { q = at(s, dn(s) * .62); if (s === .004) ctx.moveTo(q.x, q.y); else ctx.lineTo(q.x, q.y); }
      ctx.stroke();
      var oc = at(SKULL, 0);                                                   // 뒤통수
      ctx.beginPath(); ctx.moveTo(oc.x - oc.n[0] * up(SKULL) * .62, oc.y - oc.n[1] * up(SKULL) * .62);
      ctx.quadraticCurveTo(oc.x + oc.tx * L * .008, oc.y + oc.ty * L * .008, oc.x + oc.n[0] * dn(SKULL) * .62, oc.y + oc.n[1] * dn(SKULL) * .62);
      ctx.stroke();
      var ob = at(.112, -up(.112) * .18);                                      // 눈구멍
      ctx.lineWidth = thin * 1.3; ctx.beginPath(); ctx.arc(ob.x, ob.y, up(.112) * .5, 0, TAU); ctx.stroke();
      seg(at(.085, dn(.085) * .1), at(SKULL - .004, dn(SKULL) * .35), thin);   // 아래턱 뒤쪽 가지
    }

    // 등뼈 — 마디(짧은 토막), 등 쪽 가시돌기, 꼬리의 아래 가시. 꼬리로 갈수록 작아진다
    var step = .0118;
    for (s = SKULL + .008; s < .985; s += step) {
      var a = alpha(s); if (!a) continue;
      ctx.globalAlpha = a;
      var h = Math.min(L * .011, (table(UP, s) + table(DN, s)) * L * k * .3), c = at(s, -up(s) * .12);
      var b0 = at(s - step * .38, -up(s) * .12), b1 = at(s + step * .38, -up(s) * .12);
      ctx.lineCap = "butt"; seg(b0, b1, h); ctx.lineCap = "round";
      if (s < .82) {                                                            // 가시돌기 — 등 쪽, 꼬리 쪽으로 눕는다
        var len = up(s) * .62;
        seg({ x: c.x - c.n[0] * h * .5, y: c.y - c.n[1] * h * .5 },
            { x: c.x - c.n[0] * (h * .5 + len) + c.tx * len * .45, y: c.y - c.n[1] * (h * .5 + len) + c.ty * len * .45 }, Math.max(.5, h * .38));
      }
      if (s > .5 && s < .86) {                                                  // 혈관궁 — 꼬리 아래
        var hl = dn(s) * .6;
        seg({ x: c.x + c.n[0] * h * .5, y: c.y + c.n[1] * h * .5 },
            { x: c.x + c.n[0] * (h * .5 + hl) + c.tx * hl * .5, y: c.y + c.n[1] * (h * .5 + hl) + c.ty * hl * .5 }, Math.max(.5, h * .32));
      }
    }

    // 갈비뼈 — 목의 짧은 것, 몸통의 길고 굵은 것(뒤로 누운 곡선)
    for (s = SKULL + .014; s < .47; s += .0135) {
      a = alpha(s); if (!a) continue;
      ctx.globalAlpha = a;
      var r0 = at(s, -up(s) * .05), trunk = s > .19, rl = trunk ? dn(s) * .86 : dn(s) * .45;
      var end = { x: r0.x + r0.n[0] * rl + r0.tx * rl * .42, y: r0.y + r0.n[1] * rl + r0.ty * rl * .42 };
      ctx.lineWidth = trunk ? Math.max(.8, L * .0036 * k) : thin;
      ctx.beginPath(); ctx.moveTo(r0.x, r0.y);
      ctx.quadraticCurveTo(r0.x + r0.n[0] * rl * .7 - r0.tx * rl * .06, r0.y + r0.n[1] * rl * .7 - r0.ty * rl * .06, end.x, end.y);
      ctx.stroke();
    }

    // 팔다리 — 위팔(넓적다리)뼈, 아래팔(종아리) 두 뼈, 부채꼴 발가락 다섯
    lg.forEach(function (l) {
      var hind = l.len > L * .07, al = alpha(hind ? .47 : .23) * (l.far ? .4 : 1); if (!al) return;
      ctx.globalAlpha = al;
      var cx = Math.cos(l.a), cy = Math.sin(l.a), nx = -cy, ny = cx;
      function p(u, v) { return { x: l.x + cx * l.len * u + nx * l.wid * v, y: l.y + cy * l.len * u + ny * l.wid * v }; }
      seg(p(.04, 0), p(.34, 0), Math.max(.7, l.wid * .5));
      seg(p(.37, -.28), p(.58, -.28), thin); seg(p(.37, .28), p(.58, .28), thin);
      for (var f = -2; f <= 2; f++) seg(p(.62, f * .22), p(hind ? .98 : .9, f * .55), thin * .9);
    });
    ctx.restore();
  }

  function paddle(ctx, l, fill, alpha) {
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(l.x, l.y); ctx.rotate(l.a);
    ctx.beginPath(); ctx.ellipse(l.len / 2, 0, l.len / 2, l.wid, 0, 0, TAU); ctx.fillStyle = fill; ctx.fill();
    ctx.restore();
  }
  function face(ctx, P, L, o) {
    var D = directions(P), last = P.length - 1;
    var i = Math.round(.115 * last), n = belly(D[i]), up = table(UP, .115) * L * .45;
    ctx.beginPath(); ctx.arc(P[i][0] - n[0] * up, P[i][1] - n[1] * up, Math.max(.7, L * .0052), 0, TAU);
    ctx.fillStyle = o.eye; ctx.fill();
    if (!o.teeth || L < 120) return;
    // 바늘 이빨 — 위아래 턱에서 앞쪽으로 비스듬히 나온 가는 선, 그리고 입 선
    var jaw = Math.round(.1 * last);
    ctx.strokeStyle = o.fill; ctx.lineWidth = Math.max(.5, L * .0015);
    for (var j = 1; j < jaw; j++) {
      var s = j / last, d = D[j], nj = belly(d), fx = -Math.cos(d), fy = -Math.sin(d);
      var a = table(UP, s) * L, b = table(DN, s) * L, t = L * .013;
      ctx.beginPath(); ctx.moveTo(P[j][0] + nj[0] * b, P[j][1] + nj[1] * b);
      ctx.lineTo(P[j][0] + nj[0] * (b + t) + fx * t * .5, P[j][1] + nj[1] * (b + t) + fy * t * .5); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(P[j][0] - nj[0] * a, P[j][1] - nj[1] * a);
      ctx.lineTo(P[j][0] - nj[0] * (a + t * .8) + fx * t * .5, P[j][1] - nj[1] * (a + t * .8) + fy * t * .5); ctx.stroke();
    }
    ctx.strokeStyle = o.eye; ctx.lineWidth = Math.max(.5, L * .0018);
    ctx.beginPath(); ctx.moveTo(P[0][0], P[0][1]); ctx.lineTo(P[jaw][0], P[jaw][1]); ctx.stroke();
  }

  // ── 자세 ─────────────────────────────────────────────────────────
  // 화석처럼 몸을 만 자세 — 머리에서 꼬리로 갈수록 더 꺾인다(θ = C·s^p). 머리가 오른쪽을 본다
  function curled(L, C, p) {
    var P = [], x = 0, y = 0;
    for (var i = 0; i <= N; i++) {
      var s = i / N, dir = Math.PI + C * Math.pow(s, p);
      P.push([x, y]);
      x += Math.cos(dir) * L / N; y += Math.sin(dir) * L / N;
    }
    return P;
  }
  // 원을 두른 자세 — 중심 (cx, cy), 반지름 R. 머리는 각 a0 에 있고 몸은 시계 반대 방향(화면)으로 꼬리까지 이어진다
  function ring(cx, cy, R, L, a0) {
    var P = [];
    for (var i = 0; i <= N; i++) {
      var a = a0 + (L * i / N) / R;
      P.push([cx + R * Math.cos(a), cy + R * Math.sin(a)]);
    }
    return P;
  }
  function bbox(P) {
    var b = [Infinity, Infinity, -Infinity, -Infinity];
    P.forEach(function (p) { b[0] = Math.min(b[0], p[0]); b[1] = Math.min(b[1], p[1]); b[2] = Math.max(b[2], p[0]); b[3] = Math.max(b[3], p[1]); });
    return b;
  }

  // ── SVG 로 — 아이콘 파일을 만들 때(design/make_icons.js) ─────────────
  function svgPath(pts) {
    return "M" + pts.map(function (p) { return p[0].toFixed(2) + " " + p[1].toFixed(2); }).join("L") + "Z";
  }
  function svg(P, L, o) {
    P = rigid(P);
    var out = [];
    limbs(P, L, 0, o.tuck == null ? 1 : o.tuck, o.k).forEach(function (l) {
      out.push('<ellipse cx="' + (l.len / 2).toFixed(2) + '" cy="0" rx="' + (l.len / 2).toFixed(2) + '" ry="' + l.wid.toFixed(2) +
        '" transform="translate(' + l.x.toFixed(2) + " " + l.y.toFixed(2) + ") rotate(" + (l.a * 180 / Math.PI).toFixed(1) + ')"' +
        (l.far ? ' opacity=".55"' : "") + ' fill="' + o.fill + '"/>');
    });
    out.push('<path d="' + svgPath(outline(P, L, o.k)) + '" fill="' + o.fill + '"/>');
    var k = o.k || 1, D = directions(P), i = Math.round(.115 * (P.length - 1)), n = belly(D[i]), up = table(UP, .115) * L * .45 * k;
    out.push('<circle cx="' + (P[i][0] - n[0] * up).toFixed(2) + '" cy="' + (P[i][1] - n[1] * up).toFixed(2) + '" r="' + Math.max(.7, L * .0052 * k).toFixed(2) + '" fill="' + o.eye + '"/>');
    return out.join("");
  }

  // 엠블럼 — 초상 메달(반지름 Rm)을 몸으로 두른 자세. 대기 화면의 끝 모습과 머리말·아이콘이 같은 값을 쓴다.
  // 몸은 둘레의 94% 를 차지하고, 머리는 메달 바로 아래 조금 왼쪽에서 오른쪽을 보며 꼬리 끝과 마주한다
  var EMBLEM = { ring: 1.3, share: .94, head: Math.PI / 2 + .03 * TAU };
  function emblemRing(cx, cy, Rm) {
    var R = Rm * EMBLEM.ring, L = EMBLEM.share * TAU * R;
    return { R: R, L: L, P: ring(cx, cy, R, L, EMBLEM.head) };
  }

  var api = { N: N, EMBLEM: EMBLEM, emblemRing: emblemRing, rigid: rigid, draw: draw, outline: outline, curled: curled, ring: ring, bbox: bbox, svg: svg, directions: directions, belly: belly, width: function (s) { return table(DN, s); } };
  if (typeof module === "object" && module.exports) module.exports = api; else root.WegenerMeso = api;
})(this);
