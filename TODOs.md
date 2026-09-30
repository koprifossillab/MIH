# TODOs

지금 상태와 인수 사항은 [HANDOFF.md](HANDOFF.md), 그때의 판단은 `devlog/`.
**끝난 일은 여기 쌓지 않는다** — 끝나면 지우고 devlog·CHANGELOG 에 남긴다.

## 배포

- [ ] PBDB 를 주기적으로 다시 받는 cron — 서버 `.venv` 로 `fetch --refresh-pbdb` → `build --no-relief` → 임시 폴더에서
      `/srv/WegenersDream/data` 로 바꿔 끼운다. 주기부터 정한다

## 자료

- [ ] **기후 민감 암상 점**(증발암·석탄·빙하 퇴적물·보크사이트 …, Boucot et al. 2013 계열) — 화석 점처럼
      겹칠 수 있다. 디지털 원본과 이용 조건부터 확인한다(004)
- [ ] 300 Ma 무렵 범위가 넓은 육상기원 산지는 시점 계산 좌표가 PBDB 좌표보다 땅에 덜 든다(63.5% 대 79%, 017) —
      판 경계 산지인지 해안선 다각형화 탓인지 본다
- [ ] `D:\Claude\MIH-backup\20260929\` 의 09-29 PBDB 사본을 작업 장비 밖(NAS 또는 paleoserver)으로 옮길지 정한다 —
      가공물은 paleoserver 에 새것(09-30)이 있어 필요 없고, 남은 뜻은 다시 받을 수 없는 그날의 PBDB 사본 하나다.
      운영 `/srv/WegenersDream/state`(명칭 덮어쓰기·비밀키)의 백업도 함께 정한다

## 지구본 2 단계 — 지형 ([wetherilli P01](devlog/20260930_wetherilli_P01_globe_3d.md) §4)

0.19.0 의 지구본은 매끈한 구다. 다음은 PaleoDEM 높이를 세우는 것이고, **가공은 paleoadmin(koprifossillab) 계정의 몫이
낀다** — 원본 `data/sources/paleodem`(6 분 격자)과 pygplates `.venv` 가 그 계정의 저장소 폴더에만 있다.

- [ ] (wetherilli) 파이프라인에 높이 격자 굽기를 더한다 — 시점마다 낮은 해상도 격자(예: 1/4° int16 PNG)와 음영 없는 색
      그림. 뷰어는 Cesium `CustomHeightmapTerrainProvider` 로 읽고 고도 과장 밀대를 단다. 새 가공물이라 `index.json` 에 칸이 는다
- [ ] **(paleoadmin) 그 PR 이 병합되면 가공을 다시 돌린다** — `python -m pipeline build`(배경 포함) 후 운영
      `/srv/WegenersDream/data` 로 바꿔 끼운다(순서는 README "운영"). 옛 가공물이면 뷰어는 지형 없이 지금처럼 뜨게 짠다
- [ ] (누구든) 실제 GPU 가 있는 PC 에서 지구본을 끌어 돌려 보고 무게·처음 높이·점 크기를 알려 준다 — 0.19.0 은 헤드리스
      (소프트웨어 WebGL)로만 확인했다

## 저장소

- [ ] 라이선스를 정한다(LICENSE 파일이 없다). 쓰는 자료는 CC BY 4.0·퍼블릭 도메인, Leaflet 은 BSD-2
