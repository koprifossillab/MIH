"""국제지질연대층서표 — 현생누대(와 540 Ma 지도가 걸치는 에디아카라기).

- **이름**은 국제지질연대층서표 한글판 v2023/04(대한지질학회 옮김,
  stratigraphy.org/ICSchart/ChronostratChart2023-04Korean.jpg)의 표기다.
- **경계 나이**는 v2024/12(stratigraphy.org/ICSchart/ChronostratChart2024-12Korean.jpg)의
  값이다. 두 판의 이름은 현생누대에서 같고, 경계는 2024 판에서 여럿 바뀌었다
  (예: 랑게절 15.97→15.98, 루테티아절 47.8→48.07, 베리아절 ~145.0→143.1).
- **색**은 2024/12 한글판 그림에서 칸마다 뽑은 값이다(ICS/CGMW 색).

적는 법: 대 → 기 → (아기) → 세 → 절. 절은 젊은 것부터 적고 **하한(base)** 만 적는다.
상한은 바로 앞(더 젊은) 절의 하한이다. 위 단위의 상·하한은 아래 단위에서 계산한다.
`전기·중기·후기` 세는 이름이 겹치므로 화면에서는 기 이름을 붙여 부른다(`백악기 후기`).
"""

# (한글, 영문, 색, 아래 단위들) — 절은 (한글, 영문, 하한 Ma, 색)
S = lambda ko, en, base, color: (ko, en, base, color)   # noqa: E731

