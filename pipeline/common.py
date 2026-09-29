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
# 층서표는 timescale.py 한 곳에 있다(이름 2023/04 한글판, 경계 2024/12).
def period(age_ma):
    """나이가 속한 기. 경계 나이는 더 젊은 쪽에 넣는다(66.0 Ma 는 고진기)."""
    from .timescale import containing
    for unit in containing(age_ma):
        if unit["rank"] == "period":
            return {"ko": unit["ko"], "en": unit["en"]}
    return {"ko": "선캄브리아", "en": "Precambrian"}


# ── PaleoDEM 파일 이름 ────────────────────────────────────────────────
# 예: "Map88_PALEOMAP_1deg_Cambrian_Precambrian boundary_540Ma.nc"
#     "Map48_PALEOMAP_1deg_Middle_Devonian_385.2Ma.nc"
#     6 분 격자는 `_6min_` 이고 385.2·390.5 를 정수로 반올림해 적는다.
_DEM_NAME = re.compile(r"_(?:1deg|6min)_(?P<label>.+?)_(?P<age>\d+(?:\.\d+)?)\s*Ma\.nc$")


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


def _longest_age():
    from .timescale import longest_age
    return round(longest_age(), 2)


# 연대 범위의 상한 = **가장 긴 절의 길이**(ICS 2024 노릭절 21.6 Myr). 절 하나로 매겨진 채집지는 하나도
# 빠지지 않게 하려는 것이다. 처음에는 20 으로 적고 "노릭절이 들어온다" 고 했는데, 노릭절은 옛 판에서
# 18.5 였고 2024 판은 21.6 이라 노릭절 채집지 1,567 곳이 통째로 빠져 있었다(devlog 013).
# 뷰어는 이 값을 index.json 의 rules 로 받는다 — 두 곳에 따로 적지 않는다.
MAX_SPAN_MA = _longest_age()
_EPS = 1e-6             # 227.3 − 205.7 = 21.600000000000023


def belongs(max_ma, min_ma, age_ma):
    """채집지(max_ma~min_ma)가 이 시점의 지도에 오르는가."""
    if max_ma < min_ma:
        max_ma, min_ma = min_ma, max_ma
    if max_ma - min_ma > MAX_SPAN_MA + _EPS:
        return False
    return max_ma >= age_ma - WINDOW_MA and min_ma <= age_ma + WINDOW_MA


def environment_class(environment):
    """퇴적 환경 → 바다(m)·뭍(t)·해안/기타(o). 갈래는 environments.py 의 나무 한 곳에 있다."""
    from .environments import classify
    return classify(environment)[0]
