"""지구사의 큰 사건 — 대멸종 다섯과 그만한 규모의 전 지구 사건(tupandactyl 016).

    python -m pipeline events     # 지금 index.json 에 events 칸만 다시 붙인다(build 는 처음부터 싣는다)

뷰어는 index.json 의 `events` 로 받아 시점 막대 위의 표식·띠, 층서표의 책갈피, 산출 분포 막대의 세로선을 그린다.
**map.js 에 사건을 다시 적지 않는다.**

꼴은 둘이다(연구자와 정한 것, devlog P01).
- **pulse(박동)** — 길이가 지도 한 시점의 창(±2.5 Myr)보다 짧다. 시점 막대 위 표식 하나. 창 안의 여러 차례(오르도비스기 말의 둘)는
  나누지 않고 풀이에 적는다 — 지도에서 구분되지 않는다
- **interval(기간)** — 창보다 길다. 시점 막대 위 띠, 그 안의 박동을 `pulses` 로. 지금은 데본기 후기 위기 하나

등급: 1 = 대멸종 다섯(Big Five), 2 = Sinsk·토아르시움 규모의 전 지구 사건. **이름은 모두 영어로만, 풀이는 적지 않는다** — 중규모 사건은
마땅한 공식 번역이 없고 음차도 곤란하며, 화면에는 이름과 나이만 있으면 된다(연구자, tupandactyl 017). 근거 문헌(refs)은 남긴다.

나이는 층서 경계와 겹치면 `boundary`(그 경계 **위** 절의 영어 이름)로 적어 timescale.py 의 ICS 2024 값을 그대로 쓴다. 경계와 상관없는
나이는 문헌의 대략 값과 불확실 범위(`unc`)로 적는다. 규모의 수치는 문헌마다 달라 대표 값 하나만 적고 근거를 붙인다.
Kotlin crisis(~550 Ma)는 지도(540 Ma 부터) 앞이라 `outside` — 뷰어는 시점 막대 왼쪽 끝 밖에 표식만 둔다.
"""
import json

from .common import DERIVED
from .timescale import units

EVENTS = [
    dict(id="kotlin", tier=2, kind="pulse", en="Kotlin crisis", age=550.0, unc=2.0, outside=True,
         refs=["Evans et al. 2022, PNAS 119:e2207475119"]),
    dict(id="sinsk", tier=2, kind="pulse", en="Sinsk event", age=513.0, unc=1.5,
         refs=["Zhuravlev & Wood 1996, Geology 24:311–314"]),
    dict(id="lome", tier=1, kind="pulse", en="Late Ordovician mass extinction",
         boundary=("Hirnantian", "Rhuddanian"),
         refs=["Sheehan 2001, Annu. Rev. Earth Planet. Sci. 29:331–364", "Harper et al. 2014, Gondwana Res. 25:1294–1307"]),
    dict(id="lau", tier=2, kind="pulse", en="Lau event", age=424.0, unc=1.0,
         refs=["Jeppsson 1998, Bull. NY State Mus. 491:239–257", "Calner 2008, Geol. Soc. Lond. Spec. Publ. 302:87–113"]),
    dict(id="late-devonian", tier=1, kind="interval", en="Late Devonian biodiversity crisis",
         refs=["McGhee 2013, When the Invasion of Land Failed (Columbia Univ. Press)"],
         pulses=[
             dict(id="taghanic", tier=2, kind="pulse", en="Taghanic event", age=384.5, unc=1.0,
                  refs=["Aboussalam & Becker 2011, Palaeogeogr. Palaeoclimatol. Palaeoecol. 304:136–164"]),
             dict(id="kellwasser", tier=1, kind="pulse", en="Late Devonian mass extinction (Kellwasser)",
                  boundary=("Famennian",), big_five=True,
                  refs=["McGhee 1996, The Late Devonian Mass Extinction (Columbia Univ. Press)"]),
             dict(id="hangenberg", tier=2, kind="pulse", en="Hangenberg event", boundary=("Tournaisian",),
                  refs=["Kaiser et al. 2016, Geol. Soc. Lond. Spec. Publ. 423:387–437"]),
         ]),
    dict(id="capitanian", tier=2, kind="pulse", en="Capitanian (end-Guadalupian) extinction", boundary=("Wuchiapingian",),
         refs=["Wignall et al. 2009, Science 324:1179–1182", "Bond et al. 2010, Palaeogeogr. Palaeoclimatol. Palaeoecol. 292:282–294"]),
    dict(id="epme", tier=1, kind="pulse", en="End-Permian mass extinction", boundary=("Induan",),
         refs=["Burgess et al. 2014, PNAS 111:3316–3321", "Stanley 2016, PNAS 113:E6325–E6334"]),
    dict(id="cpe", tier=2, kind="pulse", en="Carnian Pluvial Episode", age=233.0, unc=1.0,
         refs=["Dal Corso et al. 2020, Sci. Adv. 6:eaba0099"]),
    dict(id="ete", tier=1, kind="pulse", en="End-Triassic mass extinction", boundary=("Hettangian",),
         refs=["Blackburn et al. 2013, Science 340:941–945"]),
    dict(id="toae", tier=2, kind="pulse", en="Toarcian Oceanic Anoxic Event", age=183.0, unc=0.5,
         refs=["Jenkyns 1988, Am. J. Sci. 288:101–151", "Jenkyns 2010, Geochem. Geophys. Geosyst. 11:Q03004"]),
    dict(id="oae2", tier=2, kind="pulse", en="Oceanic Anoxic Event 2 (Cenomanian–Turonian)", boundary=("Turonian",),
         refs=["Jenkyns 2010, Geochem. Geophys. Geosyst. 11:Q03004"]),
    dict(id="kpg", tier=1, kind="pulse", en="End-Cretaceous (K–Pg) mass extinction", boundary=("Danian",),
         refs=["Schulte et al. 2010, Science 327:1214–1218"]),
    dict(id="petm", tier=2, kind="pulse", en="Paleocene–Eocene Thermal Maximum (PETM)", boundary=("Ypresian",),
         refs=["McInerney & Wing 2011, Annu. Rev. Earth Planet. Sci. 39:489–516"]),
    dict(id="eot", tier=2, kind="pulse", en="Eocene–Oligocene Transition", boundary=("Rupelian",),
         refs=["Coxall et al. 2005, Nature 433:53–57", "Hutchinson et al. 2021, Clim. Past 17:269–315"]),
]


def _resolve(ev, base_of):
    """나이를 숫자로 — boundary 는 그 절의 하한(ICS 2024). 둘이면 (오래된 경계, 젊은 경계) 의 범위."""
    out = {k: v for k, v in ev.items() if k not in ("boundary", "pulses")}
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
