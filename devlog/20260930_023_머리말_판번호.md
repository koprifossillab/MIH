# 023 — 머리말에 판 번호를

2026-09-30 · `work/20260930-koprifossillab`

## 1. 왜

연구자: 제목 Wegener's Dream 뒤에 판 번호를 넣어 달라. 0.11.0 을 paleoserver 에 처음 올리고 같은 날 0.11.1 을
다시 올렸다 — 브라우저가 옛 map.js 를 들고 있는지, 운영이 어느 판인지 화면에서 바로 보이는 편이 낫다.
판 번호는 지금도 패널 맨 아래(`Wegener's Dream 0.11.1 · 자료 …`)와 `/healthz` 에 있지만 스크롤해야 보인다.

## 2. 어떻게

- 머리말 `<strong>Wegener's Dream</strong>` 뒤에 `v{{ version }}` — 값은 `wegenerweb/version.py` 한 곳에서
  온다(`settings.WEGENER_VERSION`). 템플릿에 숫자를 적지 않는다
- 12 px·흐린 색(`--muted`)으로 작게 — 이름(CLAUDE.md "이름": 영문 굵게, 한국어 옆에 작게)보다 앞에 나서지 않게.
  순서는 영문 이름 · 판 · 한국어 이름
- 패널 아래의 판 표기는 자료 날짜와 함께 있어 그대로 둔다
