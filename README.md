# 베게너의 꿈 (Wegener's Dream) — 고지리 화석 지도

시대별 고지리 지도 위에 그 시대의 화석 기록을 올려 보는 2D 지도 뷰어.
현생누대(0–540 Ma)를 5 Myr 간격 109 시점으로 넘겨 본다.

| 겹 | 자료 | 조건 |
|---|---|---|
| 배경(고도·음영) | PALEOMAP PaleoDEM, Scotese & Wright 2018 | CC BY 4.0 |
| 해안선 | PaleoCoastlines v7.1, Kocsis & Scotese 2021 | CC BY 4.0 |
| 화석 점 | Paleobiology Database 채집지, PALEOMAP 고좌표(`pgm=scotese`) | CC BY 4.0 |
| 국경선 | Natural Earth 1:50m 현재 국경을 PALEOMAP 판으로 돌린 것 | 퍼블릭 도메인 |

세 자료가 모두 **PALEOMAP 판 모델 틀**이라 서로 맞는다. PBDB 기본 모델(`gplates`)을
쓰면 점이 배경과 수 도씩 어긋난다 — [devlog 001](devlog/20260929_001_시작.md).

## 구조

```
pipeline/     원본 받기·가공 → data/derived/ (시점별 배경 WebP, 해안선·화석 JSON, index.json)
web/          Django 뷰어. 파이프라인이 만든 파일만 읽는다. DB 없음
deploy/       Docker·nginx(/WegenersDream/ 서브경로)·배포 스크립트. GSM 과 같은 갈래
sources/      원본 매니페스트(주소·SHA-256·인용·이용 조건)
devlog/       왜 그렇게 했는지
```

## 로컬 실행 (Windows)

```powershell
python -m venv .venv
.venv\Scripts\pip install -r requirements.txt

# 1) 원본 받기(약 210 MB)와 가공 — 처음 한 번
.venv\Scripts\python -m pipeline all

# 2) 뷰어
$env:WEGENER_DEBUG = "1"
.venv\Scripts\python web\manage.py runserver
```

http://127.0.0.1:8000/ 에서 본다. Linux 는 `.venv/bin/…` 로 바꾼다.

## 시험

```powershell
$env:WEGENER_SECRET_KEY = "test"; .venv\Scripts\python web\manage.py test viewer
.venv\Scripts\python -m unittest discover -s pipeline/tests -t .
```

## 운영 (paleoserver)

연구소 서버의 nginx 가 `/WegenersDream/` 를 `127.0.0.1:8095` 컨테이너로 넘긴다.
자료는 `/srv/WegenersDream/data/` 에 두고 읽기 전용으로 마운트한다. 절차는
[deploy/nginx/WegenersDream-subpath.conf](deploy/nginx/WegenersDream-subpath.conf),
[deploy/srv/docker-compose.yml](deploy/srv/docker-compose.yml),
[deploy/host/deploy.sh](deploy/host/deploy.sh).

## 인용

화면의 "자료" 칸과 `index.json` 의 `sources` 에 세 자료의 인용이 있다. 그림을 쓸 때
세 자료를 모두 밝힌다. PBDB 는 채집지마다 원 문헌이 따로 있다.
