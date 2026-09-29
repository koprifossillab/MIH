"""PBDB 퇴적 환경의 갈래 — 셋(해양기원·육상기원·미상) → 환경군 → PBDB 원 용어.

- 이름은 연구자가 화면에서 고친 것(2026-09-29)을 기본으로 삼았다. 원 용어의 한글도 그렇다
- 해안·연안 미상, 석호는 해양기원, 하구·만은 육상기원으로 둔다(연구자의 판단, devlog 003).
  첫 판은 이 셋을 어느 쪽으로도 밀지 않았다(EarthThruTime3D 의 지도 검사 규칙)
- **환경군의 순서는 퇴적상 순서다** — 해양기원은 해안→심해, 육상기원은 상류→하류. 미상은 끝.
  환경군 안의 원 용어도 같은 방향으로 두고, `… indet.` 는 끝에 둔다
- **색도 그 순서를 따른다** — 해양기원은 민트→에메랄드→짙은 청록(열대 바다), 육상기원은 주황→붉은색.
  `[미상]` 환경군은 그 갈래의 가운데 색이다. 미상 갈래는 흰색. 해양기원을 푸른 계열로 두었다가
  배경의 바다색에 묻혀 청록 계열로 바꿨다(devlog 007)

뷰어는 index.json 의 `environments` 로 이 나무를 받아 선택지와 점 색을 그린다. 화석 JSON 에는
원 용어가 그대로 들어 있어, 나무를 고쳐도 화석을 다시 가공하지 않아도 된다(목록만 다시 만든다).
"""

# (id, 이름, 영문, 색, [(id, 이름, 영문, 색, [원 용어 …])])
TREE = [
    ("m", "해양기원", "Marine", "#1fd1a1", [
        ("m-coastal", "해안·연안 [미상]", "Coastal / marginal marine indet.", "#a6f7d6", [
            "coastal indet.", "marginal marine indet.", "paralic indet.",
        ]),
        ("m-lagoon", "석호", "Lagoonal", "#84f2cb", [
            "lagoonal",
        ]),
        ("m-clastic-shore", "쇄설성 전빈·외빈", "Siliciclastic foreshore–shoreface", "#62ebbd", [
            "foreshore", "shoreface", "transition zone/lower shoreface",
        ]),
        ("m-delta", "삼각주 전면부·전삼각주", "Delta front–prodelta", "#44e0ae", [
            "delta front", "prodelta",
        ]),
        ("m-carb-shallow", "탄산염 조간대·천해성 조하대", "Carbonate peritidal–shallow subtidal", "#2ad3a0", [
            "peritidal", "lagoonal/restricted shallow subtidal", "open shallow subtidal", "sand shoal",
            "shallow subtidal indet.", "carbonate indet.",
        ]),
        ("m-reef", "생물초", "Reefs and buildups", "#14c292", [
            "reef, buildup or bioherm", "perireef or subreef", "intrashelf/intraplatform reef",
            "platform/shelf-margin reef", "slope/ramp reef", "basin reef",
        ]),
        ("m-clastic-offshore", "쇄설성 외해", "Siliciclastic offshore", "#0fad85", [
            "offshore",
        ]),
        ("m-carb-deep", "탄산염 심조하대·외해", "Carbonate deep subtidal–offshore", "#0c9577", [
            "deep subtidal ramp", "deep subtidal shelf", "deep subtidal indet.",
            "offshore ramp", "offshore shelf", "offshore indet.",
        ]),
        ("m-deep", "경사면·분지·심해", "Slope, basin and deep water", "#0a7a66", [
            "slope", "submarine fan", "basinal (carbonate)", "basinal (siliceous)",
            "basinal (siliciclastic)", "deep-water indet.",
        ]),
        ("m-indet", "해양 [미상]", "Marine indet.", "#1fd1a1", [
            "marine indet.",
        ]),
    ]),
    ("t", "육상기원", "Terrestrial", "#f26a2e", [
        ("t-eolian", "풍성", "Eolian", "#ffb44a", [
            "dune", "interdune", "loess", "eolian indet.",
        ]),
        ("t-karst", "동굴·카르스트", "Cave and karst", "#ffa03d", [
            "cave", "sinkhole", "fissure fill", "karst indet.",
        ]),
        ("t-fluvial", "하상", "Fluvial", "#ff8b32", [
            "alluvial fan", '"channel"', "channel lag", "coarse channel fill", "fine channel fill",
            "levee", "crevasse splay", '"floodplain"', "wet floodplain", "dry floodplain", "fluvial indet.",
        ]),
        ("t-lacustrine", "호상", "Lacustrine", "#fb752b", [
            "lacustrine - large", "lacustrine - small", "pond", "crater lake",
            "lacustrine delta plain", "lacustrine interdistributary bay", "lacustrine delta front",
            "lacustrine prodelta", "lacustrine deltaic indet.", "lacustrine indet.",
            "fluvial-lacustrine indet.",
        ]),
        ("t-mire", "습지", "Mire/swamp", "#f15d26", [
            "mire/swamp",
        ]),
        ("t-delta", "삼각주 평원", "Delta plain", "#e44823", [
            "delta plain", "interdistributary bay", "fluvial-deltaic indet.", "deltaic indet.",
        ]),
        ("t-estuary", "하구·만", "Estuary/bay", "#d53421", [
            "estuary/bay",
        ]),
        ("t-other", "빙하·샘·타르", "Glacial, spring, tar", "#bf2121", [
            "glacial", "spring", "tar",
        ]),
        ("t-indet", "육상 [미상]", "Terrestrial indet.", "#f26a2e", [
            "terrestrial indet.",
        ]),
    ]),
    ("o", "미상", "Unknown", "#f5f5f5", [
        ("o-none", "기록 없음", "Not recorded", "#f5f5f5", [
            "",
        ]),
    ]),
]
UNLISTED = ("o-unlisted", "목록에 없는 용어", "Unlisted term", "#f5f5f5")

