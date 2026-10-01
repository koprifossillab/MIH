"""한글 → 학명 찾기 표 — Casual 모드에서 한글로 속·종을 찾는다(tupandactyl 021).

    python -m pipeline taxa_ko     # 이름표가 없으면 받고, 표를 굽고, 지금 index.json 에 붙인다(1 분 남짓)

한글 음차는 거꾸로 풀 수 없다 — "카" 는 ca·ka·cha 무엇에서도 온다. 그래서 PBDB 의 유효한 속·아속·종 가운데 산출이 있는 것(약 28 만)을
**미리 모두 음차해** 한글 → 학명 표로 둔다. 음차 규칙은 뷰어의 translit.js 한 곳이고, 여기서는 node 로 그 파일을 부른다
(translit_batch.js) — 규칙을 파이썬에 다시 적지 않는다.

표는 한글 첫 글자마다 한 파일(`taxa_ko/<첫 글자의 유니코드 16 진>.json`)로 나눈다 — 뷰어는 친 글자의 첫 글자 파일만 받는다.
한 줄은 [띄어쓰기를 뺀 한글, 학명, 계급(g·s), 산출 수], 산출이 많은 것부터.
"""
import csv
import json
import shutil
import subprocess
from collections import defaultdict
from pathlib import Path

from .common import DERIVED, ROOT, manifest, source_path

RANK = {"genus": "g", "subgenus": "g", "species": "s", "subspecies": "s"}


def names():
    path = source_path(manifest("pbdb")["taxa"]["path"])
    if not path.exists():
        from .fetch import fetch_pbdb_taxa
        fetch_pbdb_taxa()
    out = {}
    with open(path, newline="", encoding="utf-8", errors="replace") as handle:
        for row in csv.DictReader(handle):
            name = (row.get("taxon_name") or "").strip()
            rank = RANK.get(row.get("accepted_rank") or row.get("taxon_rank") or "")
            occs = int(row.get("n_occs") or 0)
            if name and rank and occs > 0 and (name not in out or out[name][1] < occs):
                out[name] = (rank, occs)
    return out


def transliterate(latin):
    node = shutil.which("node")
    if not node:
        raise SystemExit("node 가 없다 — 한글 찾기 표는 뷰어의 translit.js 를 node 로 부른다")
    result = subprocess.run([node, str(ROOT / "pipeline" / "translit_batch.js")], input="\n".join(latin),
                            capture_output=True, text=True, check=True)
    return result.stdout.split("\n")


def build():
    table = names()
    latin = sorted(table)
    hangul = transliterate(latin)
    shards = defaultdict(list)
    for name, ko in zip(latin, hangul):
        key = ko.replace(" ", "")
        if not key or not ("가" <= key[0] <= "힣"):
            continue
        rank, occs = table[name]
        shards[f"{ord(key[0]):x}"].append([key, name, rank, occs])
    out = DERIVED / "taxa_ko"
    if out.exists():
        shutil.rmtree(out)
    out.mkdir(parents=True)
    for shard, rows in shards.items():
        rows.sort(key=lambda r: (-r[3], r[0]))
        (out / f"{shard}.json").write_text(json.dumps({"rows": rows}, ensure_ascii=False, separators=(",", ":")),
                                           encoding="utf-8")
    biggest = max(shards, key=lambda k: len(shards[k]))
    print(f"  한글 찾기 표: 이름 {len(latin)} → 첫 글자 {len(shards)} 파일 (가장 큰 것 {chr(int(biggest, 16))} {len(shards[biggest])} 줄)")
    return {"dir": "taxa_ko", "names": len(latin)}


def attach():
    path = DERIVED / "index.json"
    index = json.loads(path.read_text(encoding="utf-8"))
    index["taxa_ko"] = build()
    path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"한글 찾기 표 -> {path}")
