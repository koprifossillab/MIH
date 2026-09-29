"""세 가공물을 만들고, 뷰어가 처음 읽는 목록(index.json)으로 묶는다.

시점은 PaleoDEM 이 정한다(109 장). 해안선은 81 시점뿐이라 시점마다 가장 가까운
해안선을 붙이되, 10 Myr 보다 멀면 붙이지 않는다 — 먼 시대의 해안선을 긋느니 없다고
말하는 편이 낫다. 어느 나이의 해안선을 그었는지는 목록에 적어 화면에 띄운다.

목록에는 층서표(timescale.py)와 퇴적 환경 나무(environments.py)도 싣는다. 뷰어는 둘을
따로 들고 있지 않고 여기서 받아 그린다 — 이름·경계·색을 고칠 자리가 한 곳이다.
"""
import json
from datetime import datetime, timezone

from . import climate, coastlines, countries, fossils, relief
from .common import DERIVED, manifest, period
from .environments import classify, tree_for_index
from .timescale import containing, units

COASTLINE_REACH_MA = 10.0
SCHEMA = 2


def nearest(entries, age, reach):
    best = min(entries, key=lambda e: abs(e["age"] - age), default=None)
    if best is None or abs(best["age"] - age) > reach:
        return None
    return best


def cite(name):
    spec = manifest(name)
    return {"id": spec["id"], "title": spec["title"], "citation": spec["citation"],
            "license": spec["license"]["name"], "license_url": spec["license"]["url"]}


def previous_reliefs():
    """지난 목록의 배경 항목 — 배경은 그대로 두고 나머지만 다시 만들 때(--no-relief)."""
    index = json.loads((DERIVED / "index.json").read_text(encoding="utf-8"))
    out = []
    for f in index["frames"]:
        files = f.get("relief_files") or {"2048": f["relief"]}
        missing = [p for p in files.values() if not (DERIVED / p).is_file()]
        if missing:
            raise SystemExit(f"배경 그림이 없다({missing[0]}) — --no-relief 없이 돌린다")
        out.append({"age": f["age"], "label": f["label"], "file": f["relief"], "files": files,
                    "grid": f.get("grid", "1deg"), "land_fraction": f["land_fraction"]})
    return out


def build(skip_relief=False):
    DERIVED.mkdir(parents=True, exist_ok=True)
    print("배경(PaleoDEM)" + (" — 지난 것을 그대로 쓴다" if skip_relief else ""))
    reliefs = previous_reliefs() if skip_relief else relief.build()
    print("해안선(PaleoCoastlines)")
    coasts = coastlines.build()
    print("화석(PBDB)")
    fossil_entries, fossil_meta = fossils.build([e["age"] for e in reliefs])
    by_age = {e["age"]: e for e in fossil_entries}
    print("국경(Natural Earth → PALEOMAP)")
    border_entries, country_names = countries.build([e["age"] for e in reliefs])
    borders = {e["age"]: e["file"] for e in border_entries}
    print("고기후(Scotese 2021 지표 기온)")
    temps = climate.build([e["age"] for e in reliefs])

    scale = units()
    frames = []
    for entry in reliefs:
        age = entry["age"]
        coast = nearest(coasts, age, COASTLINE_REACH_MA)
        found = by_age.get(age, {})
        frames.append({
            "age": age,
            "label": entry["label"],
            "period": period(age),
            "units": [u["id"] for u in containing(age, scale)],
            "relief": entry["file"],
            "relief_files": entry["files"],
            "grid": entry["grid"],
            "land_fraction": entry["land_fraction"],
            "coastline": {"age": coast["age"], "file": coast["file"]} if coast else None,
            "borders": borders.get(age),
            "climate": temps.get(age),
            "fossils": {"file": found.get("file"), "count": found.get("count", 0),
                        "by_env": found.get("by_env", {})},
        })

    env_counts = fossil_meta["stats"].pop("environments")
    unlisted = sorted(t for t in env_counts if classify(t)[1] == "o-unlisted")
    if unlisted:
        print(f"  환경 나무에 없는 PBDB 용어 {len(unlisted)} 개: {unlisted} — environments.py 에 넣는다")
    index = {
        "schema": SCHEMA,
        "built_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
        "frames": sorted(frames, key=lambda f: f["age"]),
        "timescale": {"names": "국제지질연대층서표 한글판 v2023/04", "boundaries": "ICS v2024/12",
                      "units": scale},
        "environments": tree_for_index(env_counts),
        "countries": countries.country_list(country_names),
        "pbdb": fossil_meta,
        "sources": [cite("paleodem"), cite("paleocoastlines"), cite("paleotemp"), cite("pbdb"), cite("countries")],
    }
    (DERIVED / "index.json").write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n",
                                        encoding="utf-8")
    print(f"목록: {len(frames)} 시점 -> {DERIVED / 'index.json'}")
    return index
