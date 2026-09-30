# Wegener's Dream (베게너의 꿈) — 고지리 화석 지도

시대별 고지리 지도 위에 그 시대의 화석 기록을 올려 보는 2D 지도 뷰어.
현생누대(0–540 Ma)를 5 Myr 간격 109 시점으로 넘겨 본다. 운영: **http://paleolab/WegenersDream/**
(연구소 망 안, `172.16.116.98`).

- 층서표(대·기·세·절)로 시점을 고르고, 밀대로 넘기거나 차례로 본다
- 산지를 퇴적기원(해양·육상)·퇴적 환경·연대 범위·국가로 거르고, 점을 퇴적기원 또는 시대 색으로 칠한다
- 분류군을 찾으면(PBDB 에 바로 묻는다) 그 시점의 산출 산지·산출 시대 분포·같은 시대의 다른 산지를 보인다
- 지표 기온, 지금 국경을 그때 자리로 돌린 선, 화석으로 고친 해안선, 경위선을 겹친다
- 투영은 정거원통·몰바이데. 몰바이데에서는 지구를 끌어 가운데 경선을 돌린다
- 한국어·English. 시점·투영·가운데 경선·언어는 주소(`#age=250&proj=moll&lon=-65&lang=en`)로 나눈다
- 지금 보는 지도를 PNG 로 내려받는다 — 밑 띠에 시점·층서·거르기·출처가 적힌다

| 겹 | 자료 | 조건 |
|---|---|---|
| 배경(고도·음영) | PALEOMAP PaleoDEM, Scotese & Wright 2018 | CC BY 4.0 |
| 해안선 | PaleoCoastlines v7.1, Kocsis & Scotese 2021 | CC BY 4.0 |
| 화석 점 | Paleobiology Database 채집지, PALEOMAP 고좌표(`pgm=scotese`) | CC BY 4.0 |
| 지표 기온 | Scotese et al. 2021, HadCM3L 모의를 대리 자료에 맞춘 것 | CC BY 4.0 |
| 국경선 | Natural Earth 1:50m 현재 국경을 PALEOMAP 판으로 돌린 것 | 퍼블릭 도메인 |

자료가 모두 **PALEOMAP 판 모델 틀**이라 서로 맞는다. PBDB 기본 모델(`gplates`)을
쓰면 점이 배경과 수 도씩 어긋난다 — [devlog 001](devlog/20260929_001_시작.md).

## 구조

```
pipeline/     원본 받기·가공 → data/derived/ (시점별 배경 WebP — 정거원통·몰바이데, 해안선·화석·국경 JSON,
              기온 PNG, index.json)
web/          Django 뷰어. 파이프라인이 만든 파일만 읽는다. DB 없음. 화면 문구는 viewer/static/viewer/i18n.js
deploy/       Docker·nginx(/WegenersDream/ 서브경로)·운영 compose. GSM 과 같은 갈래
sources/      원본 매니페스트(주소·SHA-256·인용·이용 조건)
devlog/       왜 그렇게 했는지 — 색인은 devlog/README.md
docs/         정하기 전의 검토(예: DB 전환)
```

## 로컬 실행

```bash
python -m venv .venv
.venv/bin/pip install -r requirements.txt        # Windows: .venv\Scripts\pip …

# 1) 원본 받기(약 440 MB, 풀면 3.2 GB)와 가공(약 10 분, 배경 굽기 포함) — 처음 한 번
.venv/bin/python -m pipeline all
#    PBDB 만 새로 받아 다시 가공: fetch --refresh-pbdb 다음 build --no-relief(30 초 남짓)

# 2) 뷰어
WEGENER_DEBUG=1 .venv/bin/python web/manage.py runserver    # PowerShell: $env:WEGENER_DEBUG = "1"
```

http://127.0.0.1:8000/ 에서 본다. 가공에는 pygplates 가 든다(`requirements-pipeline.txt`). 웹 이미지에는
파이프라인 의존성을 넣지 않는다(`requirements-web.txt`).

## 시험

```bash
WEGENER_SECRET_KEY=test .venv/bin/python web/manage.py test viewer
.venv/bin/python -m unittest discover -s pipeline/tests -t .
```

CI(`.github/workflows/test.yml`)가 PR·push 마다 둘 다 돌리고 이미지를 굽는다.

## 작업 방식

각자 자기 계정에서 `feature/<기능 이름>` 브랜치로 작업하고 끝나면 PR 을 만든다. 병합은 사람이 정한다.
판을 올린 PR 이 병합되면 CHANGELOG 로 GitHub 릴리스를 만들고, 릴리스 태그마다 CI 가 Docker Hub
(`koprifossillab/wegenersdream:<태그>`)에 이미지를 올린다. 자세한 규약은 [CLAUDE.md](CLAUDE.md),
지금 상태는 [HANDOFF.md](HANDOFF.md), 할 일은 [TODOs.md](TODOs.md), 판마다 바뀐 것은 [CHANGELOG.md](CHANGELOG.md).

## 운영 (paleoserver)

연구소 서버의 nginx 가 `/WegenersDream/` 를 `127.0.0.1:8095` 컨테이너로 넘긴다
([deploy/nginx/WegenersDream-subpath.conf](deploy/nginx/WegenersDream-subpath.conf)). 운영 compose 는
[deploy/srv/docker-compose.yml](deploy/srv/docker-compose.yml) 을 `/srv/WegenersDream/` 에 둔 것이고,
자료는 `/srv/WegenersDream/data/`(읽기 전용 마운트), 화면에서 고친 명칭·비밀키는 `/srv/WegenersDream/state/` 다.

```bash
# 이미지: 서버에서 굽거나, 릴리스된 판을 Docker Hub 에서 받는다
WEGENER_TAG=v0.16.1 docker compose -f deploy/docker-compose.yml build web
#   또는: cd /srv/WegenersDream && WEGENER_TAG=v0.16.1 docker compose pull

# 가공물이 바뀌었으면 — index.json 을 맨 나중에 바꾼다(컨테이너가 없는 파일을 가리키지 않게)
rsync -a --exclude index.json data/derived/ /srv/WegenersDream/data/
rsync -a data/derived/index.json /srv/WegenersDream/data/index.json

cd /srv/WegenersDream && WEGENER_TAG=v0.16.1 docker compose up -d web
deploy/host/smoke.sh http://172.16.116.98/WegenersDream/
```

## 인용

화면의 ⚙ 설정 · 자료 창과 `index.json` 의 `sources` 에 다섯 자료의 인용이 있다. 그림을 쓸 때
자료를 모두 밝힌다. PBDB 는 채집지마다 원 문헌이 따로 있다.
