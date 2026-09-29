# TODOs

지금 상태와 인수 사항은 [HANDOFF.md](HANDOFF.md), 그때의 판단은 `devlog/`.
**끝난 일은 여기 쌓지 않는다** — 끝나면 지우고 devlog·CHANGELOG 에 남긴다.

## 배포

- [ ] 운영 `.env` 에 `WEGENER_EDITOR_KEY` 를 정한다(없으면 명칭 고치기가 닫힌다)
- [ ] PBDB 를 주기적으로 다시 받는 cron — 서버 `.venv` 로 `fetch --refresh-pbdb` → `build --no-relief` → 임시 폴더에서
      `/srv/WegenersDream/data` 로 바꿔 끼운다. 주기부터 정한다
- [ ] Docker Hub 비밀값(`DOCKERHUB_USERNAME`·`DOCKERHUB_TOKEN`)을 저장소에 넣어야 CI 가 태그에서 이미지를 민다

## 자료

- [ ] **기후 민감 암상 점**(증발암·석탄·빙하 퇴적물·보크사이트 …, Boucot et al. 2013 계열) — 화석 점처럼
      겹칠 수 있다. 디지털 원본과 이용 조건부터 확인한다(004)
- [ ] 300 Ma 무렵 범위가 넓은 육상기원 산지는 시점 계산 좌표가 PBDB 좌표보다 땅에 덜 든다(63.5% 대 79%, 017) —
      판 경계 산지인지 해안선 다각형화 탓인지 본다
- [ ] `D:\Claude\MIH-backup\20260929\`(PBDB 사본·가공물, 85 MB)을 작업 장비 밖(NAS 또는 paleoserver)으로 옮긴다 —
      지금은 저장소와 같은 디스크다. 배포 때 가공물 zip 을 그대로 `/srv/WegenersDream/data` 에 풀면 6 분 가공을 건너뛴다

## 화면

- [ ] 영어판
- [ ] 몰바이데 투영
- [ ] 좁은 창(폭 760 px 아래)에서 패널이 지도 아래로 가 스크롤이 길다 — 접는 패널을 생각한다

## 저장소

- [ ] 라이선스를 정한다(LICENSE 파일이 없다). 쓰는 자료는 CC BY 4.0·퍼블릭 도메인, Leaflet 은 BSD-2
