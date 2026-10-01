/* 학명 음차(tupandactyl 020) — 속·종 이름을 한글로. Casual 모드에서만 쓴다(Scientific·영어판은 학명 그대로).
 *
 * 기준은 연구자가 준 표(고전 라틴어의 글자 → 한글)와 세부 규칙이다. 규칙 번호는 연구자의 것이고, 예시는 시험(web/viewer/jstest/translit.test.js, CI)에 걸었다.
 * - 모음 a e i o u y → ㅏ ㅔ ㅣ ㅗ ㅜ ㅣ. 종명 끝의 -i·-ii 는 [-ㅣ] 하나(바우리, 카르네기) — [-아이]로 읽지 않는다. AE·OE → 아이·오이, AU·EU·EI 는 글자대로(아우·에우·에이). 장모음(aa ee ii oo uu)과 ww 는 한 번(제7항)
 * - j 는 뒤 모음과 합쳐 야·예·요·유, 못 합치면(ji) 이. 앞 자음은 그 음절의 첫소리가 된다(니녜미스)
 * - y 는 어두·모음 사이에서 뒤 모음과 합치고(얀타로게코), 자음과 모음 사이면 앞 자음과만 합친다(티아니울롱). 그 밖에는 모음 ㅣ
 * - w 는 뒤 모음과 합쳐 와·웨·위·워, 앞 자음이 k·g·h·x 면 그것까지(루콰티탄), 그 밖의 자음이면 앞 자음에 '으'(심바쿠브와)
 * - 무성 파열음 p t k(c·ch·x 의 k)는 모음 뒤·자음 앞에서 받침, 뒤가 l r m n 이면 '으'. 어말도 받침(틱탈릭). 유성 파열음 b d g 는 '으'
 * - th 는 ㅌ/트, ts·tz·어두 ds 는 ㅊ/츠·ㅈ(제10항·5항). h 는 자음 앞·어말·자음 뒤에서 적지 않는다(rh ph th ch sh zh kh gh 는 따로)
 * - n 은 ㄴ, c g k q 앞에서만 받침 ㅇ. ng 뒤의 g 는 모음·l r m n 앞에서만 소리 낸다(큉글롱곱테루스, 이앙캉그나투스)
 * - 같은 자음이 겹치면 한 번, 단 mm·nn 은 겹쳐 적는다(제14항). 어두 M·N + 자음은 음·은, Ng·Nk·Nq 는 응(제15항)
 * - sh 는 어말 시, 자음 앞 슈, 모음 앞 샤·셰·시·쇼·슈. q 는 [kʷ] — 모음 앞 콰·퀘·퀴·쿼, 자음 앞·어말 크(제6항). x 는 ks
 * - 관례·인명·지명은 따르지 않는다. 다만 관용 표기 몇은 찾기에서 받아 준다(ALIASES) — 화면에는 규칙의 이름을 쓴다
 */
