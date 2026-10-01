# tupandactyl 029 — 연구소 밖에서 보는 사이트(GitHub Pages), 1.0.0

2026-10-01 · `feature/static-pages`

## 1. 무엇을 바랐나

연구자: "그렇게 반영한 후에 연구소 밖에서도 볼 수 있는 방법이 있다면 그걸 찾아서 적용해 줘. 그리고 전부 병합한 뒤 v1.0.0으로 반포하자."

## 2. 무엇을 보았나

- paleoserver(172.16.116.98)는 사내망 주소이고 `paleolab` 은 사내 이름이다 — 밖에서 이름도 주소도 없다. 밖으로 나갈 때는 연구소의 공인
  주소(NAT)로 나가지만 들어오는 길은 없다
- 뷰어가 서버에서 하는 일은 셋뿐이다 — 첫 화면(map.html)을 그리고, 미리 구운 자료(/data/…)를 내주고, 명칭 덮어쓰기 표(/labels). PBDB 는
  브라우저가 곧장 부른다(CORS). **곧 고정 사이트로 돌 수 있다**

## 3. 견준 길

| 길 | 연구소 서버 | 계정·비용 | 버린 까닭 |
|---|---|---|---|
| **GitHub Pages 고정 사본** | 열지 않는다 | 저장소 하나(이미 공개), 무료 | — 고른 것 |
| Cloudflare Tunnel 등 터널 | 서버에서 밖으로 상시 연결 | 계정·도메인, 빠른 터널은 주소가 바뀐다 | 사내망 서버를 밖으로 잇는 것이라 연구소 보안 규정을 먼저 거쳐야 한다 |
| 전산실에 공인 주소·포트 | 문을 연다 | 행정 | 오래 걸린다. 할 수는 있다 — 그때는 nginx 가 그대로 받는다 |

## 4. 어떻게

- **`deploy/static_site.py`** — Django 로 첫 화면을 URL 앞머리 `WegenersDream` 으로 한 번 그려 index.html, collectstatic, 자료(뷰어가 내주는
  확장자만), labels(덮어쓰기 표), healthz. 앞머리를 맞춰 그리면 주소 꼴이 Pages 의 프로젝트 주소(`koprifossillab.github.io/WegenersDream/`)와
  그대로 맞아 뷰어 코드를 고치지 않는다. 시험: 구운 폴더를 정적 서버로 띄워 지층·분류군·종합 보기·최근 찾은 것을 운영과 같이 확인
- **자료는 저장소에 넣지 않는다** — 270 MB(압축 135 MB), 매주 바뀐다. 릴리스 `site-data` 에 `wegener-data.tar.gz` 로 붙이고(덮어씀) 워크플로가
  받는다. 릴리스 첨부는 저장소를 받는 사람에게 딸려 가지 않는다
- **`.github/workflows/pages.yml`** — 판 릴리스(v*)마다, 그리고 손으로(workflow_dispatch). 받기 → 굽기 → Pages 배포
- **주간 갱신** — 운영에 옮긴 뒤 자료 사본을 `site-data` 에 올리고 워크플로를 부른다. paleoadmin 의 gh 가 로그인돼 있을 때만, 실패해도 갱신은
  성공(결과에 적는다)
- **켜는 것은 저장소 관리자** — Settings → Pages → Source: "GitHub Actions". 이 계정(Tupandactyl)은 쓰기 권한뿐이라 켤 수 없다

## 5. 자료의 이용 조건

바깥 사이트는 운영과 같은 자료를 공개한다 — PBDB(CC BY 4.0), PaleoDEM·PaleoCoastlines·Scotese 기온(CC BY 4.0), Natural Earth(공유 저작물),
PaleoClim(CC BY-NC-SA 4.0 — 비영리, 같은 조건). 출처는 사이트의 "자료" 칸과 README 에 있다. 영리 목적으로 쓰지 않는 한 문제없다.

## 6. 1.0.0

0.x 에서 쌓은 것 — 시점별 PALEOMAP 지도와 PBDB 산지, 층서표·퇴적 환경, 분류군·나라·지층 찾기와 종합 보기, 지구사 사건 책갈피, 에디아카라기
시점, Scientific·Casual(한글 학명), 분포 분석(다양성·고위도·비교), 내려받기, 주간 갱신·백업 — 이 한 판으로 연구소 안팎에서 쓴다.
