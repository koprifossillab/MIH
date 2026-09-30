#!/bin/bash
# 매주 한 번(월요일 새벽): 지금 운영 자료를 백업하고, PBDB 를 새로 받아 산지를 다시 가공해 운영에 옮긴다
# (koprifossillab 032). paleoadmin 의 crontab 에서 돈다 — deploy/host/crontab.WegenersDream.
#
#   deploy/host/weekly_refresh.sh                 백업 → PBDB 받기 → 가공 → 점검 → 운영에 옮기기
#   deploy/host/weekly_refresh.sh --backup-only   백업만
#   deploy/host/weekly_refresh.sh --no-deploy     백업·받기·가공·점검까지 하고 운영에는 안 옮긴다
#
# 백업: /data/WegenersDream/backups/WegenersDream.<YYYYMMDD>.tar.gz — 코드는 빼고 미리 구운 것만.
#   srv-data/   운영 가공물(/srv/WegenersDream/data — 배경·지형·해안선·화석·국경·기온·index.json)
#   pbdb/       그 가공물을 만든 PBDB 원본(data/sources/pbdb) — PBDB 는 계속 자라 다시 받을 수 없다
#   state/      운영 state(명칭 덮어쓰기) — 비밀키(state/secret_key)는 뺀다. 잃어도 컨테이너가 새로 만들고(열린 화면의
#               CSRF 만 무효), NAS 는 누구나 읽는 공유라 비밀키를 두지 않는다
#   Zenodo 원본(PaleoDEM 등)은 매니페스트의 SHA-256 으로 고정돼 다시 받을 수 있어 넣지 않는다.
#   **받기 전에 백업한다** — --refresh-pbdb 가 지난 PBDB 사본을 덮어쓴다.
# 같은 파일을 NAS(/nfs/temp-share/WegenersDream/backup/)에도 둔다 — DiaRUGA·ForGIA 와 같은 자리 규약. NAS 가 안 붙었거나
# 실패해도 갱신은 한다(결과의 "nas" 에 남는다). NAS 는 hard 마운트라 timeout 으로 감싸고, 옮긴 뒤 sha256 을 대조한다.
#
# 지키는 것: 받기·가공이 실패하거나 산지 수가 지난번의 95% 밑으로 떨어지면 운영에 옮기지 않는다(지난 자료가
# 그대로 돈다). 배경·지형은 다시 굽지 않는다(build --no-relief). 가공은 이 저장소 폴더가 main 이고 깨끗할 때만 한다
# — 다른 브랜치의 파이프라인으로 운영 자료를 만들지 않게. 결과는 logs/last_refresh.json 에 남는다.
set -uo pipefail
# /data 는 누구나 들어오는 디스크다 — 백업은 paleoadmin 그룹까지만 읽게
umask 027

REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SRV=/srv/WegenersDream
HOME_DIR=/data/WegenersDream
BACKUPS=$HOME_DIR/backups
LOGS=$HOME_DIR/logs
NAS_ROOT=/nfs/temp-share
NAS=$NAS_ROOT/WegenersDream/backup
NAS_RESULT=skip
PY=$REPO/.venv/bin/python
DAY=$(date +%Y%m%d)
MODE=${1:-all}

mkdir -p "$BACKUPS" "$LOGS"
chmod 750 "$HOME_DIR" "$BACKUPS" "$LOGS"
exec 9>"$HOME_DIR/.weekly_refresh.lock"
flock -n 9 || { echo "$(date -Is) 이미 돌고 있다 — 건너뜀"; exit 0; }

STEP=start
status() {   # status <ok|fail|skip> <설명>
    printf '{"at": "%s", "result": "%s", "step": "%s", "note": "%s", "backup": "%s", "nas": "%s"}\n' \
        "$(date -Is)" "$1" "$STEP" "$2" "${ARCHIVE:-}" "$NAS_RESULT" > "$LOGS/last_refresh.json"
    echo "$(date -Is) [$1] $STEP — $2"
}
fail() { status fail "$1"; exit 1; }

echo "== $(date -Is) WegenersDream 주간 갱신 ($MODE) =="

# ── 1. 백업 ────────────────────────────────────────────────────────────
STEP=backup
ARCHIVE=$BACKUPS/WegenersDream.$DAY.tar.gz
TMP=$ARCHIVE.part
tar -czf "$TMP" \
    --transform "s,^${SRV#/}/data,srv-data," \
    --transform "s,^${REPO#/}/data/sources/pbdb,pbdb," \
    --transform "s,^${SRV#/}/state,state," \
    --exclude "${SRV#/}/state/secret_key" \
    -C / "${SRV#/}/data" "${REPO#/}/data/sources/pbdb" "${SRV#/}/state" 2>"$LOGS/tar.err" \
    || fail "tar 실패: $(tail -1 "$LOGS/tar.err")"