(function (root) {
  "use strict";
  var VOWEL = { a: "ㅏ", e: "ㅔ", i: "ㅣ", o: "ㅗ", u: "ㅜ", y: "ㅣ" };
  var GLIDE_J = { a: "ㅑ", e: "ㅖ", o: "ㅛ", u: "ㅠ" };                 // ji 는 합칠 수 없다 → 이
  var GLIDE_W = { a: "ㅘ", e: "ㅞ", i: "ㅟ", o: "ㅝ", u: "ㅜ", y: "ㅟ" };
  var GLIDE_SH = { a: "ㅑ", e: "ㅖ", i: "ㅣ", o: "ㅛ", u: "ㅠ", y: "ㅣ" };
  var CHO = "ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ";
  var JUNG = "ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ";
  var JONG = " ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ";
  // 자음의 첫소리, 받침(무성 파열음·비음·유음만), 홀로 설 때(으를 붙여)
  var ONSET = { b: "ㅂ", d: "ㄷ", g: "ㄱ", k: "ㅋ", p: "ㅍ", t: "ㅌ", f: "ㅍ", v: "ㅂ", s: "ㅅ", z: "ㅈ", l: "ㄹ", r: "ㄹ",
                m: "ㅁ", n: "ㄴ", h: "ㅎ", th: "ㅌ", ts: "ㅊ", sh: "ㅅ", q: "ㅋ" };
  var CODA = { k: "ㄱ", p: "ㅂ", t: "ㅅ", m: "ㅁ", n: "ㄴ", l: "ㄹ", ng: "ㅇ" };
  var STOP = { p: 1, t: 1, k: 1 };
  var VOICED = { b: 1, d: 1, g: 1 };
  var SONORANT = { l: 1, r: 1, m: 1, n: 1 };
  var BACK = { k: 1, g: 1, q: 1 };              // n 이 [ŋ] 이 되는 자리
  var W_MERGE = { k: 1, g: 1, h: 1, q: 1 };     // w 를 합쳐 적는 앞 자음(제8항) — x 는 k 로 끝난다

  function compose(c) {
    return String.fromCharCode(0xac00 + (CHO.indexOf(c.cho) * 21 + JUNG.indexOf(c.jung)) * 28 + Math.max(0, JONG.indexOf(c.jong || " ")));
  }

  // ── 글자 → 소리 단위 ───────────────────────────────────────────────
  // 단위: {v: 모음 자모, glide: "j"|"w"|"sh"|null} 또는 {c: 자음}. 자음 이름은 ONSET 의 열쇠(k p t …), ng 는 n 에 표시.
  function tokens(word) {
    var w = word.toLowerCase().replace(/[^a-z]/g, "");
    w = w.replace(/([aeiouw])\1+/g, "$1");     // 장음은 따로 적지 않는다 — aa ee ii oo uu ww 모두 한 번(제7항, 연구자)
    w = w.replace(/ck/g, "k").replace(/([bcdfgklprstvz])\1/g, "$1");                          // 겹자음 한 번 — mm·nn 은 남긴다(제14항)
    var out = [], i = 0, n = w.length;
    var isV = function (ch) { return ch && "aeiouy".indexOf(ch) >= 0; };
    while (i < n) {
      var ch = w[i], nx = w[i + 1], nx2 = w[i + 2], prev = out[out.length - 1];
      // 모음
      if ("aeiou".indexOf(ch) >= 0) {
        var jamo = VOWEL[ch];
        if (ch === "e" && (w[i - 1] === "a" || w[i - 1] === "o") && !(prev && prev.glide)) jamo = "ㅣ";   // AE·OE → 아이·오이
        out.push({ v: jamo, letter: ch });
        i += 1; continue;
      }
      if (ch === "y") {
        var startOrV = i === 0 || isV(w[i - 1]);
        if (isV(nx) && nx !== "y" && startOrV) { out.push({ v: nx === "i" ? "ㅣ" : GLIDE_J[nx] || VOWEL[nx], glide: "j" }); i += 2; continue; }
        out.push({ v: "ㅣ", letter: "y" }); i += 1; continue;
      }
      if (ch === "j") {
        if (isV(nx) && nx !== "y") { out.push({ v: nx === "i" ? "ㅣ" : GLIDE_J[nx], glide: "j" }); i += 2; continue; }
        out.push({ v: "ㅣ" }); i += 1; continue;
      }
      if (ch === "w") {
        if (isV(nx)) { out.push({ v: GLIDE_W[nx], glide: "w" }); i += 2; continue; }
        out.push({ v: "ㅜ" }); i += 1; continue;
      }
      // 두 글자 자음
      var two = ch + (nx || "");
      if (two === "qu" && isV(nx2)) { out.push({ c: "q" }); i += 2; continue; }   // qu+모음 = q+모음 = kʷ
      if (two === "qw" && isV(nx2)) { out.push({ c: "q" }); i += 2; continue; }
      if (two === "ch" || two === "kh") { out.push({ c: "k" }); i += 2; continue; }
      if (two === "ph") { out.push({ c: "f" }); i += 2; continue; }
      if (two === "th") { out.push({ c: "th" }); i += 2; continue; }
      if (two === "rh") { out.push({ c: "r" }); i += 2; continue; }
      if (two === "gh") { out.push({ c: "g" }); i += 2; continue; }
      if (two === "sh") { out.push({ c: "sh" }); i += 2; continue; }
      if (two === "zh") { out.push({ c: "z" }); i += 2; continue; }
      if (two === "ts" || two === "tz") { out.push({ c: "ts" }); i += 2; continue; }
      if (i === 0 && (two === "ds" || two === "dz")) { out.push({ c: "z" }); i += 2; continue; }
      if (ch === "c") { out.push({ c: "k" }); i += 1; continue; }
      if (ch === "x") { out.push({ c: "k" }); out.push({ c: "s" }); i += 1; continue; }
      if (ch === "h") {
        // h 는 어두나 모음 사이에서만 소리 낸다(제11항). 자음 뒤의 h 는 적지 않는다(22 년 이후의 규칙)
        if ((i === 0 || isV(w[i - 1])) && isV(nx)) out.push({ c: "h" });
        i += 1; continue;
      }
      if (ch === "n" && BACK[nx === "c" ? "k" : nx === "x" ? "k" : nx]) { out.push({ c: "n", ng: true }); i += 1; continue; }
      out.push({ c: ch });
      i += 1;
    }
    // ng 뒤의 g: 모음·l r m n 앞에서만 소리 낸다
    return out.filter(function (t, k) {
      if (t.c !== "g" || !out[k - 1] || !out[k - 1].ng) return true;
      var after = out[k + 1];
      return !after || after.v ? !!after : !!SONORANT[after.c];
    });
  }

  // ── 소리 단위 → 음절 ────────────────────────────────────────────────
  function syllables(units) {
    var out = [];
    var last = function () { return out[out.length - 1]; };
    var open = function () { return last() && !last().jong; };
    var epenthetic = function (onset) { out.push({ cho: onset, jung: "ㅡ" }); };
    for (var k = 0; k < units.length; k++) {
      var u = units[k], next = units[k + 1], prev = units[k - 1];
      if (u.v) { out.push({ cho: "ㅇ", jung: u.v }); continue; }
      var c = u.c;
      // 첫소리: 뒤가 모음
      if (next && next.v) {
        var vowel = next.v;
        if (next.glide === "w" && !W_MERGE[c]) {                // 앞 자음에 '으'를 붙여 따로(심바쿠브와)
          epenthetic(c === "sh" ? "ㅅ" : ONSET[c]);
          if (c === "sh") last().jung = "ㅠ";
          continue;
        }
        if (c === "q") {                                         // [kʷ] — 콰·퀘·퀴·쿼
          var base = next.glide ? next.v : next.v;
          vowel = { "ㅏ": "ㅘ", "ㅔ": "ㅞ", "ㅣ": "ㅟ", "ㅗ": "ㅝ", "ㅜ": "ㅜ", "ㅘ": "ㅘ", "ㅞ": "ㅞ", "ㅟ": "ㅟ", "ㅝ": "ㅝ" }[base] || base;
        }
        if (c === "sh" && !next.glide) vowel = GLIDE_SH[{ "ㅏ": "a", "ㅔ": "e", "ㅣ": "i", "ㅗ": "o", "ㅜ": "u" }[next.v]] || next.v;
        if (c === "l" && out.length && open()) last().jong = "ㄹ";   // 모음 사이·자음 뒤의 l → ㄹㄹ
        out.push({ cho: ONSET[c], jung: vowel });
        k += 1;
        continue;
      }
      // 뒤가 자음이거나 어말
      var atStart = out.length === 0;
      if (c === "n" || c === "m") {
        if (atStart) {                                          // 어두 M·N + 자음(제15항)
          out.push({ cho: "ㅇ", jung: "ㅡ", jong: c === "m" ? "ㅁ" : u.ng ? "ㅇ" : "ㄴ" });
          continue;
        }
        if (open()) { last().jong = c === "m" ? "ㅁ" : u.ng ? "ㅇ" : "ㄴ"; continue; }
        epenthetic(ONSET[c]); continue;
      }
      if (c === "l") {
        if (open() && !atStart) { last().jong = "ㄹ"; continue; }
        epenthetic("ㄹ"); continue;
      }
      if (STOP[c] && !atStart && open() && !(next && SONORANT[next.c])) { last().jong = CODA[c]; continue; }
      if (c === "h") continue;
      if (c === "sh") {                                         // 어말 시, 자음 앞 슈
        out.push({ cho: "ㅅ", jung: next ? "ㅠ" : "ㅣ" });
        continue;
      }
      if (c === "q") { epenthetic("ㅋ"); continue; }
      epenthetic(ONSET[c]);
    }
    return out;
  }

  function word(latin) {
    if (!latin || /\./.test(latin)) return latin;               // "sp." "cf." "indet." 은 그대로
    var list = syllables(tokens(latin));
    return list.length ? list.map(compose).join("") : latin;
  }

  // 학명 → 한글. 낱말마다(속·종·아종), 괄호 안의 아속도. 숫자·약어는 그대로.
  function name(latin) {
    if (!latin) return latin;
    return String(latin).split(/(\s+|[()])/).map(function (part) {
      return /^[A-Za-z][A-Za-z-]*$/.test(part) ? part.split("-").map(word).join("") : part;
    }).join("");
  }

  // 관용 표기 — 찾기 칸에서만 받는다(화면에는 규칙의 이름). 연구자가 준 목록
  var ALIASES = {
    "티라노사우루스": "Tyrannosaurus", "안킬로사우루스": "Ankylosaurus", "오스트랄로피테쿠스": "Australopithecus",
    "매머드": "Mammuthus", "시조새": "Archaeopteryx", "아르카에옵테릭스": "Archaeopteryx", "마스토돈": "Mammut",
    "유타랍토르": "Utahraptor", "공자새": "Confuciusornis", "마멘키사우루스": "Mamenchisaurus", "코엘로피시스": "Coelophysis",
    "벨로시랩터": "Velociraptor", "마준가사우루스": "Majungasaurus", "둔클레오스테우스": "Dunkleosteus", "콘카베나토르": "Concavenator",
    "이크티오사우루스": "Ichthyosaurus", "이크티오스테가": "Ichthyostega", "이크티오르니스": "Ichthyornis", "앨버토사우루스": "Albertosaurus",
    "첸저우사우루스": "Qianzhousaurus", "주청티란누스": "Zhuchengtyrannus", "애팔래치오사우루스": "Appalachiosaurus", "마이프": "Maip",
    "리드시크티스": "Leedsichthys", "코리아노사우루스": "Koreanosaurus", "코리아케라톱스": "Koreaceratops", "둘리사우루스": "Doolysaurus",
    "제홀롭테루스": "Jeholopterus", "다위놉테루스": "Darwinopterus", "이 치": "Yi qi", "이치": "Yi qi", "케찰코아틀루스": "Quetzalcoatlus",
    "하체고프테릭스": "Hatzegopteryx", "트루돈": "Troodon", "트로오돈": "Troodon", "쿨라수쿠스": "Koolasuchus", "쿡소니아": "Cooksonia",
    "티안율롱": "Tianyulong", "드레드노투스": "Dreadnoughtus", "우에르호사우루스": "Wuerhosaurus", "산퉁고사우루스": "Shantungosaurus",
    "자카필": "Jakapil", "센트로사우루스": "Centrosaurus", "유오플로케팔루스": "Euoplocephalus", "안항구에라": "Anhanguera",
    "푸루스사우루스": "Purussaurus", "마드트소이아": "Madtsoia", "이크티오베나토르": "Ichthyovenator",
  };
  function fromKorean(text) {
    var q = String(text || "").trim();
    return ALIASES[q] || ALIASES[q.replace(/\s+/g, "")] || null;
  }

  root.WegenerKo = { name: name, word: word, fromKorean: fromKorean, aliases: ALIASES };
  if (typeof module !== "undefined") module.exports = root.WegenerKo;
})(typeof window !== "undefined" ? window : globalThis);
