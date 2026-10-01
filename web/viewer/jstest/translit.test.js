// 학명 음차 시험(tupandactyl 020) — 연구자가 준 예시. `node web/viewer/jstest/translit.test.js`
var ko = require("../static/viewer/translit.js");
var CASES = {
  // j (제?항)
  Jeholornis: "예홀로르니스", Ninjemys: "니녜미스", Jinjuichthys: "이뉴익티스", Jiangchangnathus: "이앙캉그나투스",
  // y (제6항)
  Yantarogekko: "얀타로게코", Ichthyovenator: "익티오베나토르", Tianyulong: "티아니울롱",
  // w (제8항)
  Wiehenvenator: "위에헨베나토르", Wuerhosaurus: "우에로사우루스", Darwinopterus: "다르위놉테루스", Rukwatitan: "루콰티탄", Simbakubwa: "심바쿠브와",
  // 파열음 (나)
  Barylambda: "바릴람브다", Jeholopterus: "예홀롭테루스", Arctodus: "아륵토두스", Oksoko: "옥소코", Ichthyosaurus: "익티오사우루스",
  Helicoprion: "헬리코프리온", Cycnorhamphus: "키크노람푸스",
  // th·ts (제10항)
  Thoracopterus: "토라콥테루스", Tsintaosaurus: "친타오사우루스", Tsaagan: "차간",
  // h (제11항)
  Utahraptor: "우타랍토르", Dreadnoughthus: "드레아드노우그투스",
  // n (제12항)
  Sinraptor: "신랍토르", Normannognathus: "노르만노그나투스", Kongonaphon: "콩고나폰",
  // 겹자음 (제14항)
  Coccosteus: "코코스테우스", Psittacosaurus: "프시타코사우루스", Calligramma: "칼리그람마", Purussaurus: "푸루사우루스",
  // 어두 M·N (제15항)
  Mnyamawamtuka: "음니아마왐투카", Nqwebasaurus: "응퀘바사우루스",
  // 어말·자음 앞 무성 파열음
  Tiktaalik: "틱탈릭", Ozimek: "오지멕", Ichthyornis: "익티오르니스", Gegepterus: "게겝테루스",
  // sh
  Najash: "나야시", Shantungosaurus: "샨퉁고사우루스", Shringasaurus: "슈링가사우루스",
  // 장모음 (제7항)
  Zuul: "줄", Leedsichthys: "레드식티스", Troodon: "트로돈", Koolasuchus: "콜라수쿠스",
  // 자음+h, 겹자음, Q
  Zhejiangopterus: "제이앙곱테루스", Anhanguera: "아낭구에라", Dsungaripterus: "중가립테루스", Halszkaraptor: "할스즈카랍토르",
  Nanuqsaurus: "나누크사우루스", Qinglongopterus: "큉글롱곱테루스",
  // 종명 끝의 -i·-ii 는 [-ㅣ](연구자)
  "Coelophysis bauri": "코일로피시스 바우리", "Diplodocus carnegii": "디플로도쿠스 카르네기", "Elrathia kingii": "엘라티아 킹기",
  // 장음은 어디서든 한 번 — aa ee ii oo uu ww yy(연구자)
  Shiikia: "시키아", Kaatedocus: "카테도쿠스", "Pentaceratops sternbergii": "펜타케라톱스 스테른베르기", Hyyla: "힐라",
};
var fail = 0;
Object.keys(CASES).forEach(function (latin) {
  var got = ko.name(latin);
  if (got !== CASES[latin]) { fail += 1; console.log("✗ " + latin + "  기대 " + CASES[latin] + "  얻음 " + got); }
});
console.log((Object.keys(CASES).length - fail) + "/" + Object.keys(CASES).length + " 맞음");
process.exit(fail ? 1 : 0);
