"""암상(lithology) 용어의 한글 — PBDB 산지의 lithology1·2 와 형용·굳기(tupandactyl 020).

    python -m pipeline lithology     # 지금 index.json 에 lithology 칸만 다시 붙인다(build 는 처음부터 싣는다)

뷰어는 Casual 모드에서 팝업의 암상을 이 표로 한글로 적는다(Scientific·영어판은 PBDB 원 용어). 용어는 PBDB 전체 산지에 실제로 나온
것 전부다(2026-10-01, 주 암상 54·형용 12). 표에 없는 용어가 새로 나오면 뷰어는 원 용어를 그대로 쓴다. **map.js 에 적지 않는다.**

이름은 대한지질학회 지질학 용어와 흔히 쓰는 말을 따랐다. 석회암의 던햄 분류(packstone·wackestone 등)는 마땅한 우리말이 없어 음차한다.
"""
import json

from .common import DERIVED

TERMS = {
    "limestone": "석회암", "not reported": "기록 없음", "sandstone": "사암", "shale": "셰일", "mudstone": "이암",
    "siltstone": "실트암", "claystone": "점토암", "siliciclastic": "규질쇄설암", "marl": "이회암", "calcareous ooze": "석회질 연니",
    "packstone": "팩스톤", "lime mudstone": "석회 이암", "wackestone": "와케스톤", "grainstone": "그레인스톤", "conglomerate": "역암",
    "dolomite": "백운암", "chalk": "백악", "carbonate": "탄산염암", "reef rocks": "초암(礁岩)", "chert": "처트", "amber": "호박",
    "mixed carbonate-siliciclastic": "탄산염·규질쇄설 혼합암", "rudstone": "러드스톤", "coal": "석탄", "bindstone": "바인드스톤",
    "framestone": "프레임스톤", "tuff": "응회암", "floatstone": "플로트스톤", "phosphorite": "인회암", "gravel": "자갈",
    "lignite": "갈탄", "volcaniclastic": "화산쇄설암", "breccia": "각력암", "ash": "화산재", "bafflestone": "배플스톤",
    "ironstone": "철암", "diatomite": "규조토", "slate": "점판암", "peat": "이탄", "quartzite": "규암", "evaporite": "증발암",
    "gypsum": "석고", "radiolarite": "방산충암", "tar": "타르", "coal ball": "탄구", "schist": "편암", "travertine": "트래버틴",
    "phyllite": "천매암", "siderite": "능철석", "bituminous coal": "역청탄", "anthracite": "무연탄", "subbituminous coal": "아역청탄",
    "pyrite": "황철석", "silicious ooze": "규질 연니",
}
ADJECTIVES = {
    "lithified": "고결", "unlithified": "미고결", "poorly lithified": "약고결", "calcareous": "석회질", "argillaceous": "점토질",
    "silty": "실트질", "sandy": "사질", "cherty/siliceous": "규질", "carbonaceous": "탄질", "muddy": "니질",
    "conglomeratic": "역질", "metamorphosed": "변성",
}


def for_index():
    return {"terms": TERMS, "adjectives": ADJECTIVES}


def attach():
    path = DERIVED / "index.json"
    index = json.loads(path.read_text(encoding="utf-8"))
    index["lithology"] = for_index()
    path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"암상 용어 {len(TERMS)}·형용 {len(ADJECTIVES)} -> {path}")
