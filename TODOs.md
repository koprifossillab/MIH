# TODOs

지금 상태와 인수 사항은 [HANDOFF.md](HANDOFF.md), 그때의 판단은 `devlog/`.
**끝난 일은 여기 쌓지 않는다** — 끝나면 지우고 devlog·CHANGELOG 에 남긴다.

## 배포

- [ ] **paleoserver 에 올린다** — 이 장비에서는 SSH(22)가 막혀 있어 서버에서 사람이 돌린다.
      clone → `python -m pipeline all`(PBDB·Zenodo 를 받고 6 분쯤) → `/srv/MIH/data` 로 →
      이미지 굽기 → `/srv/MIH/docker-compose.yml` 로 띄우기 → nginx `include snippets/MIH-subpath.conf;`
      → `deploy/host/smoke.sh`. 포트 8095 가 비었는지 먼저 본다
- [ ] 가공 장비에 pygplates 가 필요하다(`requirements-pipeline.txt`)
- [ ] 운영 `.env` 에 `MIH_EDITOR_KEY` 를 정한다(없으면 명칭 고치기가 닫힌다)
- [ ] 첫 화면(`/srv/paleolab/index.html`)에 MIH 카드 — GSM 의 `paleolab_code_card.sh` 를 본뜬다
- [ ] Docker Hub 비밀값(`DOCKERHUB_USERNAME`·`DOCKERHUB_TOKEN`)을 저장소에 넣어야 CI 가 태그에서 이미지를 민다

## 자료

- [ ] **기후 민감 암상 점**(증발암·석탄·빙하 퇴적물·보크사이트 …, Boucot et al. 2013 계열) — 화석 점처럼
      겹칠 수 있다. 디지털 원본과 이용 조건부터 확인한다(004)
- [ ] 화석 좌표를 PBDB 고좌표 대신 PALEOMAP 회전 파일로 **지도 시점에** 직접 돌린다 — 국경과 같은 v19o
      모델로 맞추면 판본 차이(1° 안팎)가 사라진다(001·003). pygplates 가 이미 있다
- [ ] PBDB 를 언제 다시 받을지(지금은 2026-09-29) — 운영에서 주기를 정한다

## 화면

- [ ] 영어판
- [ ] 몰바이데 투영
- [ ] 이름(MIH)의 풀이와 한국어 이름 — 정해지면 화면 제목·README 첫 줄
- [ ] 좁은 창(폭 760 px 아래)에서 패널이 지도 아래로 가 스크롤이 길다 — 접는 패널을 생각한다

## 저장소

- [ ] 라이선스를 정한다(LICENSE 파일이 없다). 쓰는 자료는 CC BY 4.0·퍼블릭 도메인, Leaflet 은 BSD-2
