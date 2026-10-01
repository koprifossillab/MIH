// 학명 → 한글, 한 줄에 하나(tupandactyl 021). 규칙은 뷰어의 translit.js 한 곳 — 파이프라인이 node 로 같은 파일을 부른다.
//   node pipeline/translit_batch.js < names.txt > hangul.txt
var ko = require("../web/viewer/static/viewer/translit.js");
var input = require("fs").readFileSync(0, "utf8").split("\n");
process.stdout.write(input.map(function (line) { return line ? ko.name(line) : ""; }).join("\n"));
