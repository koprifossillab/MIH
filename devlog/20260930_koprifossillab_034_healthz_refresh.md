# 034 — /healthz 가 주간 갱신·백업과 지형·PaleoClim 을 본다

2026-09-30 · `feature/healthz-refresh` · koprifossillab

## 1. 왜

연구자: WD 에 /healthz 가 있는데 뭔가 빠져 있다고 하지 않았나. docs/백업.md §6 에 적은 한계 — **`/healthz` 가 백업을 모른다.**
phyloserver 는 `backup_db`·`backup_files`·`backup_offsite` 를 싣고 실패하면 degraded 를 낸다. 여기는 주간 갱신(032)의 결과가
`/data/WegenersDream/logs/last_refresh.json` 에만 있어, 월요일 갱신이 실패해도 `/healthz` 는 `ok` 였다. 배경 그림 말고는 지형(0.21.0)·
PaleoClim(0.26.0) 파일이 빠져도 몰랐다.

## 2. 무엇을 했나

- **주간 스크립트가 결과를 두 곳에 쓴다** — 사람이 보는 `logs/last_refresh.json` 과, **컨테이너가 이미 마운트한**
  `/srv/WegenersDream/state/refresh.json`(임시 파일에 쓰고 바꿔 끼운다). 컨테이너에 `/data` 를 새로 마운트하지 않는다 — state 는 이미
  쓰는 자리다(명칭 덮어쓰기·비밀키)
- **`/healthz` 에 더한 것**: `refresh`(마지막 결과 그대로), `missing_terrain`, `paleoclim`({스냅숏 수, 없는 그림 수}), 그리고
  degraded 일 때 `problems`(까닭 목록). HTTP 는 전처럼 200(자료가 없을 때만 503)
- **degraded 가 되는 때**: 지난 갱신이 `fail`, NAS 백업 `fail`, **8 일 넘게 소식 없음**(cron 이 빠졌다 — 월요일마다 도니 하루 여유),
  목록에 있는데 파일이 없는 배경·지형·PaleoClim
- **설정 전인 것은 문제로 치지 않는다** — `refresh.json` 이 아직 없거나 `recent.json` 이 없으면 `null`. 개발·시험 자료에서도 `ok` 가
  나오고, phyloserver 의 `not configured` 와 같은 뜻이다
- 시험 6 개(결과 없음·최근 ok·실패·NAS 실패·8 일 넘음·지형·PaleoClim 파일)

## 3. 함께 고친 것 — 같은 날의 백업을 덮어썼다

`docs/백업.md` 에 "같은 날 다시 돌리면 그날의 tar 를 덮어쓴다" 고 적어 두었는데, 이것을 시험하다 **내가 밟았다.** 09-30 17:03 의 백업
(갱신 **전** 운영 자료와 그 PBDB 사본 — 09-29 20:37 UTC 에 받은 산지 278,398)을 18:57 의 `--backup-only` 가 로컬·NAS 양쪽에서 덮어써,
**그 PBDB 사본을 잃었다**(다시 받을 수 없다. 다음 사본과 산지 1 곳 차이. 작업 장비의 09-29 백업은 그보다 앞선 날의 것이라 남아 있다).

이제 **이미 있으면 덮어쓰지 않는다** — `WegenersDream.<날짜>.2.tar.gz`, `.3` … (로컬이나 NAS 어느 한쪽에 그 이름이 있으면 다음 번호).

## 4. 버린 것

- **컨테이너에 `/data/WegenersDream/logs` 를 마운트** — 운영 compose 를 고쳐야 하고, 뷰어가 읽는 자리가 하나 는다
- **degraded 를 503 으로** — 지금 `smoke.sh` 와 주간 스크립트의 smoke 가 200 을 본다. 지난주의 실패가 이번 주 배포의 smoke 를 막으면
  고칠 길이 막힌다. 상태는 본문의 `status`·`problems` 로 본다
- **백업 파일의 나이·크기를 `/healthz` 가 직접 재기** — 컨테이너가 `/data` 를 못 본다. 스크립트가 쓴 결과로 충분하다
