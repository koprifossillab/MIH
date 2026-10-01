"""지구사의 큰 사건 — 대멸종 다섯과 그만한 규모의 전 지구 사건(tupandactyl 016).

    python -m pipeline events     # 지금 index.json 에 events 칸만 다시 붙인다(build 는 처음부터 싣는다)

뷰어는 index.json 의 `events` 로 받아 시점 막대 위의 표식·띠, 패널의 사건 카드, 산출 분포 막대의 세로선을 그린다.
**map.js 에 사건을 다시 적지 않는다.**

꼴은 둘이다(연구자와 정한 것, devlog P01).
- **pulse(박동)** — 길이가 지도 한 시점의 창(±2.5 Myr)보다 짧다. 시점 막대 위 표식 하나. 창 안의 여러 차례(오르도비스기 말의 둘)는
  나누지 않고 풀이에 적는다 — 지도에서 구분되지 않는다
- **interval(기간)** — 창보다 길다. 시점 막대 위 띠, 그 안의 박동을 `pulses` 로. 지금은 데본기 후기 위기 하나

등급: 1 = 대멸종 다섯(Big Five), 2 = Sinsk·토아르시움 규모의 전 지구 사건. **이름은 1 등급만 한글이 있고 2 등급은 영어로만 적는다** —
마땅한 공식 번역이 없고 음차도 곤란하다(연구자). 풀이(cause)는 한·영 둘 다.

나이는 층서 경계와 겹치면 `boundary`(그 경계 **위** 절의 영어 이름)로 적어 timescale.py 의 ICS 2024 값을 그대로 쓴다. 경계와 상관없는
나이는 문헌의 대략 값과 불확실 범위(`unc`)로 적는다. 규모의 수치는 문헌마다 달라 대표 값 하나만 적고 근거를 붙인다.
Kotlin crisis(~550 Ma)는 지도(540 Ma 부터) 앞이라 `outside` — 뷰어는 시점 막대 왼쪽 끝 밖에 표식만 둔다.
"""
import json

from .common import DERIVED
from .timescale import units

