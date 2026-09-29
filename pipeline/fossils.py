"""PBDB 산지 → 시점마다 화석 점 JSON 하나.

점 하나는 산지(collection) 하나다. 산출(occurrence)은 점을 눌렀을 때 뷰어가
PBDB 에 바로 묻는다 — 백만 건이 넘는 산출을 미리 다 싣지 않으려는 것이다.

좌표는 PBDB 가 PALEOMAP 모델(pgm=scotese)로 **산지 연대의 중간값**에서 계산한
고좌표다. 범위가 넓은 산지는 여러 시점에 오르므로 지도 시점과 다른 때의 위치다.
절 하나 안에 매겨진 산지는 지도 시점과 대개 1° 안이지만, 절을 넘는 **넓은 연대** 산지는
더 어긋날 수 있다 — 그래서 `precise = 0` 으로 표시해 뷰어가 고리로 그린다(015).
"""
import bisect
import csv
import json

from .common import DERIVED, WINDOW_MA, age_key, environment_class, manifest, source_path
from .timescale import stage_bounds, within_one_stage

FIELDS = ["collection_no", "paleolng", "paleolat", "env", "n_occs", "collection_name",
          "early_interval", "late_interval", "max_ma", "min_ma", "formation", "environment", "cc",
          "precise"]     # 1 = 절 하나 안에 매겨진 연대, 0 = 절을 넘는 넓은 연대


def number(value):
    try:
        return float(value)
    except (TypeError, ValueError):
        return None


def read_collections(path):
    """(max_ma, min_ma, 행) 을 낸다. 연대나 고좌표가 없는 것은 세기만 하고 버린다."""
    stats = {"records": 0, "no_age": 0, "wide": 0, "no_paleo": 0, "environments": {}}
    rows = []
    bounds = stage_bounds()
    with open(path, newline="", encoding="utf-8", errors="replace") as handle:
        for record in csv.DictReader(handle):
            stats["records"] += 1
            old, young = number(record.get("max_ma")), number(record.get("min_ma"))
            if old is None or young is None:
                stats["no_age"] += 1
                continue
            if old < young:
                old, young = young, old
            plng, plat = number(record.get("paleolng")), number(record.get("paleolat"))
            if plng is None or plat is None:
                stats["no_paleo"] += 1
                continue
            environment = (record.get("environment") or "").strip()
            stats["environments"][environment] = stats["environments"].get(environment, 0) + 1
            precise = within_one_stage(old, young, bounds)
            stats["wide"] += not precise
            rows.append((old, young, [
                int(record["collection_no"]), round(plng, 2), round(plat, 2),
                environment_class(environment), int(number(record.get("n_occs")) or 0),
                (record.get("collection_name") or "").strip(),
                (record.get("early_interval") or "").strip(),
                (record.get("late_interval") or "").strip(),
                old, young,
                (record.get("formation") or "").strip(),
                environment,
                (record.get("cc") or "").strip(),       # PBDB 국가 코드(GB 는 UK, 대양은 O1~O7)
                1 if precise else 0,
            ]))
    return rows, stats


def assign(rows, ages):
    """시점마다 그 무렵 채집지. 연대 범위가 여러 시점의 창에 걸치면 그 시점 모두에 오른다.

    common.belongs 와 같은 규칙이다(범위 [young, old] 가 [age−창, age+창] 과 겹친다).
    """
    ages = sorted(ages)
    binned = {age: [] for age in ages}
    for old, young, row in rows:
        start = bisect.bisect_left(ages, young - WINDOW_MA)
        for age in ages[start:]:
            if age > old + WINDOW_MA:
                break
            binned[age].append(row)
    return binned


def build(ages):
    query = manifest("pbdb")["query"]
    path = source_path(query["path"])
    if not path.exists():
        raise SystemExit(f"{path} 가 없다 — 먼저 `python -m pipeline fetch`")
    receipt_path = path.parent / "receipt.json"
    receipt = json.loads(receipt_path.read_text(encoding="utf-8")) if receipt_path.exists() else {}

    rows, stats = read_collections(path)
    out = DERIVED / "fossils"
    out.mkdir(parents=True, exist_ok=True)
    entries = []
    for age, members in assign(rows, ages).items():
        name = f"fossils/{age_key(age)}.json"
        members.sort(key=lambda row: row[0])
        payload = {"age": age, "window_ma": WINDOW_MA, "fields": FIELDS, "rows": members}
        (DERIVED / name).write_text(json.dumps(payload, ensure_ascii=False, separators=(",", ":")),
                                    encoding="utf-8")
        counts = {k: sum(1 for r in members if r[3] == k) for k in "mto"}
        wide = sum(1 for r in members if not r[-1])
        entries.append({"age": age, "file": name, "count": len(members), "wide": wide, "by_env": counts})
        print(f"  화석 {age:6.1f} Ma  {len(members):6d} 산지 (넓은 연대 {wide}, 해양 {counts['m']}, 육상 {counts['t']})")
    stats["used"] = len(rows)
    return entries, {"stats": stats, "receipt": receipt}
