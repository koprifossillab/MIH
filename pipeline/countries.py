"""국경선 — 현재 국경(Natural Earth 1:50m)을 PALEOMAP 판으로 나눠 시점마다 그때 자리로 돌린다.

판 모델은 PaleoCoastlines v7.1 압축본에 든 것(회전 파일 m06c9h_3id_forPgeog_19o_r1c.rot 과 판 나눔
다각형 PALEOMAP_PlatePolygons__forPgeog_v19o.gpml)이다. 해안선을 만든 바로 그 모델이라 국경과
해안선이 같은 틀에 앉는다.

- 나라 하나가 여러 판에 걸치면 판마다 조각으로 나뉘어 따로 움직인다(split_into_plates)
- 판 나눔 다각형의 유효 기간을 옮겨 받으므로, 그 시점에 아직 없던 지각(예: 아이슬란드의 젊은
  지각) 위의 국경은 그 시점 지도에 나오지 않는다
- 이것은 "지금 그 나라 땅이 그때 어디 있었나" 이지 그때의 나라가 아니다. 화면에도 그렇게 적는다

국가 목록(index.json 의 countries)은 PBDB 채집지에 나오는 국가 코드마다 한글 이름을 붙인다.
PBDB 는 GB 를 UK 로, 대양을 O1~O7 로 적는다.
"""
import csv
import json
from collections import Counter

import pygplates
import shapefile
from shapely.geometry import Polygon

from .common import DERIVED, age_key, manifest, source_path

TOLERANCE = 0.05       # 도. 국경을 판으로 나누기 전에 단순화한다 — 50m 자료는 점이 수십만 개다
MODEL = "Data/paleomap_model_v19o_r1c/"
ROTATION = MODEL + "m06c9h_3id_forPgeog_19o_r1c.rot"
PARTITION = MODEL + "PALEOMAP_PlatePolygons__forPgeog_v19o.gpml"

# PBDB 코드 → ISO(Natural Earth). 그리고 Natural Earth 에 없는 PBDB 코드의 한글 이름.
PBDB_TO_ISO = {"UK": "GB"}
EXTRA_KO = {
    "O1": ("북극해", "Arctic Ocean"), "O2": ("북대서양", "North Atlantic"),
    "O3": ("남대서양", "South Atlantic"), "O4": ("북태평양", "North Pacific"),
    "O5": ("남태평양", "South Pacific"), "O6": ("인도양", "Indian Ocean"),
    "O7": ("남극해", "Southern Ocean"),
    "SJ": ("스발바르 얀마옌", "Svalbard and Jan Mayen"), "CX": ("크리스마스섬", "Christmas Island"),
    "GF": ("프랑스령 기아나", "French Guiana"), "BQ": ("카리브 네덜란드", "Caribbean Netherlands"),
    "YT": ("마요트", "Mayotte"), "UM": ("미국령 군소 제도", "U.S. Minor Outlying Islands"),
    "GP": ("과들루프", "Guadeloupe"), "RE": ("레위니옹", "Réunion"), "GI": ("지브롤터", "Gibraltar"),
    "CC": ("코코스 제도", "Cocos (Keeling) Islands"), "MQ": ("마르티니크", "Martinique"),
}


# 흔히 쓰는 짧은 이름. Natural Earth 의 NAME_KO 는 정식 이름이라 "한국"·"중국" 으로는 안 찾아진다.
ALIASES = {
    "KR": ["한국", "남한"], "KP": ["북한", "조선"], "CN": ["중국"], "TW": ["대만", "타이완"],
    "US": ["미합중국"], "GB": ["영국", "잉글랜드", "스코틀랜드", "웨일스"], "RU": ["러시아"],
    "CZ": ["체코"], "LA": ["라오스"], "VN": ["베트남"], "SY": ["시리아"], "IR": ["이란"],
    "CD": ["콩고민주공화국", "민주콩고"], "CG": ["콩고"], "MM": ["미얀마", "버마"],
}


def model_path(member):
    return source_path(manifest("paleocoastlines")["archive"]["unzip"]) / member


