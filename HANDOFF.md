# HANDOFF — 2026-09-29 현재 상태

이어서 작업할 사람(또는 다음 세션)을 위한 인수 문서. **무엇이 돌아가고 있고, 무엇이 반쯤 되어 있고,
어디에 함정이 있는지**를 적는다. **지난 일은 여기 안 남긴다** — 그것은 `devlog/` 의 몫이고, 여기는
**지금**만 말한다.

**브랜치** `main` = `0.4.0` · **`work/20260929-koprifossillab` = `0.5.0` 이 병합을 기다린다**
(고기후·점 반투명 004, 국가 범위로 확대 005, 과 이하 분류군 커서 목록 006). 병합은 사람이 정한다.
**아직 어디에도 배포하지 않았다** — 연구소 서버(paleoserver)에 올리는 일은 TODOs 첫 줄이다.

## 1. 한 줄 요약

PALEOMAP 고지리(PaleoDEM 배경·PaleoCoastlines 해안선) 위에 PBDB 채집지를 시점(0~540 Ma, 109 장)마다
올리는 2D 뷰어. 층서표(한글판 2023/04 이름·ICS 2024/12 경계)로 시점을 고르고, 퇴적기원·국가·분류군으로
거르고, 지표 기온(Scotese 2021)과 지금 국경을 그때 자리로 돌린 선을 겹친다.

## 2. 지금 돌아가는 것

### 뷰어 — Django 5.2, DB 없음 (`web/`)

- 화면 하나(`/`), 가공물 내주기(`/data/…` — `.json`·`.webp`·`.png` 만), 상태(`/healthz`),
  명칭 덮어쓰기(`/labels` GET·POST, 003·0.3.0)
- 지도는 Leaflet 1.9.4(저장소에 담음), EPSG:4326. 배경은 2048·4096 두 벌을 확대 정도로 고른다(002)
- 브라우저가 PBDB 를 곧장 부른다(CORS). 무엇을 부르는지는 CLAUDE.md "PBDB 에 바로 묻는 것"
- 개발: `MIH_DEBUG=1` 로 `web/manage.py runserver`. 명칭 고치기는 개발에서 열쇠 없이 열린다

### 파이프라인 (`pipeline/`, `python -m pipeline fetch|build|all`)

| 단계 | 자료 | 가공물 (`data/derived/`) |
|---|---|---|
| 배경 | PaleoDEM 6 분 격자(Zenodo 5460860) | `relief/{2048,4096}/*.webp` — 6 분쯤 걸린다 |
| 해안선 | PaleoCoastlines v7.1(Zenodo 4297693) | `coastlines/*.json` |
| 화석 | PBDB 채집지 전체(`pgm=scotese`, `show=loc,…`) | `fossils/*.json` (국가 코드 포함) |
| 국경 | Natural Earth 50m + PaleoCoastlines 안의 PALEOMAP 모델, pygplates | `countries/*.json` (41 MB) |
| 고기후 | Scotese 2021 지표 기온(Zenodo 8238875) | `climate/*.png` (회색조, 0.7 MB) |
| 목록 | 층서표·환경 나무·국가 목록·출처 | `index.json` |

`build --no-relief` 는 배경을 다시 그리지 않는다(18 초). 원본은 `data/sources/`, 매니페스트는 `sources/*.json`.
Zenodo 것은 SHA-256 으로 고정, PBDB·Natural Earth 는 받은 날의 값을 `receipt.json` 에 남긴다.

**지금 로컬 가공물은 2026-09-29 PBDB(채집지 278,398)로 만든 것이다.**

### 시험

`python -m unittest discover -s pipeline/tests -t .`(18) · `MIH_SECRET_KEY=x web/manage.py test viewer`(13).
CI(`.github/workflows/test.yml`)가 둘 다 돌리고, `v*` 태그를 밀면 이미지를 굽는다(Docker Hub 비밀값이 아직 없다).

## 3. 지금 조심할 것

### 3.1 화석 좌표와 국경·배경은 판본이 조금 다르다

화석 고좌표는 PBDB 가 Scotese 2021 판으로 계산한 것이고, 국경·해안선은 PaleoCoastlines 안의 v19o 판,
배경은 2018 PaleoDEM 이다. 모두 PALEOMAP 계열이지만 1° 안팎 어긋날 수 있다(001·003). **다른 판 모델
(Merdith 등)의 자료를 섞지 않는다** — CLAUDE.md "판 모델을 하나로".

### 3.2 명칭 덮어쓰기와 기본 이름

환경 이름의 기본은 `pipeline/environments.py`, 화면에서 고친 것은 `<STATE_DIR>/labels.json` 의 덮어쓰기다.
0.4.0 에서 연구자가 고친 이름을 기본으로 옮기고 표를 비웠다(003). 옮기기 전 표는
`data/state/labels.before-0.4.json`(로컬, 커밋 안 함). 운영에서는 `MIH_EDITOR_KEY` 가 없으면 고치기가 닫힌다.

### 3.3 개발 서버의 템플릿 캐시

`runserver --noreload` 로 띄우면 템플릿을 고쳐도 안 바뀐다. 자동 재시작으로 띄운다. 정적 파일 주소에는
`?v=<판>` 이 붙어, 판을 올리지 않으면 브라우저가 옛 map.js 를 쓸 수 있다.

### 3.4 Windows 에서의 git

작업 장비가 Windows 다. `.gitattributes` 가 셸·Dockerfile 을 LF 로 두고, 로컬은 `core.eol=lf` 다.
셸 스크립트는 실행 비트(`git update-index --chmod=+x`)를 붙여 커밋했다. PowerShell 에서 파일을
`Get-Content`/`Set-Content` 로 고치면 한글이 깨진다(한 번 깨뜨렸다) — 편집기로 고친다.

### 3.5 git 이름·이메일은 임시다

지금 커밋은 `koprifossillab <koprifossillab@gmail.com>` 으로 올라간다. 연구자가 나중에 자기 계정으로
바꿀 예정이다 — DiaRUGA CLAUDE.md "새 작업자 붙이기" 를 따른다.

## 4. 어디까지 왔나

| 판 | 무엇 | devlog |
|---|---|---|
| 0.1.0 | 첫 판 — 배경·해안선·채집지, 분류군 찾기 | 001 |
| 0.2.x | 층서표로 고르기, 퇴적 환경 나무, 자동완성, 0.1° 배경 | 002 |
| 0.3.0 | 환경 이름 화면에서 고치기, 원 용어 반투명 | (CHANGELOG) |
| 0.4.0 | 퇴적기원 재분류, 점 색(퇴적기원/시대), 찾기 결과만, 국가·국경선 | 003 |
| 0.5.0 | 고기후, 점 반투명, 국가 확대, 과 이하 커서 목록 — **브랜치에 있다** | 004~006 |
