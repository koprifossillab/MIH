"""PBDB 퇴적 환경의 갈래 — 셋(바다·뭍·해안/기타) → 환경군 → PBDB 원 용어.

맨 위 셋은 EarthThruTime3D 의 바다·뭍 목록을 그대로 따른다(해안·석호·하구는 어느 쪽으로도
밀지 않는다). 가운데 환경군은 PBDB 의 환경 어휘(탄산염/쇄설성, 수심대, 하천·호수 등)를
묶은 것이다. 원 용어의 한글은 이 저장소가 붙인 풀이다 — 공식 번역이 따로 없다.

뷰어는 index.json 의 `environments` 로 이 나무를 받아 선택지를 그린다. 화석 JSON 에는
원 용어가 그대로 들어 있어, 나무를 고치면 화석을 다시 가공하지 않아도 된다.
"""

TREE = [
    ("m", "바다 환경", "Marine", [
        ("m-indet", "해양 미상", "Marine indet.", [
            "marine indet.",
        ]),
        ("m-carb-shallow", "탄산염 조간대·천해", "Carbonate peritidal–shallow subtidal", [
            "carbonate indet.", "peritidal", "shallow subtidal indet.", "open shallow subtidal",
            "lagoonal/restricted shallow subtidal", "sand shoal",
        ]),
        ("m-reef", "초(礁)·생물초", "Reefs and buildups", [
            "reef, buildup or bioherm", "perireef or subreef", "intrashelf/intraplatform reef",
            "platform/shelf-margin reef", "slope/ramp reef", "basin reef",
        ]),
        ("m-carb-deep", "탄산염 심조하대·외해", "Carbonate deep subtidal–offshore", [
            "deep subtidal ramp", "deep subtidal shelf", "deep subtidal indet.",
            "offshore ramp", "offshore shelf", "offshore indet.",
        ]),
        ("m-clastic-shore", "쇄설성 전빈·외빈", "Siliciclastic foreshore–shoreface", [
            "foreshore", "shoreface", "transition zone/lower shoreface",
        ]),
        ("m-clastic-offshore", "쇄설성 외해", "Siliciclastic offshore", [
            "offshore",
        ]),
        ("m-delta", "삼각주 전면·전삼각주", "Delta front–prodelta", [
            "delta front", "prodelta",
        ]),
        ("m-deep", "사면·분지·심해", "Slope, basin and deep water", [
            "slope", "basinal (carbonate)", "basinal (siliceous)", "basinal (siliciclastic)",
            "submarine fan", "deep-water indet.",
        ]),
    ]),
    ("t", "뭍 환경", "Terrestrial", [
        ("t-indet", "육상 미상", "Terrestrial indet.", [
            "terrestrial indet.",
        ]),
        ("t-fluvial", "하천", "Fluvial", [
            "fluvial indet.", '"channel"', "channel lag", "coarse channel fill", "fine channel fill",
            '"floodplain"', "wet floodplain", "dry floodplain", "crevasse splay", "levee",
            "alluvial fan",
        ]),
        ("t-lacustrine", "호수", "Lacustrine", [
            "fluvial-lacustrine indet.", "lacustrine indet.", "lacustrine - large",
            "lacustrine - small", "pond", "crater lake", "lacustrine deltaic indet.",
            "lacustrine delta plain", "lacustrine delta front", "lacustrine prodelta",
            "lacustrine interdistributary bay",
        ]),
        ("t-delta", "삼각주 평원", "Delta plain", [
            "deltaic indet.", "fluvial-deltaic indet.", "delta plain", "interdistributary bay",
        ]),
        ("t-mire", "늪·습지", "Mire/swamp", [
            "mire/swamp",
        ]),
        ("t-eolian", "풍성", "Eolian", [
            "eolian indet.", "dune", "interdune", "loess",
        ]),
        ("t-karst", "동굴·카르스트", "Cave and karst", [
            "cave", "fissure fill", "sinkhole", "karst indet.",
        ]),
        ("t-other", "빙하·샘·타르", "Glacial, spring, tar", [
            "glacial", "spring", "tar",
        ]),
    ]),
    ("o", "해안·기타·미상", "Marginal, other, unknown", [
        ("o-coastal", "해안·연안 미상", "Coastal / marginal marine indet.", [
            "coastal indet.", "marginal marine indet.", "paralic indet.",
        ]),
        ("o-estuary", "하구·만", "Estuary/bay", [
            "estuary/bay",
        ]),
        ("o-lagoon", "석호", "Lagoonal", [
            "lagoonal",
        ]),
        ("o-none", "기록 없음", "Not recorded", [
            "",
        ]),
    ]),
]