def natural_earth():
    """(ISO, 한글, 영문, [고리 …]) 목록. ISO 가 -99 인 곳(분쟁 지역 등)은 뺀다."""
    shp = source_path(manifest("countries")["download"]["unzip"]) / "ne_50m_admin_0_countries.shp"
    out = []
    with shapefile.Reader(str(shp), encoding="utf-8") as reader:
        for shape, rec in zip(reader.iterShapes(), reader.iterRecords()):
            iso = rec["ISO_A2_EH"]
            if not iso or iso == "-99":
                continue
            parts = list(shape.parts) + [len(shape.points)]
            rings = []
            for start, end in zip(parts[:-1], parts[1:]):
                ring = shape.points[start:end]
                if len(ring) < 4:
                    continue
                simple = Polygon(ring).exterior.simplify(TOLERANCE, preserve_topology=False)
                coords = list(simple.coords)
                if len(coords) >= 4:
                    rings.append(coords)
            out.append((iso, rec["NAME_KO"] or rec["NAME_EN"], rec["NAME_EN"], rings))
    return out


def features(countries):
    """국경 고리마다 pygplates 지물 하나. 이름에 ISO 코드를 담는다(나눈 뒤에도 따라간다)."""
    out = []
    for iso, _, _, rings in countries:
        for ring in rings:
            feature = pygplates.Feature()
            # pygplates 는 (위도, 경도) 순서다
            feature.set_geometry(pygplates.PolygonOnSphere([(lat, lon) for lon, lat in ring]))
            feature.set_name(iso)
            out.append(feature)
    return out


def build(ages):
    countries = natural_earth()
    rotation = pygplates.RotationModel(str(model_path(ROTATION)))
    partition = pygplates.FeatureCollection(str(model_path(PARTITION)))
    parts = pygplates.partition_into_plates(
        partition, rotation, features(countries),
        properties_to_copy=[pygplates.PartitionProperty.reconstruction_plate_id,
                            pygplates.PartitionProperty.valid_time_period],
        partition_method=pygplates.PartitionMethod.split_into_plates)
    wrapper = pygplates.DateLineWrapper()

    out = DERIVED / "countries"
    out.mkdir(parents=True, exist_ok=True)
    entries = []
    for age in ages:
        reconstructed = []
        pygplates.reconstruct(parts, rotation, reconstructed, float(age))
        by_iso = {}
        for item in reconstructed:
            iso = item.get_feature().get_name()
            geometry = item.get_reconstructed_geometry()
            # 날짜변경선을 넘는 것은 잘라서 적는다 — 안 자르면 지도를 가로지르는 선이 생긴다.
            # 판 경계에서 쪼개진 다각형은 선(polyline)으로 돌아온다. 뷰어는 테두리만 그리므로
            # 둘 다 선으로 적는다.
            for piece in wrapper.wrap(geometry):
                closed = hasattr(piece, "get_exterior_points")
                points = piece.get_exterior_points() if closed else piece.get_points()
                line = [[round(p.get_longitude(), 2), round(p.get_latitude(), 2)] for p in points]
                if closed and line:
                    line.append(line[0])
                if len(line) >= 2:
                    by_iso.setdefault(iso, []).append(line)
        feature_list = [{"type": "Feature", "properties": {"cc": iso},
                         "geometry": {"type": "MultiLineString", "coordinates": lines}}
                        for iso, lines in sorted(by_iso.items())]
        name = f"countries/{age_key(age)}.json"
        (DERIVED / name).write_text(json.dumps({"type": "FeatureCollection", "features": feature_list},
                                               separators=(",", ":")), encoding="utf-8")
        entries.append({"age": age, "file": name, "countries": len(by_iso)})
        print(f"  국경 {age:6.1f} Ma  {len(by_iso):4d} 나라")
    return entries, {iso: (ko, en) for iso, ko, en, _ in countries}


def country_list(names):
    """PBDB 채집지에 나오는 국가 코드마다 (코드, ISO, 한글, 영문, 채집지 수)."""
    path = source_path(manifest("pbdb")["query"]["path"])
    with open(path, newline="", encoding="utf-8", errors="replace") as handle:
        counts = Counter((row.get("cc") or "").strip() for row in csv.DictReader(handle))
    out = []
    for code, n in counts.most_common():
        if not code:
            continue
        iso = PBDB_TO_ISO.get(code, code)
        ko, en = names.get(iso) or EXTRA_KO.get(code) or (code, code)
        out.append({"cc": code, "iso": iso, "ko": ko, "en": en, "aka": ALIASES.get(iso, []),
                    "collections": n, "ocean": code.startswith("O") and code[1:].isdigit()})
    return out
