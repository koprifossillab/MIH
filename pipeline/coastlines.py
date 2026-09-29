"""PaleoCoastlines v7.1 → 시점마다 해안선 GeoJSON 하나.

좌표는 이미 PALEOMAP 복원 좌표라 회전하지 않는다. 뷰어는 해안선을 **선으로만** 긋고
채우지 않으므로, 다각형의 고리를 선(MultiLineString)으로 풀어 담는다. 그러면 원본
다각형이 조금 어긋나 있어도(자기 교차 등) 단순화가 깨지지 않는다.
"""
import json
import re

import shapefile
from shapely.geometry import LineString

from .common import DERIVED, age_key, manifest, source_path

TOLERANCE = 0.05     # 도. 2048 폭 배경의 한 칸(0.18°)보다 작게
MIN_POINTS = 4
_NAME = re.compile(r"^(?P<age>\d+(?:\.\d+)?)Ma_CS_v7\.shp$", re.IGNORECASE)


def rings(shape):
    points, parts = shape.points, list(shape.parts) + [len(shape.points)]
    for start, end in zip(parts[:-1], parts[1:]):
        yield points[start:end]


def simplify(ring, tolerance=TOLERANCE):
    if len(ring) < MIN_POINTS:
        return None
    line = LineString(ring).simplify(tolerance, preserve_topology=False)
    coords = [[round(x, 3), round(y, 3)] for x, y in line.coords]
    return coords if len(coords) >= MIN_POINTS else None


def shapefiles():
    folder = source_path(manifest("paleocoastlines")["archive"]["unzip"])
    found = {}
    for path in folder.rglob("*.shp"):
        match = _NAME.match(path.name)
        if match:
            found[float(match.group("age"))] = path
    if not found:
        raise SystemExit(f"{folder} 에 해안선 셰이프파일이 없다 — 먼저 `python -m pipeline fetch`")
    return sorted(found.items())


def build():
    out = DERIVED / "coastlines"
    out.mkdir(parents=True, exist_ok=True)
    entries = []
    for age, path in shapefiles():
        lines = []
        with shapefile.Reader(str(path)) as reader:
            for shape in reader.iterShapes():
                for ring in rings(shape):
                    coords = simplify(ring)
                    if coords:
                        lines.append(coords)
        name = f"coastlines/{age_key(age)}.json"
        feature = {"type": "Feature", "properties": {"age": age},
                   "geometry": {"type": "MultiLineString", "coordinates": lines}}
        (DERIVED / name).write_text(json.dumps(feature, separators=(",", ":")), encoding="utf-8")
        entries.append({"age": age, "file": name, "lines": len(lines)})
        print(f"  해안선 {age:6.1f} Ma  {len(lines):5d} 선")
    return entries
