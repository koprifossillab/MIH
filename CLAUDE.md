# CLAUDE.md

시대별 고지리 지도(PALEOMAP) 위에 PBDB 화석 채집지를 올려 보는 2D 지도 뷰어.
문서는 한국어로 쓴다 — 커밋 메시지, devlog, 주석 모두.

연구소 서버(paleoserver, 172.16.116.98)에 **GSM 과 같은 갈래로** 얹는다 —
저장소·이미지·`/srv/MIH`·nginx 서브경로(`/MIH/`)가 따로다. phyloserver 의 앱이 아니다.

## 이름

저장소·URL(`/MIH/`)·환경변수(`MIH_*`)는 `MIH`. 기술이 소문자를 강제하는 자리만
`mih` — 파이썬 패키지(`mihweb`), Docker 이미지(`koprifossillab/mih`).
약자의 풀이와 한국어 이름은 아직 정하지 않았다. 정해지면 화면 제목과 README 첫 줄에 적는다.

## 판 모델을 하나로

**배경·해안선·화석 좌표는 모두 PALEOMAP 틀이어야 한다.** 이것이 이 뷰어의 첫 규칙이다.

- PBDB 는 언제나 `pgm=scotese` 로 묻는다. 파이프라인도, 화면의 분류군 찾기도
- PaleoCoastlines 는 이미 복원 좌표라 회전하지 않는다
- 다른 판 모델(Merdith, Müller 등)의 자료를 더할 때는 그 모델로 화석을 다시 옮겨야
  한다. 섞지 않는다

## 화석을 시점에 나누는 규칙

`pipeline/common.py` 와 `web/viewer/static/viewer/map.js` 가 **같은 값을 든다** —
한쪽을 고치면 다른 쪽도 고친다.

- 연대 범위(min_ma~max_ma)가 시점 ±2.5 Myr 창과 **겹친다** (`WINDOW_MA`). 한 채집지가 여러 시점에 오른다
- 연대 범위가 20 Myr 이하 (`MAX_SPAN_MA`)
- **중간값 규칙으로 돌아가지 않는다** — 층서 단계로 매긴 연대의 중간값이 몰려 빈 시점이 생긴다(devlog 001)
- 바다·뭍 환경 목록은 EarthThruTime3D(MIT)의 것. 해안·석호·하구는 어느 쪽으로도 밀지 않는다

## 층서표와 퇴적 환경 — 한 곳에만 적는다

- 층서표는 `pipeline/timescale.py`. **이름은 한글판 v2023/04, 경계 나이는 ICS v2024/12**
  (연구자가 정한 것 — devlog 002). 판을 올릴 때 경계는 2024 이후 판과, 이름은 한글판과 대조한다
- 퇴적 환경 나무는 `pipeline/environments.py`. 원 용어의 한글은 이 저장소의 풀이다
- 둘 다 index.json 으로 뷰어에 간다. **map.js 에 층서 이름·경계·환경 목록을 다시 적지 않는다**

## 자료의 흐름

```
sources/*.json ──fetch──▶ data/sources/ ──build──▶ data/derived/ ──▶ 뷰어(/data/…)
 (주소·SHA-256)            (원본, 커밋 안 함)       (가공물, 커밋 안 함)
```

- Zenodo 두 압축본은 매니페스트의 SHA-256 과 맞아야만 쓴다
- PBDB 는 계속 자라서 고정하지 않고, 받은 날의 값을 `data/sources/pbdb/receipt.json` 에 남긴다
- 뷰어는 파이프라인을 import 하지 않는다. 웹 이미지에 numpy 등이 들어가지 않게 하려는 것이다
- 뷰어가 내주는 것은 `.json`·`.webp`·`.png` 뿐이다(`views.SERVED`)

## PBDB 에 바로 묻는 것

브라우저가 PBDB API 를 곧장 부른다(CORS `*`). 둘뿐이다 — 채집지 산출 목록, 분류군 찾기.
서버는 PBDB 를 부르지 않는다. 사내망에서 PBDB 가 막히는 일이 생기면 그때 GSM 처럼
서버에 문(`viewer/pbdb.py`) 하나를 두고 중계한다.

## 협업

phyloserver 규약을 따른다 — 코드는 `work/<YYYYMMDD>-<계정>` 브랜치, 문서만 고치는
커밋은 `main` 에 바로. 커밋은 conventional commits(feat, fix, chore, docs).
작업 전에 `git pull --rebase`. 고친 파일을 지정해 커밋한다(`git add -A` 금지).

## devlog

`devlog/YYYYMMDD_NNN_slug.md`. **무엇을 했는지가 아니라 왜 그렇게 했는지를 적는다.**