# 원 용어의 한글. 연구자가 고친 것이 대부분이고, 나머지는 이 저장소가 붙인 풀이다.
KO = {
    "marine indet.": "해양 [미상]",
    "coastal indet.": "해안 [미상]", "marginal marine indet.": "연안 [미상]", "paralic indet.": "해안 평야 [미상]",
    "lagoonal": "석호",
    "foreshore": "전빈", "shoreface": "외빈", "transition zone/lower shoreface": "전이대·하부 외빈",
    "delta front": "삼각주 전면부", "prodelta": "전삼각주",
    "peritidal": "조간대", "lagoonal/restricted shallow subtidal": "천해성 조하대 [석호/고립성]",
    "open shallow subtidal": "천해성 조하대 [개방성]", "sand shoal": "사질 천퇴",
    "shallow subtidal indet.": "천해성 조하대 [미상]", "carbonate indet.": "탄산염 [미상]",
    "reef, buildup or bioherm": "생물초", "perireef or subreef": "생물초 [연변부/하부]",
    "intrashelf/intraplatform reef": "생물초 [대륙붕/탄산염대지]",
    "platform/shelf-margin reef": "생물초 [대지/대륙붕 연변부]",
    "slope/ramp reef": "생물초 [경사면/완사면]", "basin reef": "생물초 [분지]",
    "offshore": "외해",
    "deep subtidal ramp": "심조하대 [완사면]", "deep subtidal shelf": "심조하대 [대륙붕]",
    "deep subtidal indet.": "심조하대 [미상]",
    "offshore ramp": "외해 [완사면]", "offshore shelf": "외해 [대륙붕]", "offshore indet.": "외해 [미상]",
    "slope": "경사면", "submarine fan": "해저 선상지", "basinal (carbonate)": "분지 [탄산염]",
    "basinal (siliceous)": "분지 [규질]", "basinal (siliciclastic)": "분지 [쇄설성]",
    "deep-water indet.": "심해 [미상]",
    "terrestrial indet.": "육상 [미상]",
    "dune": "사구", "interdune": "사구간", "loess": "뢰스", "eolian indet.": "풍성 [미상]",
    "cave": "동굴", "sinkhole": "싱크홀", "fissure fill": "균열충진", "karst indet.": "카르스트 [미상]",
    "alluvial fan": "선상지", '"channel"': "하도", "channel lag": "하도 [잔류퇴적]",
    "coarse channel fill": "하도 [조립충전]", "fine channel fill": "하도 [세립충전]",
    "levee": "자연 제방", "crevasse splay": "틈상퇴적체", '"floodplain"': "범람원",
    "wet floodplain": "범람원 [습윤]", "dry floodplain": "범람원 [건조]", "fluvial indet.": "하상 [미상]",
    "lacustrine - large": "호수 [대규모]", "lacustrine - small": "호수 [소규모]", "pond": "못",
    "crater lake": "화구호", "lacustrine delta plain": "호성 삼각주 [평원]",
    "lacustrine interdistributary bay": "호중만", "lacustrine delta front": "호성 삼각주 [전면부]",
    "lacustrine prodelta": "호성 삼각주 [전삼각주]", "lacustrine deltaic indet.": "호성 삼각주 [미상]",
    "lacustrine indet.": "호수 [미상]", "fluvial-lacustrine indet.": "하상·호상 [미상]",
    "mire/swamp": "습지",
    "delta plain": "삼각주 평원", "interdistributary bay": "하중만",
    "fluvial-deltaic indet.": "하상·삼각주 [미상]", "deltaic indet.": "삼각주 [미상]",
    "estuary/bay": "하구·만",
    "glacial": "빙하", "spring": "샘", "tar": "타르",
    "": "기록 없음",
}


def lookup():
    """원 용어 → (맨 위 갈래, 환경군)."""
    table = {}
    for top, _, _, _, groups in TREE:
        for key, _, _, _, terms in groups:
            for term in terms:
                table[term] = (top, key)
    return table


_LOOKUP = lookup()


def classify(environment):
    """원 용어 → (갈래 m/t/o, 환경군 id). PBDB 가 새 용어를 들이면 ("o", "o-unlisted") 로
    따로 모아, 조용히 다른 환경군에 섞이지 않게 한다."""
    return _LOOKUP.get((environment or "").strip(), ("o", UNLISTED[0]))


def tree_for_index(counts=None):
    """index.json 에 싣는 꼴. counts 는 원 용어별 채집지 수(전체 자료)."""
    counts = counts or {}
    out = []
    for top, ko, en, color, groups in TREE:
        out.append({"id": top, "ko": ko, "en": en, "color": color, "groups": [
            {"id": key, "ko": gko, "en": gen, "color": gcolor, "terms": [
                {"term": t, "ko": KO.get(t, t), "total": counts.get(t, 0)} for t in terms]}
            for key, gko, gen, gcolor, terms in groups]})
    gid, gko, gen, gcolor = UNLISTED
    out[-1]["groups"].append({"id": gid, "ko": gko, "en": gen, "color": gcolor, "terms": []})
    return out
