"""파이프라인 여러 단계가 함께 쓰는 것 — 경로, 지질시대, 화석 나누기 규칙.

이 파일은 numpy 도 import 하지 않는다. 규칙만 들고 있어서 시험이 가볍다.
"""
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / "sources"
# 뷰어가 읽는 자리. 운영에서는 이 폴더를 /srv/MIH/data 로 옮겨 마운트한다.
DERIVED = Path(os.environ.get("MIH_DATA_DIR", ROOT / "data" / "derived"))


def manifest(name):
    return json.loads((SOURCES / f"{name}.json").read_text(encoding="utf-8"))


def source_path(relative):
    return ROOT / relative


# ── 지질시대 ──────────────────────────────────────────────────────────
# 기(Period)의 하한, Ma. ICS 국제층서표 v2024/12 를 따르고, 이름은 대한지질학회가
# 옮긴 한글판 표기다. 시점 이름표에만 쓰므로 기 단위로 충분하다.
PERIODS = [
    (2.58, "제4기", "Quaternary"),
    (23.03, "신진기", "Neogene"),
    (66.0, "고진기", "Paleogene"),
    (143.1, "백악기", "Cretaceous"),
    (201.4, "쥐라기", "Jurassic"),
    (251.902, "트라이아스기", "Triassic"),
    (298.9, "페름기", "Permian"),
    (358.86, "석탄기", "Carboniferous"),
    (419.62, "데본기", "Devonian"),
    (443.8, "실루리아기", "Silurian"),
    (486.85, "오르도비스기", "Ordovician"),
    (538.8, "캄브리아기", "Cambrian"),
    (635.0, "에디아카라기", "Ediacaran"),
]


def period(age_ma):
    """나이가 속한 기. 경계 나이는 더 젊은 쪽에 넣는다(66.0 Ma 는 고진기)."""
    for base, korean, english in PERIODS:
        if age_ma <= base:
            return {"ko": korean, "en": english}
    return {"ko": "선캄브리아", "en": "Precambrian"}


# ── PaleoDEM 파일 이름 ────────────────────────────────────────────────
# 예: "Map88_PALEOMAP_1deg_Cambrian_Precambrian boundary_540Ma.nc"
#     "Map48_PALEOMAP_1deg_Middle_Devonian_385.2Ma.nc"
_DEM_NAME = re.compile(r"_1deg_(?P<label>.+)_(?P<age>\d+(?:\.\d+)?)Ma\.nc$")


def parse_dem_name(name):
    """파일 이름에서 (나이, 영문 이름표). 모르는 꼴이면 None."""
    found = _DEM_NAME.search(name)
    if not found:
        return None
    label = found.group("label").replace("_", " ").strip()
    return float(found.group("age")), label


def age_key(age_ma):
    """시점을 파일 이름으로. 385.2 Ma 가 385 Ma 와 부딪히지 않게 0.1 Myr 단위로 적는다."""
    return f"{round(age_ma * 10):04d}"


# ── 화석을 시점에 나누는 규칙 ─────────────────────────────────────────
# 채집지의 연대 범위가 시점의 창(±2.5 Myr)과 **겹치면** 그 시점에 올린다. 그래서 한
# 채집지가 여러 시점에 오를 수 있다. 중간값이 창 안에 드는 것만 올리면(EarthThruTime3D
# 의 지도 검사 규칙) 층서 단계로 연대가 매겨진 채집지의 중간값이 몰려, 400 Ma 처럼
# 채집지가 하나도 없는 시점이 생긴다 — devlog 001.
WINDOW_MA = 2.5         # 시점 ±2.5 Myr — PaleoDEM 간격(5 Myr)의 절반
MAX_SPAN_MA = 20.0      # 이보다 넓으면 어느 시점의 것이라 말할 수 없다. 가장 긴 절(노리절 등)이 들어오는 값


def belongs(max_ma, min_ma, age_ma):
    """채집지(max_ma~min_ma)가 이 시점의 지도에 오르는가."""
    if max_ma < min_ma:
        max_ma, min_ma = min_ma, max_ma
    if max_ma - min_ma > MAX_SPAN_MA:
        return False
    return max_ma >= age_ma - WINDOW_MA and min_ma <= age_ma + WINDOW_MA


# 퇴적 환경 → 바다(m)·뭍(t)·그 밖(o). 해안·석호·하구처럼 지도가 긋는 선 바로 위인
# 환경은 어느 쪽으로도 밀지 않고 '그 밖'에 둔다. 목록은 EarthThruTime3D 의 것이다.
MARINE = {
    "marine indet.", "carbonate indet.", "peritidal", "shallow subtidal indet.",
    "open shallow subtidal", "lagoonal/restricted shallow subtidal", "sand shoal",
    "reef, buildup or bioherm", "perireef or subreef", "intrashelf/intraplatform reef",
    "platform/shelf-margin reef", "slope/ramp reef", "basin reef", "deep subtidal ramp",
    "deep subtidal shelf", "deep subtidal indet.", "offshore ramp", "offshore shelf",
    "offshore indet.", "slope", "basinal (carbonate)", "basinal (siliceous)",
    "shoreface", "transition zone/lower shoreface", "offshore", "submarine fan",
    "basinal (siliciclastic)", "deep-water indet.", "delta front", "prodelta",
    "foreshore",
}
TERRESTRIAL = {
    "terrestrial indet.", "fluvial indet.", "alluvial fan", "channel lag",
    # PBDB 는 둘을 따옴표째 적는다.
    "coarse channel fill", "fine channel fill", '"channel"', "wet floodplain",
    "dry floodplain", '"floodplain"', "crevasse splay", "levee", "mire/swamp",
    "fluvial-lacustrine indet.", "lacustrine - large", "lacustrine - small", "pond",
    "crater lake", "lacustrine delta plain", "lacustrine interdistributary bay",
    "lacustrine delta front", "lacustrine prodelta", "lacustrine deltaic indet.",
    "lacustrine indet.", "dune", "interdune", "loess", "eolian indet.", "cave",
    "fissure fill", "sinkhole", "karst indet.", "tar", "spring", "glacial",
    "fluvial-deltaic indet.", "deltaic indet.", "delta plain", "interdistributary bay",
}


def environment_class(environment):
    value = (environment or "").strip()
    if value in MARINE:
        return "m"
    if value in TERRESTRIAL:
        return "t"
    return "o"
