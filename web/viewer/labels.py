"""사람이 고친 명칭 — 퇴적 환경 나무의 한글 이름.

기본 이름은 파이프라인(pipeline/environments.py)이 index.json 에 싣는다. 화면에서 고친 이름은
그것을 덮어쓰는 **덮어쓰기 표**로만 둔다: `<STATE_DIR>/labels.json` 의 {"env": {id: 이름}}.
자료를 다시 가공해도 덮어쓰기는 남고, 표에서 지우면 기본 이름으로 돌아간다.

DB 를 두지 않았다. 고치는 사람이 연구실 몇 명이고 한 번에 한 칸씩 고치므로, 파일 하나를
통째로 다시 쓰는 것으로 충분하다. 쓸 때는 임시 파일에 쓰고 os.replace 로 바꿔, 읽는 쪽이
반쯤 쓴 파일을 보지 않게 한다. 두 사람이 같은 순간(밀리초)에 고치면 한쪽이 질 수 있다.
"""
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

from django.conf import settings

MAX_LENGTH = 60
KINDS = ("env",)


def path():
    return Path(settings.STATE_DIR) / "labels.json"


def load():
    try:
        data = json.loads(path().read_text(encoding="utf-8"))
    except (OSError, ValueError):
        data = {}
    return {kind: dict(data.get(kind, {})) for kind in KINDS} | {"updated_at": data.get("updated_at")}


def save(kind, key, name):
    """name 이 비면 덮어쓰기를 지운다(기본 이름으로 돌아간다). 새 표를 돌려준다."""
    data = load()
    if name:
        data[kind][key] = name
    else:
        data[kind].pop(key, None)
    data["updated_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    target = path()
    target.parent.mkdir(parents=True, exist_ok=True)
    handle, temp = tempfile.mkstemp(dir=target.parent, suffix=".tmp")
    with os.fdopen(handle, "w", encoding="utf-8") as out:
        json.dump(data, out, ensure_ascii=False, indent=1)
    os.replace(temp, target)
    return data


def env_ids(index):
    """고칠 수 있는 환경 칸의 id — 맨 위 갈래, 환경군, 원 용어."""
    ids = set()
    for top in (index or {}).get("environments", []):
        ids.add(top["id"])
        for group in top["groups"]:
            ids.add(group["id"])
            for term in group["terms"]:
                ids.add("term:" + term["term"])
    return ids


def editing():
    """(고칠 수 있나, 열쇠가 필요한가). 열쇠를 정하지 않았으면 개발(DEBUG)에서만 연다."""
    if settings.EDITOR_KEYS:
        return True, True
    return bool(settings.DEBUG), False


def key_ok(given):
    return not settings.EDITOR_KEYS or (given or "").strip() in settings.EDITOR_KEYS
