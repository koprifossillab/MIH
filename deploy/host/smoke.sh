#!/bin/bash
# 배포 뒤 확인. 화면·상태·자료 목록이 nginx 를 거쳐 열리는지 본다.
#
#   deploy/host/smoke.sh                 # http://127.0.0.1/WegenersDream/
#   deploy/host/smoke.sh http://172.16.116.98/WegenersDream/
set -euo pipefail

BASE="${1:-http://127.0.0.1/WegenersDream/}"
fail=0

check() {
    local what="$1" url="$2" want="$3"
    local code
    code=$(curl -s -o /dev/null -w '%{http_code}' "$url" || true)
    if [[ "$code" == "$want" ]]; then
        echo "ok    $what ($code)"
    else
        echo "FAIL  $what — $url 가 $code (기대 $want)"
        fail=1
    fi
}

check "화면"       "$BASE"                 200
check "상태"       "${BASE}healthz"        200
check "자료 목록"  "${BASE}data/index.json" 200
check "허용 밖 파일" "${BASE}data/receipt.txt" 404

curl -s "${BASE}healthz"; echo
exit $fail