tar -tzf "$TMP" >/dev/null 2>&1 || fail "만든 백업을 읽을 수 없다"
mv "$TMP" "$ARCHIVE"
echo "백업: $ARCHIVE ($(du -h "$ARCHIVE" | cut -f1))"

# ── 1-1. NAS 에도 — 붙어 있을 때만, timeout 으로, 옮긴 뒤 sha256 대조 ─────────────
STEP=nas
if mountpoint -q "$NAS_ROOT" && timeout 30 mkdir -p "$NAS"; then
    want=$(sha256sum "$ARCHIVE" | cut -d' ' -f1)
    if timeout 900 cp "$ARCHIVE" "$NAS/$(basename "$ARCHIVE").part" \
       && [ "$(timeout 600 sha256sum "$NAS/$(basename "$ARCHIVE").part" | cut -d' ' -f1)" = "$want" ] \
       && timeout 30 mv "$NAS/$(basename "$ARCHIVE").part" "$NAS/$(basename "$ARCHIVE")"; then
        NAS_RESULT=ok; echo "NAS: $NAS/$(basename "$ARCHIVE") (sha256 일치)"
    else
        NAS_RESULT=fail; echo "NAS: 옮기기·대조 실패 — 로컬 백업은 있다"
        timeout 30 rm -f "$NAS/$(basename "$ARCHIVE").part"
    fi
else
    NAS_RESULT=fail; echo "NAS: $NAS_ROOT 가 붙어 있지 않다 — 로컬 백업만"
fi
[ "$MODE" = "--backup-only" ] && { status ok "백업만"; exit 0; }

# ── 2. PBDB 받기·가공 ───────────────────────────────────────────────────
STEP=check-repo
branch=$(git -C "$REPO" rev-parse --abbrev-ref HEAD)
[ "$branch" = "main" ] || fail "저장소가 main 이 아니다($branch) — 가공하지 않는다"
[ -z "$(git -C "$REPO" status --porcelain --untracked-files=no)" ] || fail "저장소에 커밋 안 한 변경이 있다 — 가공하지 않는다"

old=$("$PY" -c "import json;print(json.load(open('$REPO/data/sources/pbdb/receipt.json'))['records'])")

STEP=fetch
(cd "$REPO" && "$PY" -m pipeline fetch --refresh-pbdb) || fail "PBDB 받기 실패 — 지난 사본 그대로"
new=$("$PY" -c "import json;print(json.load(open('$REPO/data/sources/pbdb/receipt.json'))['records'])")

STEP=build
(cd "$REPO" && "$PY" -m pipeline build --no-relief) || fail "가공 실패 — 운영은 지난 자료 그대로"

# ── 3. 점검 ────────────────────────────────────────────────────────────
STEP=verify
[ "$new" -ge $(( old * 95 / 100 )) ] || fail "산지가 크게 줄었다($old → $new) — 운영에 옮기지 않는다"
"$PY" - "$REPO/data/derived" <<'EOF' || fail "가공물 점검 실패"
import json, sys, pathlib
d = pathlib.Path(sys.argv[1]); ix = json.loads((d / "index.json").read_text(encoding="utf-8"))
frames = ix["frames"]
assert len(frames) == 109, f"시점 {len(frames)}"
for f in frames:
    for key in ("relief", "fossils"):
        path = f[key] if key == "relief" else f[key]["file"]
        assert (d / path).is_file(), f"{f['age']} Ma {key} 파일 없음"
    assert f.get("terrain") and (d / f["terrain"]["file"]).is_file(), f"{f['age']} Ma 지형 없음"
# 최근의 절 기온(PaleoClim) — index.json 밖의 목록(koprifossillab 033)
recent = json.loads((d / "climate" / "recent.json").read_text(encoding="utf-8"))
assert recent["snapshots"], "PaleoClim 스냅숏 없음"
for s in recent["snapshots"]:
    assert (d / s["file"]).is_file(), f"PaleoClim {s['id']} 그림 없음"
EOF

[ "$MODE" = "--no-deploy" ] && { status ok "가공까지(운영 안 옮김): 산지 $old → $new"; exit 0; }

# ── 4. 운영에 옮기기 — index.json 을 맨 나중에 ───────────────────────────
STEP=deploy
rsync -a --exclude index.json "$REPO/data/derived/" "$SRV/data/" || fail "rsync 실패"
rsync -a "$REPO/data/derived/index.json" "$SRV/data/index.json" || fail "index.json rsync 실패"
"$REPO/deploy/host/smoke.sh" >/dev/null || fail "smoke 실패 — 운영을 확인한다"
status ok "산지 $old → $new, 운영에 옮겼다"
