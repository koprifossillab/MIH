"""산지의 연대가 절 단위로 정해졌는가 — PBDB 시대 이름의 등급으로 가른다(016).

산지 연대는 PBDB 가 시대 이름 하나나 둘(`early_interval`·`late_interval`)로 적는다. 그 이름의 등급이

- **절 단위 이하**(age·subage·zone·subzone·chron·subchron) — 연대가 정해진 기록. 이름이 둘이면 두 절 사이의
  정해진 범위다("Norian–Rhaetian"). 지역 절(Ivorian)·아절(Lacian)도 여기다
- **그 위**(epoch·subepoch·period·era·eon, 그리고 PBDB 의 10 Myr `bin`) — **모호한 연대**. "Middle Cambrian",
  "Late Triassic", "Paleozoic" 처럼 애초에 절 단위로 정해지지 않은 기록이다

이름 둘 가운데 하나라도 모호하면 모호하다. 015 는 연대 범위가 **절 하나 안에 드는지**(길이)로 갈랐는데,
연구자가 바로잡았다 — 절 여럿에 걸친 범위는 정의된 범위이고, 모호한 것은 절로 정해지지 않은 기록뿐이다.

이름표에 없는 이름은 정해진 것으로 본다(2026-09-29 의 PBDB 산지에는 없는 이름이 없다). 가공할 때 센다.
"""
import json

from .common import manifest, source_path

VAGUE_TYPES = ("epoch", "subepoch", "period", "era", "eon", "bin")


def load_types():
    """시대 이름 → 등급."""
    path = source_path(manifest("pbdb")["intervals"]["path"])
    if not path.exists():
        raise SystemExit(f"{path} 가 없다 — 먼저 `python -m pipeline fetch`")
    records = json.loads(path.read_text(encoding="utf-8")).get("records") or []
    return {r["interval_name"]: r.get("type") or "" for r in records}


def vague_names(types):
    """모호한 등급의 이름들 — 뷰어가 PBDB 에 바로 물은 결과(분류군 찾기)를 같은 규칙으로 가른다."""
    return sorted(name for name, kind in types.items() if kind in VAGUE_TYPES)


def is_vague(early, late, types):
    """산지의 연대가 모호한가 — 이름 둘 가운데 하나라도 절보다 넓은 등급이면."""
    return any(types.get(name) in VAGUE_TYPES for name in (early, late) if name)
