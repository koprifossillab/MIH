# tupandactyl 026 — 같은 이름의 분류군(동명)을 따로 찾는다

2026-10-01 · `feature/homonyms`

## 1. 무엇을 바랐나

연구자: "water bear (tardigrada)와 ground sloth (tardigrada)처럼 분류군 명칭이 중복되는 것들이 있어. 이것들은 검색 시에 별개로 띄우는 기능이
필요할 것 같아."

## 2. PBDB 에서

PBDB 에 Tardigrada 는 둘이다 — 완보동물문(orig_no 67137, 산출 6)과 나무늘보 무리(Pilosa 아래, 57074, 산출 1,673). **이름으로 물으면
(`base_name=Tardigrada`) 나무늘보 쪽만 온다.** `taxa/list?name=` 도 하나만 주고, `match_name=` 이 둘 다(이름표 여럿, orig_no 로 묶인다)
준다. 번호로 물으면(`base_id=txn:67137`) 완보동물만. Eutardigrada 도 동명이다(완보동물의 목, 나무늘보의 무리).

## 3. 어떻게

- **"이름#번호"** — 동명에서 고른 분류군은 `Tardigrada#67137` 로 들고 다닌다. PBDB 에 묻는 곳(찾기·분포·종합 보기·팝업 산출·고위도·계급)은
  모두 `baseParam`/`singleParam` 을 거쳐 번호가 있으면 `base_id`·`id` 로 묻는다. 화면에는 이름만(`plainName`), 내려받기의 분류군 칸에는
  `Tardigrada [txn:67137]`. state 를 바꾸지 않고 문자열 하나로 다녀 비교 분류군 B 에도 그대로 된다
- **후보** — 같은 이름이 산출 수가 다르게 둘 이상 오면(taxa/auto 는 orig_no 를 주지 않는다) `match_name` 으로 물어 분류군마다 한 줄,
  "같은 이름" 딱지와 상위 분류(문 · 강 · 목). 대표 이름표는 PBDB 가 먼저 주는 것(지금 쓰는 계급)
- **Enter** — 친 이름이 동명이면 바로 찾지 않고 후보로 띄워 고르게 한다. 동명인지 알려고 찾을 때마다 `match_name` 을 한 번 더 묻는다
  (이름마다 기억)
- **비교 분류군 B** — 동명이면 분류군마다 단추를 띄워 고르게
- **딱지** — 고른 분류군 옆에 상위 분류 한 마디(Panarthropoda·Xenarthra), 커서를 대면 계통
- 팝업의 산출 이름(015)은 채택명이라 번호 없이 이름으로 찾는다 — 동명이 걸리면 후보에서 다시 고른다
