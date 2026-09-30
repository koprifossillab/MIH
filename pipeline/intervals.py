"""산지의 연대가 절 단위로 정해졌는가 — PBDB 시대 이름의 등급으로 가른다(016).

산지 연대는 PBDB 가 시대 이름 하나나 둘(`early_interval`·`late_interval`)로 적는다. 그 이름의 등급이

- **절 단위 이하**(age·subage·zone·subzone·chron·subchron) — 연대가 정해진 기록. 이름이 둘이면 두 절 사이의
  정해진 범위다("Norian–Rhaetian"). 지역 절(Ivorian)·아절(Lacian)도 여기다
- **그 위**(epoch·subepoch·period·era·eon, 그리고 PBDB 의 10 Myr `bin`) — **모호한 연대**. "Middle Cambrian",
  "Late Triassic", "Paleozoic" 처럼 애초에 절 단위로 정해지지 않은 기록이다

이름 둘 가운데 하나라도 모호하면 모호하다. 015 는 연대 범위가 **절 하나 안에 드는지**(길이)로 갈랐는데,
연구자가 바로잡았다 — 절 여럿에 걸친 범위는 정의된 범위이고, 모호한 것은 절로 정해지지 않은 기록뿐이다.

이름표에 없는 이름은 정해진 것으로 본다(2026-09-29 의 PBDB 산지에는 없는 이름이 없다). 가공할 때 센다.

**제4기는 예외다**(tupandactyl 008) — 제4기(2.58 Ma 이후) 안의 이름은 등급이 세·기여도 정해진 기록으로 친다.
"Early Pleistocene"·"Pleistocene"·"Holocene"·"Quaternary" 모두 지도 시점의 창(±2.5 Myr)과 길이가 비슷하거나 짧아,
절로 적히지 않았어도 시점에 오르는 자리가 흐려지지 않는다. 연구자가 정한 범위다 — 신생대의 다른 세(Miocene 등)는 그대로 모호하다.
경계(2.58 Ma)는 층서표(timescale.py)에서 읽는다.
"""
import json

from .common import manifest, source_path

VAGUE_TYPES = ("epoch", "subepoch", "period", "era", "eon", "bin")
QUATERNARY = "quaternary"          # 제4기 안의 이름에 붙이는 등급 — 모호하지 않다(VAGUE_TYPES 에 없다)


def quaternary_base():
    """제4기의 바닥 나이(Ma) — 층서표 한 곳에서."""
    from .timescale import units
    return next(u["base"] for u in units() if u["en"] == "Quaternary")


def types_from(records, q_base=None):
    """PBDB 시대 이름표 → {이름: 등급}. 제4기 안(바닥 나이 ≤ 제4기 바닥)의 세·기 이름은 QUATERNARY 로 바꾼다.
    같은 이름이 두 등급으로 있으면(Holocene 은 epoch 이자 age) 모호하지 않은 쪽을 둔다."""
    q_base = quaternary_base() if q_base is None else q_base
    out = {}
    for r in records:
        name, kind = r["interval_name"], r.get("type") or ""
        base = r.get("b_age")
        if kind in VAGUE_TYPES and base is not None and float(base) <= q_base + 1e-9:
            kind = QUATERNARY
        if name in out and out[name] not in VAGUE_TYPES:
            continue
        out[name] = kind
    return out


def load_types():
    """시대 이름 → 등급(제4기 예외를 입힌 것)."""
    path = source_path(manifest("pbdb")["intervals"]["path"])
    if not path.exists():
        raise SystemExit(f"{path} 가 없다 — 먼저 `python -m pipeline fetch`")
    records = json.loads(path.read_text(encoding="utf-8")).get("records") or []
    return types_from(records)


def vague_names(types):
    """모호한 등급의 이름들 — 뷰어가 PBDB 에 바로 물은 결과(분류군 찾기)를 같은 규칙으로 가른다."""
    return sorted(name for name, kind in types.items() if kind in VAGUE_TYPES)


def is_vague(early, late, types):
    """산지의 연대가 모호한가 — 이름 둘 가운데 하나라도 절보다 넓은 등급이면."""
    return any(types.get(name) in VAGUE_TYPES for name in (early, late) if name)
