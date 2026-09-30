# tupandactyl 008 — 제4기 안의 시대 이름은 모호한 연대에서 뺀다

2026-09-30 · `feature/quaternary-precise`

## 1. 무엇을 바랐나

연구자: "세 안에서 더 쪼갠 것도 모호한 연대로 분류했네? Early Pleistocene 같은 건 당연히 플라이스토세 기록으로 쳐야지". 모호한 연대의
규칙(016)은 PBDB 시대 이름의 **등급**으로 가른다 — 절 단위 이하는 정해진 기록, 세·아세·기·대·이언·bin 은 모호. 그래서
"Early Pleistocene"(아세)도 "Pleistocene"(세)도 모호했다. 무엇까지 뺄지 물었고(아세만 / 아세 + 신생대의 세), 연구자는
**제4기의 기록에 한해서만** 빼라고 정했다 — "절 단위만 정해진 기록으로 치는 것이 규칙이면 플라이스토세는 안 치는 게 맞다, 다만
제4기는 예외로".

## 2. 왜 제4기만

모호함의 뜻은 "시점에 올렸을 때 자리가 흐려지는가" 다. 지도 시점은 5 Myr 간격이고 산지는 ±2.5 Myr 창과 겹치면 오른다. 제4기는
통째로 2.58 Myr — 창 하나보다 짧다. "Pleistocene" 으로만 적힌 기록도 0 Ma 지도의 창 안에 온전히 든다. 중생대의 "Late Triassic"
(36 Myr)이 일곱 시점에 걸쳐 흐려지는 것과 다르다. 신생대의 다른 세(Pliocene 2.7, Miocene 17.7 Myr …)는 연구자의 결정대로 둔다.

## 3. 어떻게

- `intervals.types_from` — PBDB 이름표를 등급으로 옮길 때, 등급이 모호한 쪽(세·아세·기 …)이라도 **바닥 나이가 제4기의 바닥(2.58 Ma)
  이하**이면 `quaternary` 라는 등급으로 바꾼다. `quaternary` 는 모호한 등급 목록에 없으니 나머지 규칙(`is_vague`·`vague_names`)은
  그대로 돈다. 뷰어의 분류군 찾기도 index.json 의 `vague_intervals` 로 같은 규칙을 받는다
- 제4기 바닥은 층서표(timescale.py)에서 읽는다 — 경계를 두 곳에 적지 않는다
- 같은 이름이 두 등급으로 있으면(Holocene 은 PBDB 에 세이자 절) 모호하지 않은 쪽을 둔다
- 이번 이름표에서 바뀐 것: Quaternary · Holocene · Pleistocene · Middle Pleistocene · Early Pleistocene · Tarantian · Ionian
  (Late Pleistocene 은 PBDB 에 절 등급으로도 있어 전부터 정해진 기록이었다)

화석 파일의 `precise` 칸이 가공할 때 굳으므로 **가공물을 다시 만들어야** 바뀐다(`build --no-relief`).