CHART = [
    ("신생대", "Cenozoic", "#f5ed30", [
        ("제4기", "Quaternary", "#fff79a", [
            ("홀로세", "Holocene", "#fee6ca", [
                S("메갈라야절", "Meghalayan", 0.0042, "#fce8e7"),
                S("노스그립절", "Northgrippian", 0.0082, "#ffe6df"),
                S("그린란드절", "Greenlandian", 0.0117, "#fee7d5"),
            ]),
            ("플라이스토세", "Pleistocene", "#ffeeac", [
                S("후기", "Upper Pleistocene", 0.129, "#fef2da"),
                S("지바절", "Chibanian", 0.774, "#fff0cf"),
                S("칼라브리아절", "Calabrian", 1.80, "#fff0c7"),
                S("젤라절", "Gelasian", 2.58, "#ffefbc"),
            ]),
        ]),
        ("신진기", "Neogene", "#fedf2d", [
            ("플라이오세", "Pliocene", "#fffab1", [
                S("피아첸차절", "Piacenzian", 3.600, "#fffbcc"),
                S("장클레절", "Zanclean", 5.333, "#fffac3"),
            ]),
            ("마이오세", "Miocene", "#fff300", [
                S("메시나절", "Messinian", 7.246, "#fff890"),
                S("토르토나절", "Tortonian", 11.63, "#fff685"),
                S("세라발레절", "Serravallian", 13.82, "#fff579"),
                S("랑게절", "Langhian", 15.98, "#fef56c"),
                S("부르디갈라절", "Burdigalian", 20.45, "#fff35f"),
                S("아킨텐절", "Aquitanian", 23.04, "#fff34d"),
            ]),
        ]),
        ("고진기", "Paleogene", "#faa971", [
            ("올리고세", "Oligocene", "#fac591", [
                S("카티절", "Chattian", 27.30, "#fde4bb"),
                S("루펠절", "Rupelian", 33.9, "#fddbab"),
            ]),
            ("에오세", "Eocene", "#f9bd89", [
                S("프리아보나절", "Priabonian", 37.71, "#fcd1af"),
                S("바턴절", "Bartonian", 41.03, "#fdc7a3"),
                S("루테티아절", "Lutetian", 48.07, "#fabf97"),
                S("이퍼르절", "Ypresian", 56.00, "#fbb38d"),
            ]),
            ("팔레오세", "Paleocene", "#fbb480", [
                S("타넷절", "Thanetian", 59.24, "#fdc789"),
                S("셀란절", "Selandian", 61.66, "#fcc680"),
                S("다니아절", "Danian", 66.00, "#fcbc7f"),
            ]),
        ]),
    ]),
    ("중생대", "Mesozoic", "#47c7ec", [
        ("백악기", "Cretaceous", "#88c871", [
            ("후기", "Late", "#afd570", [
                S("마스트리히트절", "Maastrichtian", 72.2, "#f4f3a3"),
                S("캄파이나절", "Campanian", 83.6, "#eaed9c"),
                S("산토눔절", "Santonian", 85.7, "#dfe792"),
                S("코냑절", "Coniacian", 89.8, "#d3e488"),
                S("투로니아절", "Turonian", 93.9, "#c6de7e"),
                S("세노마눔절", "Cenomanian", 100.5, "#bbd975"),
            ]),
            ("전기", "Early", "#94cd7e", [
                S("알바절", "Albian", 113.2, "#d0e5ad"),
                S("압트절", "Aptian", 121.4, "#c3dfa2"),
                S("바렘절", "Barremian", 125.77, "#b8db9b"),
                S("오트리브절", "Hauterivian", 132.6, "#acd593"),
                S("발랑절", "Valanginian", 137.05, "#9ed28a"),
                S("베리아절", "Berriasian", 143.1, "#91ce81"),
            ]),
        ]),
        ("쥐라기", "Jurassic", "#00b9e7", [
            ("후기", "Late", "#abe1fb", [
                S("티토누스절", "Tithonian", 149.2, "#d4efff"),
                S("킴머리지절", "Kimmeridgian", 154.8, "#c9eafd"),
                S("옥스퍼드절", "Oxfordian", 161.5, "#b8e5fa"),
            ]),
            ("중기", "Middle", "#70d0e9", [
                S("칼로비움절", "Callovian", 165.3, "#bce4f0"),
                S("바토니움절", "Bathonian", 168.2, "#ade1ef"),
                S("바조카에절", "Bajocian", 170.9, "#a0dbed"),
                S("알렌절", "Aalenian", 174.7, "#90d6ef"),
            ]),
            ("전기", "Early", "#00b5ec", [
                S("토아르시움절", "Toarcian", 184.2, "#90cff2"),
                S("플린스바흐절", "Pliensbachian", 192.9, "#72c7f0"),
                S("시네무룸절", "Sinemurian", 199.5, "#4ac0f0"),
                S("에탕주절", "Hettangian", 201.4, "#15b9ee"),
            ]),
        ]),
        ("트라이아스기", "Triassic", "#9053a3", [
            ("후기", "Late", "#bb9fc8", [
                S("래티아절", "Rhaetian", 205.7, "#dec4dd"),
                S("노릭절", "Norian", 227.3, "#d3b6d5"),
                S("카닉절", "Carnian", 237.0, "#c8aace"),
            ]),
            ("중기", "Middle", "#b283ba", [
                S("라딘절", "Ladinian", 241.464, "#c798c6"),
                S("아니수스절", "Anisian", 246.7, "#bc8ebf"),
            ]),
            ("전기", "Early", "#a05ea6", [
                S("올레네크절", "Olenekian", 249.9, "#b371af"),
                S("인더스절", "Induan", 251.902, "#aa67ac"),
            ]),
        ]),
    ]),
    ("고생대", "Paleozoic", "#9ec2a6", [
        ("페름기", "Permian", "#e86549", [
            ("러핑세", "Lopingian", "#f8b5a4", [
                S("창싱절", "Changhsingian", 254.14, "#fac9bb"),
                S("우지아핑절", "Wuchiapingian", 259.51, "#fabfaf"),
            ]),
            ("과달루페세", "Guadalupian", "#f68d77", [
                S("캐피탄절", "Capitanian", 264.28, "#f8aa96"),
                S("워드절", "Wordian", 266.9, "#fa9f8c"),
                S("로드절", "Roadian", 274.4, "#f69781"),
            ]),
            ("시스우랄세", "Cisuralian", "#e87862", [
                S("쿤구르절", "Kungurian", 283.3, "#e09a8e"),
                S("아르틴스크절", "Artinskian", 290.1, "#e09383"),
                S("사크마라절", "Sakmarian", 293.52, "#e18878"),
                S("아셀절", "Asselian", 298.9, "#e1806d"),
            ]),
        ]),
        ("석탄기", "Carboniferous", "#67aeb2", [
            # 아기(亞紀). 세는 아기 이름을 붙여 부른다(`펜실베니아아기 후기`).
            ("펜실베니아아기", "Pennsylvanian", "#7dbdc7", [
                ("후기", "Late", "#bfd0ca", [
                    S("그젤절", "Gzhelian", 303.7, "#cbd4d1"),
                    S("카시모프절", "Kasimovian", 307.0, "#bed0d0"),
                ]),
                ("중기", "Middle", "#a6c8c7", [S("모스코바절", "Moscovian", 315.2, "#b1cec9")]),
                ("전기", "Early", "#8bc0c6", [S("바시키르절", "Bashkirian", 323.4, "#98c5ca")]),
            ]),
            ("미시시피아기", "Mississippian", "#719f85", [
                ("후기", "Late", "#b9c08c", [S("세르푸호프절", "Serpukhovian", 330.3, "#c3c48b")]),
                ("중기", "Middle", "#a0ba8b", [S("비제절", "Visean", 346.7, "#aebc89")]),
                ("전기", "Early", "#89b28a", [S("투르네절", "Tournaisian", 358.86, "#95b68b")]),
            ]),
        ]),
        ("데본기", "Devonian", "#cf9c5b", [
            ("후기", "Late", "#f1e0b2", [
                S("파멘절", "Famennian", 372.15, "#f1edd0"),
                S("프랜절", "Frasnian", 382.31, "#f2ebbd"),
            ]),
            ("중기", "Middle", "#f1cc86", [
                S("지베절", "Givetian", 387.95, "#f3de9d"),
                S("아이펠절", "Eifelian", 393.47, "#f2d392"),
            ]),
            ("전기", "Early", "#e4b370", [
                S("엠즈절", "Emsian", 410.62, "#e6d192"),
                S("프라하절", "Pragian", 413.02, "#e8c784"),
                S("로치코프절", "Lochkovian", 419.62, "#e6be79"),
            ]),
        ]),
        ("실루리아기", "Silurian", "#b3deca", [
            # 프리돌리세는 절로 나뉘지 않았다. 층서표의 절 칸이 비어 있다.
            ("프리돌리세", "Pridoli", "#e3f3e9", 422.7),
            ("러들로세", "Ludlow", "#bbe4dc", [
                S("로드포드절", "Ludfordian", 425.0, "#d7edea"),
                S("고스티절", "Gorstian", 426.7, "#c9e9e6"),
            ]),
            ("웬록세", "Wenlock", "#b2e0d3", [
                S("호머절", "Homerian", 430.6, "#cae8dc"),
                S("셰인우드절", "Sheinwoodian", 432.9, "#c0e2d4"),
            ]),
            ("란도베리세", "Llandovery", "#97d7c9", [
                S("텔리치절", "Telychian", 438.6, "#bce5dd"),
                S("에어론절", "Aeronian", 440.5, "#b1dfd4"),
                S("루단절", "Rhuddanian", 443.1, "#a6d9ca"),
            ]),
        ]),
        ("오르도비스기", "Ordovician", "#00a989", [
            ("후기", "Late", "#7dccad", [
                S("허난트절", "Hirnantian", 445.2, "#a7d9c0"),
                S("케이티절", "Katian", 452.8, "#99d4c0"),
                S("샌드비절", "Sandbian", 458.2, "#8dceb0"),
            ]),
            ("중기", "Middle", "#2abb9c", [
                S("다리윌절", "Darriwilian", 469.4, "#6cc9b7"),
                S("다핑절", "Dapingian", 471.3, "#60c3ae"),
            ]),
            ("전기", "Early", "#00b08e", [
                S("플로절", "Floian", 477.1, "#07b8a8"),
                S("트레마독절", "Tremadocian", 486.85, "#04b59b"),
            ]),
        ]),
        ("캄브리아기", "Cambrian", "#8caa78", [
            ("푸롱세", "Furongian", "#b7dcb0", [
                S("제10절", "Stage 10", 491.0, "#e7f0d5"),
                S("지앙샨절", "Jiangshanian", 494.2, "#d9eccc"),
                S("파이비절", "Paibian", 497.0, "#cee6c2"),
            ]),
            ("미아오링세", "Miaolingian", "#aacea0", [
                S("구장절", "Guzhangian", 500.5, "#ceddbe"),
                S("드럼절", "Drumian", 504.5, "#bfd8b1"),
                S("울리우절", "Wuliuan", 506.5, "#b8d3aa"),
            ]),
            ("제2세", "Series 2", "#9ec197", [
                S("제4절", "Stage 4", 514.5, "#b7cba6"),
                S("제3절", "Stage 3", 521.0, "#abc69d"),
            ]),
            ("테레누브세", "Terreneuvian", "#95b68b", [
                S("제2절", "Stage 2", 529.0, "#acbd99"),
                S("포춘절", "Fortunian", 538.8, "#a0bb92"),
            ]),
        ]),
    ]),
    # 540 Ma 지도가 걸치는 곳. 세·절로 나누지 않는다.
    ("신원생대", "Neoproterozoic", "#fcba63", [
        ("에디아카라기", "Ediacaran", "#fed887", 635.0),
    ]),
]

