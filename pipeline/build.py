"""세 가공물을 만들고, 뷰어가 처음 읽는 목록(index.json)으로 묶는다.

시점은 PaleoDEM 이 정한다(109 장). 해안선은 81 시점뿐이라 시점마다 가장 가까운
해안선을 붙이되, 10 Myr 보다 멀면 붙이지 않는다 — 먼 시대의 해안선을 긋느니 없다고
말하는 편이 낫다. 어느 나이의 해안선을 그었는지는 목록에 적어 화면에 띄운다.
"""
import json
from datetime import datetime, timezone

from . import coastlines, fossils, relief
from .common import DERIVED, manifest, period

COASTLINE_REACH_MA = 10.0
SCHEMA = 1


def nearest(entries, age, reach):
    best = min(entries, key=lambda e: abs(e["age"] - age), default=None)
    if best is None or abs(best["age"] - age) > reach:
        return None
    return best


def cite(name):
    spec = manifest(name)
    return {"id": spec["id"], "title": spec["title"], "citation": spec["citation"],
            "license": spec["license"]["name"], "license_url": spec["license"]["url"]}


def build():
    DERIVED.mkdir(parents=True, exist_ok=True)
    print("배경(PaleoDEM)")
    reliefs = relief.build()
    print("해안선(PaleoCoastlines)")
    coasts = coastlines.build()
    print("화석(PBDB)")
    fossil_entries, fossil_meta = fossils.build([e["age"] for e in reliefs])
    by_age = {e["age"]: e for e in fossil_entries}

    frames = []
    for entry in reliefs:
        age = entry["age"]
        coast = nearest(coasts, age, COASTLINE_REACH_MA)
        found = by_age.get(age, {})
        frames.append({
            "age": age,
            "label": entry["label"],
            "period": period(age),
            "relief": entry["file"],
            "land_fraction": entry["land_fraction"],
            "coastline": {"age": coast["age"], "file": coast["file"]} if coast else None,
            "fossils": {"file": found.get("file"), "count": found.get("count", 0),
                        "by_env": found.get("by_env", {})},
        })
    index = {
        "schema": SCHEMA,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "frames": sorted(frames, key=lambda f: f["age"]),
        "pbdb": fossil_meta,
        "sources": [cite("paleodem"), cite("paleocoastlines"), cite("pbdb")],
    }
    (DERIVED / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n",
                                        encoding="utf-8")
    print(f"목록: {len(frames)} 시점 -> {DERIVED / 'index.json'}")
    return index
