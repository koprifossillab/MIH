# 032 — 매주 월요일 새벽: 운영 자료 백업과 PBDB 갱신

2026-09-30 · `feature/weekly-refresh` · koprifossillab

## 1. 왜

TODOs "PBDB 를 주기적으로 다시 받는 cron — 주기부터 정한다" 와 "운영 `state` 백업도 함께 정한다". 연구자가 정한 것:
**일주일에 한 번, 월요일 새벽.** 코드를 뺀 미리 구운 자료의 백업도 그때 함께, `/data` 밑에 `<이름>.yyyymmdd.tar.gz` 로.

## 2. 무엇을 했나 — `deploy/host/weekly_refresh.sh`

순서: **백업 → PBDB 받기(`fetch --refresh-pbdb`) → 가공(`build --no-relief`) → 점검 → 운영에 옮기기**(`index.json` 맨 나중,
`smoke.sh`). paleoadmin 의 crontab 에 `30 2 * * 1`(월 02:30) — 다른 앱의 새벽 일(03:00·04:00·04:40·05:00·05:10)과 비껴 둔다.
조각은 `deploy/host/crontab.WegenersDream`(ForGIA·DiaRUGA 와 같은 규약).

- **백업**: `/data/WegenersDream/backups/WegenersDream.<YYYYMMDD>.tar.gz` 하나(오늘 140 MB, 9 초).
  - `srv-data/` 운영 가공물 그대로(`/srv/WegenersDream/data` — 배경·지형·해안선·화석·국경·기온·index.json)
  - `pbdb/` 그 가공물을 만든 PBDB 원본 — **PBDB 는 계속 자라 그날의 것을 다시 받을 수 없다.** `--refresh-pbdb` 가 덮어쓰므로
    **받기 전에** 백업한다
  - `state/` 운영 state(명칭 덮어쓰기·비밀키) — TODOs 의 "state 백업" 이 이것으로 닫힌다
  - 코드와 Zenodo 원본(PaleoDEM 등)은 뺀다 — 코드는 git 에, Zenodo 는 매니페스트 SHA-256 으로 고정돼 다시 받는다
- **권한**: 백업에 운영 비밀키가 든다. `/data` 는 누구나 들어오는 디스크(777)라 `umask 027` — 백업 파일 640, 디렉토리 750
  (paleoadmin 그룹까지). 처음 만든 것이 664 였던 것을 시험하다 봤다
- **운영을 지키는 것**: 받기·가공이 실패하거나, 산지 수가 지난번의 95% 밑으로 떨어지거나, 가공물 점검(109 시점, 시점마다
  배경·산지·지형 파일)이 안 맞으면 **운영에 옮기지 않는다** — 지난주 자료가 그대로 돈다. 받기는 임시 파일에 받아 다 받은
  뒤 바꿔 끼우므로(fetch.py) 실패해도 지난 사본이 남는다. 배경·지형은 다시 굽지 않는다
- **이 저장소 폴더가 `main` 이고 깨끗할 때만 가공한다** — paleoadmin 의 작업 폴더가 feature 브랜치에 있을 때 그 파이프라인으로
  운영 자료를 만들지 않게. 그럴 때는 백업만 하고 `fail` 을 남긴다. 결과는 `/data/WegenersDream/logs/last_refresh.json`,
  로그는 `logs/weekly_refresh.log`. `flock` 으로 겹치지 않게
- `--backup-only`, `--no-deploy` 로 나눠 돌릴 수 있다

## 3. 버린 것

- **백업을 여럿으로 나누기**(가공물·PBDB·state 따로) — 한 날의 것이 한 파일에 있어야 되살리기가 쉽다
- **보관 개수 줄이기** — 주 140 MB 남짓, 1 년에 7 GB. `/data` 는 4 TB 넘게 남아 지금은 모두 둔다. 줄여야 하면 그때 나이로 정한다
- **cron 이 `git pull` 하기** — 모르는 사이에 코드가 바뀌어 운영 자료가 달라진다. 코드는 사람이 병합·배포할 때만 바뀐다
- **다른 폴더에 파이프라인 전용 클론** — 원본(3.2 GB)과 `.venv` 를 둘로 둘 까닭이 없다
