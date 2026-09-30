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