# 원 용어의 한글 풀이. 화면에서 원 용어 옆에 적는다.
KO = {
    "marine indet.": "해양 미상",
    "carbonate indet.": "탄산염 미상", "peritidal": "조간대 주변", "shallow subtidal indet.": "천해 조하대 미상",
    "open shallow subtidal": "개방 천해 조하대", "lagoonal/restricted shallow subtidal": "석호·제한 천해 조하대",
    "sand shoal": "모래 천퇴",
    "reef, buildup or bioherm": "초·생물초", "perireef or subreef": "초 주변·초 아래",
    "intrashelf/intraplatform reef": "대륙붕·탄산염대지 안 초", "platform/shelf-margin reef": "대지·대륙붕 가장자리 초",
    "slope/ramp reef": "사면·램프 초", "basin reef": "분지 초",
    "deep subtidal ramp": "심조하대 램프", "deep subtidal shelf": "심조하대 대륙붕", "deep subtidal indet.": "심조하대 미상",
    "offshore ramp": "외해 램프", "offshore shelf": "외해 대륙붕", "offshore indet.": "외해 미상",
    "foreshore": "전빈", "shoreface": "외빈", "transition zone/lower shoreface": "전이대·하부 외빈",
    "offshore": "외해",
    "delta front": "삼각주 전면", "prodelta": "전삼각주",
    "slope": "사면", "basinal (carbonate)": "분지(탄산염)", "basinal (siliceous)": "분지(규질)",
    "basinal (siliciclastic)": "분지(쇄설성)", "submarine fan": "해저 선상지", "deep-water indet.": "심해 미상",
    "terrestrial indet.": "육상 미상",
    "fluvial indet.": "하천 미상", '"channel"': "하도", "channel lag": "하도 잔류 퇴적",
    "coarse channel fill": "조립 하도 충전", "fine channel fill": "세립 하도 충전", '"floodplain"': "범람원",
    "wet floodplain": "습윤 범람원", "dry floodplain": "건조 범람원", "crevasse splay": "제방 붕괴 퇴적",
    "levee": "자연 제방", "alluvial fan": "선상지",
    "fluvial-lacustrine indet.": "하천·호수 미상", "lacustrine indet.": "호수 미상", "lacustrine - large": "큰 호수",
    "lacustrine - small": "작은 호수", "pond": "못", "crater lake": "화구호",
    "lacustrine deltaic indet.": "호수 삼각주 미상", "lacustrine delta plain": "호수 삼각주 평원",
    "lacustrine delta front": "호수 삼각주 전면", "lacustrine prodelta": "호수 전삼각주",
    "lacustrine interdistributary bay": "호수 분류간 만",
    "deltaic indet.": "삼각주 미상", "fluvial-deltaic indet.": "하천·삼각주 미상", "delta plain": "삼각주 평원",
    "interdistributary bay": "분류간 만",
    "mire/swamp": "늪·습지",
    "eolian indet.": "풍성 미상", "dune": "사구", "interdune": "사구 사이", "loess": "황토(뢰스)",
    "cave": "동굴", "fissure fill": "틈 충전", "sinkhole": "싱크홀", "karst indet.": "카르스트 미상",
    "glacial": "빙하", "spring": "샘", "tar": "타르",
    "coastal indet.": "해안 미상", "marginal marine indet.": "연안 미상", "paralic indet.": "해안 평야 미상",
    "estuary/bay": "하구·만", "lagoonal": "석호",
    "": "기록 없음",
}


def lookup():
    """원 용어 → (맨 위 갈래, 환경군)."""
    table = {}
    for top, _, _, groups in TREE:
        for key, _, _, terms in groups:
            for term in terms:
                table[term] = (top, key)
    return table


_LOOKUP = lookup()


def classify(environment):
    """원 용어 → (갈래 m/t/o, 환경군 id). PBDB 가 새 용어를 들이면 ("o", "o-unlisted") 로
    따로 모아, 조용히 다른 환경군에 섞이지 않게 한다."""
    return _LOOKUP.get((environment or "").strip(), ("o", "o-unlisted"))


def tree_for_index(counts=None):
    """index.json 에 싣는 꼴. counts 는 원 용어별 채집지 수(전체 자료)."""
    counts = counts or {}
    out = []
    for top, ko, en, groups in TREE:
        out.append({"id": top, "ko": ko, "en": en, "groups": [
            {"id": key, "ko": gko, "en": gen, "terms": [
                {"term": t, "ko": KO.get(t, t), "total": counts.get(t, 0)} for t in terms]}
            for key, gko, gen, terms in groups]})
    out[-1]["groups"].append({"id": "o-unlisted", "ko": "목록에 없는 용어", "en": "Unlisted term", "terms": []})
    return out
