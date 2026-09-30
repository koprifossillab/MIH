"""모든 시대의 PBDB 산지를 오늘날 자리에 — 첫 화면(홀로세 지도)에 한꺼번에 보이는 것(tupandactyl 007).

시점마다의 화석 파일(fossils.py)은 그 시점 ±2.5 Myr 의 산지를 그때 자리로 돌린 것이다. 첫 화면은 그것과 달리 PBDB 의 **모든
산지를 지금 좌표**에 둔다 — 지구의 어디에서 화석 기록이 나왔는지 한눈에. 27 만 곳을 점 하나씩 그리면 브라우저가 버거우므로
STEP 도 격자로 묶는다: 칸마다 산지 수, 가장 많은 퇴적기원, 가장 오랜·가장 젊은 연대, 연대 중간값의 중앙값.
좌표는 칸 안 산지들의 평균이다(칸 가운데가 아니라 — 해안선의 산지가 바다로 밀리지 않게).

    python -m pipeline everything     # 이것만 만들고 지금 index.json 에 붙인다(1 분 안쪽, pygplates 불필요)

build 도 부른다(fossils.build 가 읽은 산지로).
"""
import json
import statistics

from .common import DERIVED, manifest, source_path

STEP = 0.25          # 격자(도). 0.25° ≈ 적도에서 28 km
FIELDS = ["lng", "lat", "n", "env", "max_ma", "min_ma", "mid_ma"]
FILE = "fossils/all.json"


def cells(rows):
    """read_collections 의 항목들 → 격자 칸의 행들. 항목은 (old, young, 행, 현재 경도, 현재 위도)."""
    grid = {}
    for old, young, row, lng, lat in rows:
        key = (int((lng + 180) // STEP), int((lat + 90) // STEP))
        c = grid.get(key)
        if c is None:
            c = grid[key] = {"x": 0.0, "y": 0.0, "n": 0, "env": {}, "old": old, "young": young, "mids": []}
        c["x"] += lng
        c["y"] += lat
        c["n"] += 1
        env = row[3]
        c["env"][env] = c["env"].get(env, 0) + 1
        c["old"] = max(c["old"], old)
        c["young"] = min(c["young"], young)
        c["mids"].append((old + young) / 2)
    out = []
    for c in grid.values():
        env = max(sorted(c["env"]), key=lambda k: c["env"][k])          # 같으면 이름 차례(m·o·t) — 늘 같은 답
        out.append([round(c["x"] / c["n"], 2), round(c["y"] / c["n"], 2), c["n"], env,
                    round(c["old"], 1), round(c["young"], 1), round(statistics.median(c["mids"]), 1)])
    out.sort(key=lambda r: (-r[2], r[0], r[1]))                            # 많은 칸부터 — 뷰어가 작은 칸을 위에 그린다
    return out


def write(rows):
    """all.json 을 쓰고 index.json 의 everything 칸을 돌려준다."""
    rows_out = cells(rows)
    payload = {"step": STEP, "fields": FIELDS, "collections": len(rows), "rows": rows_out}
    path = DERIVED / FILE
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, separators=(",", ":")), encoding="utf-8")
    print(f"  모든 시대 산지 {len(rows):,} 곳 → {len(rows_out):,} 칸({STEP}°) -> {path}")
    return {"file": FILE, "collections": len(rows), "cells": len(rows_out), "step": STEP}


def attach():
    """all.json 만 만들고 지금 index.json 에 everything 칸을 붙인다 — 다른 가공물은 그대로."""
    from .fossils import read_collections
    index_path = DERIVED / "index.json"
    if not index_path.is_file():
        raise SystemExit(f"{index_path} 가 없다 — 먼저 `python -m pipeline build`")
    source = source_path(manifest("pbdb")["query"]["path"])
    if not source.exists():
        raise SystemExit(f"{source} 가 없다 — 먼저 `python -m pipeline fetch`")
    rows, _ = read_collections(source)
    entry = write(rows)
    index = json.loads(index_path.read_text(encoding="utf-8"))
    index["everything"] = entry
    tmp = index_path.with_suffix(".json.tmp")
    tmp.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    tmp.replace(index_path)
    print(f"목록: everything -> {index_path}")