EVENTS = [
    dict(id="kotlin", tier=2, kind="pulse", en="Kotlin crisis", age=550.0, unc=2.0, outside=True,
         cause=("에디아카라기 후기 White Sea 생물군에서 Nama 생물군으로 넘어가며 에디아카라 생물의 속 약 80 % 가 사라진다 — 알려진 첫 동물 멸종. "
                "해양 무산소가 원인으로 꼽힌다",
                "First known animal extinction: about 80 % of Ediacaran genera vanish across the White Sea–Nama transition, "
                "linked to marine anoxia"),
         refs=["Evans et al. 2022, PNAS 119:e2207475119"]),
    dict(id="sinsk", tier=2, kind="pulse", en="Sinsk event", age=513.0, unc=1.5,
         cause=("캄브리아기 제4절(보토마) 해양 무산소 — 고배류 초(礁)가 무너지고 초기 동물의 다양성이 크게 준다",
                "Cambrian Stage 4 (Botoman) marine anoxia; archaeocyath reefs collapse and early animal diversity drops"),
         refs=["Zhuravlev & Wood 1996, Geology 24:311–314"]),
    dict(id="lome", tier=1, kind="pulse", ko="오르도비스기 말 대멸종", en="Late Ordovician mass extinction",
         boundary=("Hirnantian", "Rhuddanian"),
         cause=("곤드와나 빙하작용과 해수면 하강, 이어진 해양 무산소 — 허난트절에 두 차례. 해양 종 약 85 % 가 사라진다",
                "Gondwanan glaciation, sea-level fall and ensuing anoxia, in two pulses through the Hirnantian; ~85 % of marine species lost"),
         refs=["Sheehan 2001, Annu. Rev. Earth Planet. Sci. 29:331–364", "Harper et al. 2014, Gondwana Res. 25:1294–1307"]),
    dict(id="lau", tier=2, kind="pulse", en="Lau event", age=424.0, unc=1.0,
         cause=("실루리아기 루드퍼드절 — 탄소 동위원소의 큰 양(+)의 이상과 함께 코노돈트·어류·완족류가 크게 준다",
                "Ludfordian (Silurian) extinction of conodonts, fishes and brachiopods with a large positive carbon-isotope excursion"),
         refs=["Jeppsson 1998, Bull. NY State Mus. 491:239–257", "Calner 2008, Geol. Soc. Lond. Spec. Publ. 302:87–113"]),
    dict(id="late-devonian", tier=1, kind="interval", ko="데본기 후기 생물 다양성 위기", en="Late Devonian biodiversity crisis",
         cause=("2 천만 년 남짓 이어진 여러 차례의 멸종 — 해양 무산소가 되풀이되고 초 생태계가 무너진다. 위기 전체로 해양 종 약 75 % 가 사라진다",
                "A protracted crisis of repeated anoxic pulses over ~25 Myr that dismantled reef ecosystems; ~75 % of marine species lost overall"),
         refs=["McGhee 2013, When the Invasion of Land Failed (Columbia Univ. Press)"],
         pulses=[
             dict(id="taghanic", tier=2, kind="pulse", en="Taghanic event", age=384.5, unc=1.0,
                  cause=("지베절 후기 해침과 무산소 — 암모노이드·완족류·산호가 크게 준다",
                         "Late Givetian transgression and anoxia hitting ammonoids, brachiopods and corals"),
                  refs=["Aboussalam & Becker 2011, Palaeogeogr. Palaeoclimatol. Palaeoecol. 304:136–164"]),
             dict(id="kellwasser", tier=1, kind="pulse", ko="데본기 후기 대멸종 (켈바서)", en="Late Devonian mass extinction (Kellwasser)",
                  boundary=("Famennian",), big_five=True,
                  cause=("프랜절–파멘절 경계의 두 차례 해양 무산소(켈바서 층) — 층공충·산호 초와 열대 해양 생물이 무너진다. 대멸종 다섯 가운데 하나의 본체",
                         "Two anoxic Kellwasser horizons at the Frasnian–Famennian boundary; stromatoporoid–coral reefs and tropical marine life collapse"),
                  refs=["McGhee 1996, The Late Devonian Mass Extinction (Columbia Univ. Press)"]),
             dict(id="hangenberg", tier=2, kind="pulse", en="Hangenberg event", boundary=("Tournaisian",),
                  cause=("데본기–석탄기 경계 직전의 무산소와 빙하 — 판피어가 사라지고 암모노이드·척추동물이 크게 준다",
                         "Anoxia and glaciation just below the Devonian–Carboniferous boundary; placoderms vanish, ammonoids and vertebrates hit hard"),
                  refs=["Kaiser et al. 2016, Geol. Soc. Lond. Spec. Publ. 423:387–437"]),
         ]),
    dict(id="capitanian", tier=2, kind="pulse", en="Capitanian (end-Guadalupian) extinction", boundary=("Wuchiapingian",),
         cause=("어메이산 대규모 화성암 지대의 분출과 함께 — 푸줄리나·완족류·초가 크게 준다",
                "Coincides with Emeishan large igneous province volcanism; fusulinids, brachiopods and reefs decline"),
         refs=["Wignall et al. 2009, Science 324:1179–1182", "Bond et al. 2010, Palaeogeogr. Palaeoclimatol. Palaeoecol. 292:282–294"]),
    dict(id="epme", tier=1, kind="pulse", ko="페름기 말 대멸종", en="End-Permian mass extinction", boundary=("Induan",),
         cause=("시베리아 트랩 분출 — 급격한 온난화·해양 산성화·무산소. 6 만 년 안에 해양 종 약 81 % 가 사라진다. 지구사 최대의 멸종",
                "Siberian Traps volcanism drove warming, ocean acidification and anoxia; ~81 % of marine species lost within ~60 kyr — the largest extinction"),
         refs=["Burgess et al. 2014, PNAS 111:3316–3321", "Stanley 2016, PNAS 113:E6325–E6334"]),
    dict(id="cpe", tier=2, kind="pulse", en="Carnian Pluvial Episode", age=233.0, unc=1.0,
         cause=("랭겔리아 대규모 화성암 지대와 함께 습윤한 시기 — 해양 생물이 바뀌고 공룡이 퍼지기 시작한다",
                "A humid interval tied to Wrangellia volcanism; marine turnover and the start of the dinosaur radiation"),
         refs=["Dal Corso et al. 2020, Sci. Adv. 6:eaba0099"]),
    dict(id="ete", tier=1, kind="pulse", ko="트라이아스기 말 대멸종", en="End-Triassic mass extinction", boundary=("Hettangian",),
         cause=("중앙 대서양 마그마 지대(CAMP) 분출 — 해양 속의 절반 가까이가 사라지고 공룡이 육상을 차지한다",
                "Central Atlantic Magmatic Province (CAMP) eruptions; nearly half of marine genera lost, dinosaurs take over on land"),
         refs=["Blackburn et al. 2013, Science 340:941–945"]),
    dict(id="toae", tier=2, kind="pulse", en="Toarcian Oceanic Anoxic Event", age=183.0, unc=0.5,
         cause=("카루–페라 대규모 화성암 지대와 함께 해양 무산소 — 해양 무척추동물이 크게 준다",
                "Ocean anoxia linked to Karoo–Ferrar volcanism; marked marine invertebrate extinction"),
         refs=["Jenkyns 1988, Am. J. Sci. 288:101–151", "Jenkyns 2010, Geochem. Geophys. Geosyst. 11:Q03004"]),
    dict(id="oae2", tier=2, kind="pulse", en="Oceanic Anoxic Event 2 (Cenomanian–Turonian)", boundary=("Turonian",),
         cause=("세노마눔절–투로니아절 경계의 전 지구 해양 무산소 — 해양 미화석과 무척추동물이 바뀐다",
                "Global ocean anoxia at the Cenomanian–Turonian boundary; turnover of marine microfossils and invertebrates"),
         refs=["Jenkyns 2010, Geochem. Geophys. Geosyst. 11:Q03004"]),
    dict(id="kpg", tier=1, kind="pulse", ko="백악기 말 대멸종", en="End-Cretaceous (K–Pg) mass extinction", boundary=("Danian",),
         cause=("칙술루브 소행성 충돌(데칸 트랩 분출과 겹친다) — 비조류 공룡과 암모나이트가 사라지고 종 약 76 % 가 사라진다",
                "Chicxulub impact (overlapping Deccan Traps volcanism); non-avian dinosaurs and ammonites vanish, ~76 % of species lost"),
         refs=["Schulte et al. 2010, Science 327:1214–1218"]),
    dict(id="petm", tier=2, kind="pulse", en="Paleocene–Eocene Thermal Maximum (PETM)", boundary=("Ypresian",),
         cause=("탄소가 대량으로 풀려 수천 년 사이에 5 ℃ 남짓 따뜻해진다 — 심해 저서 유공충이 크게 사라지고 포유류가 퍼진다",
                "Massive carbon release and ~5 °C warming within millennia; deep-sea benthic foraminifera extinction and mammal dispersal"),
         refs=["McInerney & Wing 2011, Annu. Rev. Earth Planet. Sci. 39:489–516"]),
    dict(id="eot", tier=2, kind="pulse", en="Eocene–Oligocene Transition", boundary=("Rupelian",),
         cause=("남극 빙상이 처음 크게 자라며 냉각 — 온실 지구에서 빙하 지구로",
                "Onset of large Antarctic ice sheets and global cooling — from greenhouse to icehouse"),
         refs=["Coxall et al. 2005, Nature 433:53–57", "Hutchinson et al. 2021, Clim. Past 17:269–315"]),
]


