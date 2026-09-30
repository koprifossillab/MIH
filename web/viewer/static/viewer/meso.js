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
  function rigid(P) {
    var last = P.length - 1, J = Math.round(SKULL * last), K = Math.min(last, J + 5);
    var Q = P[J], ux = Q[0] - P[K][0], uy = Q[1] - P[K][1], d = Math.hypot(ux, uy) || 1, step = d / (K - J);
    ux /= d; uy /= d;
    var out = P.slice();
    for (var i = 0; i < J; i++) out[i] = [Q[0] + ux * step * (J - i), Q[1] + uy * step * (J - i)];
    return out;
  }

  // ── 캔버스에 그리기 ──────────────────────────────────────────────
  // o: { fill, eye, beat(−1…1, 다리 젓기), tuck(0…1, 다리 붙이기), teeth(bool) }
  function draw(ctx, P, L, o) {
    P = rigid(P);
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
  // 등뼈 마디, 몸통의 굵은 갈비뼈(메소사우루스는 갈비뼈가 두껍다), 머리뼈의 턱·눈구멍, 다리의 긴 뼈와 발가락
  function bones(ctx, P, L, lg, o) {
    var D = directions(P), last = P.length - 1, k = o.k || 1, col = o.boneColor || o.eye;
    function alpha(s) { var a = (o.bones - s * .55) / .45; return Math.max(0, Math.min(1, a)); }
    function pt(i, off) { var n = belly(D[i]); return [P[i][0] + n[0] * off, P[i][1] + n[1] * off]; }
    ctx.save();
    ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineCap = "round"; ctx.lineJoin = "round";
    // 머리뼈 — 위아래 턱의 안쪽 선, 머리 뒤쪽의 둥근 윤곽, 눈구멍
    var J = Math.round(SKULL * last), a0 = alpha(0);
    if (a0 > 0) {
      ctx.globalAlpha = a0; ctx.lineWidth = Math.max(.6, L * .0022 * k);
      ctx.beginPath();
      for (var i = 1; i <= J; i++) { var sU = i / last, q = pt(i, -table(UP, sU) * L * k * .5); if (i === 1) ctx.moveTo(q[0], q[1]); else ctx.lineTo(q[0], q[1]); }
      ctx.stroke();
      ctx.beginPath();
      for (i = 1; i <= J; i++) { var sD = i / last, r = pt(i, table(DN, sD) * L * k * .45); if (i === 1) ctx.moveTo(r[0], r[1]); else ctx.lineTo(r[0], r[1]); }
      ctx.stroke();
      var ie = Math.round(.115 * last), eo = pt(ie, -table(UP, .115) * L * k * .45);
      ctx.beginPath(); ctx.arc(eo[0], eo[1], Math.max(1, L * .0095 * k), 0, TAU); ctx.stroke();
      var ib = Math.round(.128 * last), cb = P[ib];
      ctx.beginPath(); ctx.ellipse(cb[0], cb[1], L * .022, table(UP, .128) * L * k * .7, D[ib], 0, TAU); ctx.stroke();
    }
    // 등뼈 마디 — 목에서 꼬리 끝까지 작아지며
    for (var s = SKULL + .006; s < .985; s += .0115) {
      var a = alpha(s); if (!a) continue;
      var j = Math.round(s * last), c = pt(j, -table(UP, s) * L * k * .12), len = L * .0072 * (1 - .55 * s), wid = Math.min(L * .011, (table(UP, s) + table(DN, s)) * L * k * .32);
      ctx.globalAlpha = a;
      ctx.save(); ctx.translate(c[0], c[1]); ctx.rotate(D[j]);
      ctx.beginPath(); ctx.ellipse(0, 0, len * .5, wid * .5, 0, 0, TAU); ctx.fill();
      ctx.restore();
    }
    // 갈비뼈 — 등뼈에서 배 쪽으로, 꼬리 쪽으로 조금 누운 굵은 곡선
    ctx.lineWidth = Math.max(.8, L * .0042 * k);
    for (s = .19; s < .47; s += .0135) {
      a = alpha(s); if (!a) continue;
      j = Math.round(s * last);
      var n = belly(D[j]), tx = Math.cos(D[j]), ty = Math.sin(D[j]), dn = table(DN, s) * L * k, c0 = pt(j, -table(UP, s) * L * k * .12);
      ctx.globalAlpha = a;
      ctx.beginPath(); ctx.moveTo(c0[0], c0[1]);
      ctx.quadraticCurveTo(P[j][0] + n[0] * dn * .45 - tx * L * .004, P[j][1] + n[1] * dn * .45 - ty * L * .004,
                           P[j][0] + n[0] * dn * .78 + tx * L * .012, P[j][1] + n[1] * dn * .78 + ty * L * .012);
      ctx.stroke();
    }
    // 다리 — 긴 뼈 하나와 부채처럼 퍼진 발가락 넷
    ctx.lineWidth = Math.max(.6, L * .0024 * k);
    lg.forEach(function (l) {
      var sl = l.len > L * .07 ? .47 : .23, al = alpha(sl) * (l.far ? .45 : 1); if (!al) return;
      ctx.globalAlpha = al;
      var ex = l.x + Math.cos(l.a) * l.len * .42, ey = l.y + Math.sin(l.a) * l.len * .42;
      ctx.beginPath(); ctx.moveTo(l.x + Math.cos(l.a) * l.len * .06, l.y + Math.sin(l.a) * l.len * .06); ctx.lineTo(ex, ey); ctx.stroke();
      for (var f = -1.5; f <= 1.5; f++) {
        var fa = l.a + f * .16;
        ctx.beginPath(); ctx.moveTo(ex, ey); ctx.lineTo(ex + Math.cos(fa) * l.len * .48, ey + Math.sin(fa) * l.len * .48); ctx.stroke();
      }
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
