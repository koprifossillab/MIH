#!/bin/bash
# 뷰어 컨테이너 시작.
set -e

cd /app/web

# ── 비밀키 ────────────────────────────────────────────────────────────
# `.env` 의 WEGENER_SECRET_KEY 가 비어 있으면 여기서 한 번 만들어 자료 자리 옆에 둔다.
# GSM 이 겪은 것(빈 값이면 Django 가 멈춘다)을 피하려는 것이다. 워커가 아니라 여기서
# 만들어야 gunicorn 워커 셋이 같은 키를 든다.
if [[ -z "${WEGENER_SECRET_KEY:-}" ]]; then
    KEY_FILE="${WEGENER_STATE_DIR:-/srv/WegenersDream/state}/secret_key"
    mkdir -p "$(dirname "$KEY_FILE")"
    if [[ ! -s "$KEY_FILE" ]]; then
        python -c "import secrets; print(secrets.token_urlsafe(64))" > "$KEY_FILE"
        chmod 600 "$KEY_FILE" 2>/dev/null || true
        echo "비밀키를 새로 만들어 두었다: $KEY_FILE"
    fi
    export WEGENER_SECRET_KEY="$(cat "$KEY_FILE")"
fi

if [[ ! -f "${WEGENER_DATA_DIR:-/srv/WegenersDream/data}/index.json" ]]; then
    echo "자료가 없다(${WEGENER_DATA_DIR:-/srv/WegenersDream/data}/index.json) — 화면은 뜨지만 비어 있다"
fi

exec gunicorn wegenerweb.wsgi:application \
    --bind 0.0.0.0:9090 \
    --workers 3 \
    --timeout 60 \
    --access-logfile - \
    --error-logfile -