def _resolve(ev, base_of):
    """나이를 숫자로 — boundary 는 그 절의 하한(ICS 2024). 둘이면 (오래된 경계, 젊은 경계) 의 범위."""
    out = {k: v for k, v in ev.items() if k not in ("boundary", "pulses", "cause")}
    out["cause"] = {"ko": ev["cause"][0], "en": ev["cause"][1]}
    out["ko"] = ev.get("ko") or ev["en"]           # 2 등급은 영어 이름뿐이다(연구자)
    if "boundary" in ev:
        ages = [base_of[name] for name in ev["boundary"]]
        out["old"], out["young"] = max(ages), min(ages)
        out["age"] = round((out["old"] + out["young"]) / 2, 3)
    elif "age" in ev:
        out["old"], out["young"] = ev["age"] + ev.get("unc", 0), ev["age"] - ev.get("unc", 0)
    if ev.get("pulses"):
        out["pulses"] = [_resolve(p, base_of) for p in ev["pulses"]]
        out["old"] = max(p["old"] for p in out["pulses"])
        out["young"] = min(p["young"] for p in out["pulses"])
        out["age"] = round((out["old"] + out["young"]) / 2, 3)
    out["old"], out["young"] = round(out["old"], 3), round(out["young"], 3)
    return out


def events_for_index():
    """index.json 에 싣는 꼴 — 나이를 숫자(old·age·young)로 풀고 오래된 것부터."""
    base_of = {u["en"]: u["base"] for u in units() if u["rank"] == "age"}
    return sorted((_resolve(ev, base_of) for ev in EVENTS), key=lambda e: -e["old"])


def attach():
    """`python -m pipeline events` — 지금 목록에 사건만 다시 붙인다. 배경·화석을 다시 만들지 않는다."""
    path = DERIVED / "index.json"
    index = json.loads(path.read_text(encoding="utf-8"))
    index["events"] = events_for_index()
    path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"사건 {len(index['events'])} 건 -> {path}")
