# HANDOFF — 2026-09-30 현재 상태 · 베게너의 꿈 (Wegener's Dream)

이어서 작업할 사람(또는 다음 세션)을 위한 인수 문서. **무엇이 돌아가고 있고, 무엇이 반쯤 되어 있고,
어디에 함정이 있는지**를 적는다. **지난 일은 여기 안 남긴다** — 그것은 `devlog/` 의 몫이고, 여기는
**지금**만 말한다.

**이름**: 09-30 에 `MIH` → **베게너의 꿈 (Wegener's Dream)**. 저장소·URL `/WegenersDream/`, 환경변수 `WEGENER_*`,
패키지 `wegenerweb` (020, CLAUDE.md "이름"). **로컬 실행·시험의 `MIH_*` 환경변수는 이제 안 먹는다.**

**저장소** https://github.com/koprifossillab/WegenersDream (09-30 에 `MIH` 에서 바꿈 — 옛 주소는 GitHub 가 넘겨 준다).
**브랜치** `main` = `0.15.1` (09-30, PR #1~#9) · 병합을 기다리는 브랜치는 없다. 0.11.1 부터 GitHub PR 로 병합하고,
판을 올리면 CHANGELOG 로 GitHub 릴리스를 만든다(v0.11.2 부터).
다음 코드 작업은 그날의 새 브랜치(`work/<YYYYMMDD>-<계정>`)를 `main` 에서 만든다 — 여러 날 걸칠 기능 하나는
`feature/<이름>`(연구자, 024). 0.9.0 부터 모호한 연대 산지를 세모로(016),
화석 좌표를 시점마다 v19o 로 계산(017), 0.10.0 부터 연대 범위 막대(018). **옛 가공물이면 다시 만든다** —
`python -m pipeline fetch`(PBDB 시대 이름 목록 `intervals.json` 이 새로 필요하다) 다음 `build --no-relief`.
화석 파일에 `precise`·`rotated` 칸이 있어야 한다. 0.12.0 의 몰바이데(024)는 배경을 다시 구워야 한다 —
`build`(배경 포함, 7 분 남짓). `relief_files` 에 `moll-*` 가 없으면 투영 고르기가 숨는다.
**배포**: 09-30 에 paleoserver 에 올렸다 — **http://172.16.116.98/WegenersDream/** (`v0.15.1`, 컨테이너
`wegenersdream-web-1`, `127.0.0.1:8095`, nginx `snippets/WegenersDream-subpath.conf`, 첫 화면 카드). 이미지는 그 서버에서
구웠고 Docker Hub 에는 없다 — CI 의 Docker Hub 올리기는 저장소 변수 `DOCKERHUB_PUSH=true` 일 때만 돈다(지금 꺼짐). 가공은 서버의 `~/projects/WegenersDream/.venv`(pygplates 포함)로
`python -m pipeline all` 을 돌려 `data/derived` 를 `/srv/WegenersDream/data` 로 복사했다. 운영 `.env` 에
`WEGENER_EDITOR_KEY` 를 넣어 명칭 고치기가 열쇠로 열린다(비밀키는 비워 두어 `state/secret_key` 를 쓴다).

**git 밖의 백업**: `D:\Claude\MIH-backup\20260929\`(작업 장비) — 이날의 PBDB 사본·`data/state`(16 MB)와
가공물 전체(69 MB), 되살리는 법은 그 안의 README. PBDB 사본은 다시 받을 수 없어 둔 것이다. 같은 디스크라
장비를 잃으면 함께 잃는다 — NAS 나 paleoserver 로 옮기는 일은 TODOs. 09-30 작업(이름 바꾸기)은 자료를 건드리지
않아 이 백업이 아직 최신이다. 백업 파일 이름의 `mih_` 는 옛 이름 그대로다.

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
- 개발: `WEGENER_DEBUG=1` 로 `web/manage.py runserver`. 명칭 고치기는 개발에서 열쇠 없이 열린다

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

`python -m unittest discover -s pipeline/tests -t .`(26 — 판 모델 시험 3 개는 원본이 있을 때만) · `WEGENER_SECRET_KEY=x web/manage.py test viewer`(13).
CI(`.github/workflows/test.yml`)가 둘 다 돌리고, `v*` 태그를 밀면 이미지를 굽는다(Docker Hub 비밀값이 아직 없다).

## 3. 지금 조심할 것

### 3.1 화석 좌표와 국경·배경은 판본이 조금 다르다

0.9.0 부터 화석 좌표·국경·해안선은 PaleoCoastlines 안의 같은 v19o 판 모델이다(017). 다만 그 나이에 판이 없는
404 건(0.07%)과 **분류군 찾기에서 산지 파일에 없는 산지**는 PBDB 고좌표(Scotese 2021 판, 연대 중간값)라 1° 안팎
어긋날 수 있다 — 팝업에 출처가 적힌다. 배경은 2018 PaleoDEM 이다. **다른 판 모델(Merdith 등)의 자료를
섞지 않는다** — CLAUDE.md "판 모델을 하나로".

### 3.2 명칭 덮어쓰기와 기본 이름

환경 이름의 기본은 `pipeline/environments.py`, 화면에서 고친 것은 `<STATE_DIR>/labels.json` 의 덮어쓰기다.
0.4.0 에서 연구자가 고친 이름을 기본으로 옮기고 표를 비웠다(003). 옮기기 전 표는
`data/state/labels.before-0.4.json`(로컬, 커밋 안 함). 운영에서는 `WEGENER_EDITOR_KEY` 가 없으면 고치기가 닫힌다.

### 3.3 개발 서버의 템플릿 캐시

`runserver --noreload` 로 띄우면 템플릿을 고쳐도 안 바뀐다. 자동 재시작으로 띄운다. 정적 파일 주소에는
`?v=<판>` 이 붙어, 판을 올리지 않으면 브라우저가 옛 map.js 를 쓸 수 있다.

### 3.4 Windows 에서의 git

작업 장비가 Windows 다. `.gitattributes` 가 셸·Dockerfile 을 LF 로 두고, 로컬은 `core.eol=lf` 다.
셸 스크립트는 실행 비트(`git update-index --chmod=+x`)를 붙여 커밋했다. PowerShell 에서 파일을
`Get-Content`/`Set-Content` 로 고치면 한글이 깨진다(한 번 깨뜨렸다) — 편집기로 고친다.

### 3.5 git 이름·이메일은 장비 계정의 것을 쓴다

저장소에 `user.name`·`user.email` 을 따로 두지 않는다 — 각 Linux 계정의 전역 git 설정을 그대로 쓴다(09-30 연구자).
Linux 계정과 GitHub 계정의 대응(devlog 글쓴이도 이것)은 CLAUDE.md "devlog" — paleoadmin → `koprifossillab`,
jikhanjung → `jikhanjung`, sclee → `wetherilli`, jschoi → `Tupandactyl`(아직 저장소 협업자가 아니다).

paleoserver `paleoadmin` 은 09-30 저녁부터 git·gh·push 가 모두 koprifossillab 이다. push 는 전용 SSH 키
(`~/.ssh/id_ed25519_koprifossillab`)를 `~/.ssh/config` 의 `Host github-koprifossillab` 으로 쓰고, 이 저장소의 원격이
`git@github-koprifossillab:koprifossillab/WegenersDream.git` 다. 기본 `github.com` 도 이 키(koprifossillab)다 —
옛 키(jikhanjung)는 `Host github-jikhanjung` 으로 남겼다. **jikhanjung 소유 저장소(SSH 원격)는 koprifossillab 으로
push·비공개 fetch 가 안 된다** — 손볼 때 원격을 `git@github-jikhanjung:…` 으로 바꾼다. 09-30 낮의 커밋·PR #1~#9·릴리스는 `Jikhan Jung`·jikhanjung 으로 올라갔다.

## 4. 어디까지 왔나

| 판 | 무엇 | devlog |
|---|---|---|
| 0.1.0 | 첫 판 — 배경·해안선·채집지, 분류군 찾기 | 001 |
| 0.2.x | 층서표로 고르기, 퇴적 환경 나무, 자동완성, 0.1° 배경 | 002 |
| 0.3.0 | 환경 이름 화면에서 고치기, 원 용어 반투명 | (CHANGELOG) |
| 0.4.0 | 퇴적기원 재분류, 점 색(퇴적기원/시대), 찾기 결과만, 국가·국경선 | 003 |
| 0.5.0 | 고기후, 점 반투명, 국가 확대, 과 이하 커서 목록 | 004~006 |
| 0.5.x | 해양기원 점 색 — 에메랄드(0.5.1) → 아쿠아·청록(0.5.2) | 007·008 |
| 0.6.0 | 기온 층 불투명도, 분류군 산출 시대 분포, 산출 시대 차례로 보기 | 009~011 |
| 0.7.0 | 같은 시대 다른 산지(속 이하), 노릭절 채집지 누락·가공 캐시 고침 | 012·013 |
| 0.8.0 | "산지" 로 이름 바꿈, 퇴적기원별 산출 건수, 넓은 연대 고리(015 — 0.9.0 에서 바로잡음) | 014·015 |
| 0.9.0 | 모호한 연대(PBDB 시대 이름 등급) 세모, 화석 좌표 시점별 v19o 계산 | 016·017 |
| 0.10.x | 연대 범위 막대, 점 테두리 흰색 | 018·019 |
| 0.11.x | 이름 Wegener's Dream, paleoserver 배포, 깜박임 고침·CI, 머리말 판 번호 | 020~023 |
| 0.12.0 | 몰바이데 투영(배경은 파이프라인이 굽는다) | 024 |
| 0.13.0 | 몰바이데에서 끌면 가운데 경선이 돈다(배경은 행마다 옮겨 그린다) | 025 |
| 0.14.0 | 패널의 절 접기, 좁은 창에서 패널 통째로 접기 | 026 |
| 0.15.x | 영어판(문구는 `i18n.js`), 몰바이데 테두리 해안선 고침 | 027·028 |
