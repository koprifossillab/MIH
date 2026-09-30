// 초상·엠블럼·파비콘 SVG 를 만든다(tupandactyl 005).
//
//   node design/make_icons.js
//
// 읽는 것: design/wegener_trace.json(trace_wegener.py 가 만든 초상 윤곽), web/viewer/static/viewer/meso.js(메소사우루스)
// 쓰는 것: web/viewer/static/viewer/ 의 wegener.svg(초상 메달) · emblem.svg(메달을 두른 메소사우루스) · favicon.svg
// 색은 한 가지 잉크(세피아)와 종이 — 대기 화면·머리말과 같다.
"use strict";
const fs = require("fs");
const path = require("path");
const Meso = require("../web/viewer/static/viewer/meso.js");

const OUT = path.join(__dirname, "..", "web", "viewer", "static", "viewer");
const INK = "#3b2a1a", PAPER = "#efe4cc";
const trace = JSON.parse(fs.readFileSync(path.join(__dirname, "wegener_trace.json"), "utf8"));

// 초상 메달 — 960 틀, 반지름 476. 사람 윤곽은 옅은 잉크 면 + 테두리, 짙은 면은 잉크
function medal(id) {
  return `<defs><clipPath id="${id}"><circle cx="480" cy="480" r="462"/></clipPath></defs>` +
    `<circle cx="480" cy="480" r="472" fill="${PAPER}" stroke="${INK}" stroke-width="10"/>` +
    `<circle cx="480" cy="480" r="452" fill="none" stroke="${INK}" stroke-width="2.5"/>` +
    `<g clip-path="url(#${id})" fill-rule="evenodd">` +
    `<path d="${trace.figure}" fill="${INK}" fill-opacity=".16" stroke="${INK}" stroke-width="7" stroke-linejoin="round"/>` +
    `<path d="${trace.dark}" fill="${INK}"/></g>`;
}
const head = (vb, w) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${vb}" width="${w}" height="${w}">`;

fs.writeFileSync(path.join(OUT, "wegener.svg"), head("0 0 960 960", 960) + medal("wd-m") + "</svg>\n");

// 엠블럼 — 메달 둘레를 메소사우루스가 두른다. 틀은 몸까지 들게 넓힌다
const ring = Meso.emblemRing(480, 480, 476);
const pad = ring.R + .075 * ring.L;
const vb = `${(480 - pad).toFixed(1)} ${(480 - pad).toFixed(1)} ${(2 * pad).toFixed(1)} ${(2 * pad).toFixed(1)}`;
fs.writeFileSync(path.join(OUT, "emblem.svg"), head(vb, 128) + medal("wd-e") + Meso.svg(ring.P, ring.L, { fill: INK, eye: PAPER, tuck: 1 }) + "</svg>\n");

// 파비콘 — 몸을 만 옆모습(시안 A). 종이 원 위에 잉크 한 마리
// 16 px 탭에서도 보이게 몸을 2.4 배 굵게
const L = 100, P = Meso.curled(L, 4.6, 1.3), b = Meso.bbox(P), K = 2.4;
const span = Math.max(b[2] - b[0], b[3] - b[1]) * 1.32, cx = (b[0] + b[2]) / 2, cy = (b[1] + b[3]) / 2;
fs.writeFileSync(path.join(OUT, "favicon.svg"),
  head(`${(cx - span / 2).toFixed(2)} ${(cy - span / 2).toFixed(2)} ${span.toFixed(2)} ${span.toFixed(2)}`, 64) +
  `<circle cx="${cx.toFixed(2)}" cy="${cy.toFixed(2)}" r="${(span / 2).toFixed(2)}" fill="${PAPER}"/>` +
  Meso.svg(P, L, { fill: INK, eye: PAPER, tuck: 1, k: K }) + "</svg>\n");
console.log("wegener.svg · emblem.svg · favicon.svg");