RANKS = ("era", "period", "subperiod", "epoch", "age")
RANK_KO = {"era": "대", "period": "기", "subperiod": "아기", "epoch": "세", "age": "절"}
# 이름만으로는 어느 것인지 모르는 세 — 위 단위 이름을 붙여 부른다
RELATIVE = {"전기", "중기", "후기"}


def _is_age(item):
    return len(item) == 4 and isinstance(item[2], (int, float))


def units():
    """단위 목록. 각 단위는 id·rank·ko·en·full(화면 이름)·top·base·color·parent."""
    out = []
    counter = {"n": 0}

    def add(rank, ko, en, color, parent, full=None):
        counter["n"] += 1
        unit = {"id": f"u{counter['n']}", "rank": rank, "ko": ko, "en": en,
                "full": full or ko, "color": color, "parent": parent["id"] if parent else None,
                "top": None, "base": None}
        out.append(unit)
        return unit

    def walk(item, rank, parent, parent_full):
        ko, en, color, rest = item
        full = f"{parent_full} {ko}" if ko in RELATIVE else ko
        if rank == "epoch" and ko in RELATIVE:
            en = f"{en} {parent['en']}"
        unit = add(rank, ko, en, color, parent, full)
        if isinstance(rest, (int, float)):          # 아래 단위 없이 하한만 적은 것
            unit["base"] = float(rest)
            return unit
        for child in rest:
            if _is_age(child):
                cko, cen, cbase, ccolor = child
                age = add("age", cko, cen, ccolor, unit,
                          f"{full} {cko}" if cko in RELATIVE else cko)
                age["base"] = float(cbase)
            else:
                nxt = {"era": "period", "period": "epoch", "subperiod": "epoch"}[rank]
                if rank == "period" and not _is_age(child) and isinstance(child[3], list) \
                        and child[3] and not _is_age(child[3][0]):
                    nxt = "subperiod"
                walk(child, nxt, unit, full)
        return unit

    for era in CHART:
        walk(era, "era", None, "")

    # 상한: 같은 rank 에서 바로 앞(더 젊은) 단위의 하한. 절이 없는 세는 스스로 하한을 든다.
    leaves = [u for u in out if u["rank"] == "age" or
              (u["base"] is not None and not any(c["parent"] == u["id"] for c in out))]
    leaves.sort(key=lambda u: u["base"])
    top = 0.0
    for leaf in leaves:
        leaf["top"] = top
        top = leaf["base"]
    for unit in sorted(out, key=lambda u: -RANKS.index(u["rank"])):
        kids = [c for c in out if c["parent"] == unit["id"]]
        if kids:
            unit["top"] = min(c["top"] for c in kids)
            unit["base"] = max(c["base"] for c in kids)
    return out


def containing(age_ma, all_units=None):
    """나이가 속한 단위들(대→절). 경계는 젊은 쪽에 넣는다: top < age ≤ base. 0 Ma 는 가장 젊은 것."""
    found = []
    for unit in all_units or units():
        if unit["top"] < age_ma <= unit["base"] or (age_ma == 0 and unit["top"] == 0):
            found.append(unit)
    return sorted(found, key=lambda u: RANKS.index(u["rank"]))
