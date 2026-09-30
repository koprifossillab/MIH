"""병합 전 판 확인(wetherilli 010). 표준 라이브러리만 쓴다 — CI 와 사람이 같은 것을 돌린다.

    python deploy/check_version.py                         # 작업 트리 ↔ origin/main
    python deploy/check_version.py --head origin/feature/x  # 그 브랜치 ↔ origin/main
    python deploy/check_version.py --base origin/main --head <sha>

보는 것:
1. `version.py` 의 판과 CHANGELOG 맨 위 판이 같다
2. CHANGELOG 에 같은 판 절이 둘 있지 않다
3. 브랜치가 main 의 맨 위 판 절을 품고 있다 — main 에 다른 판이 먼저 들어갔으면 브랜치를 main 위로 올려야 한다
4. 판이 main 보다 낮지 않다. 같으면(판을 올리지 않는 PR) 맨 위 절이 main 과 똑같아야 한다 — 두 PR 이 같은 판 번호를
   저마다 적은 것을 잡는다
5. 올린 판의 태그(`v<판>`)가 아직 없다
"""
import argparse
import re
import subprocess
import sys
from pathlib import Path

REPO = Path(__file__).resolve().parent.parent
VERSION_FILE = "web/wegenerweb/version.py"
CHANGELOG = "CHANGELOG.md"
HEADING = re.compile(r"^## (\d+\.\d+\.\d+)\b", re.M)


def git(*args):
    return subprocess.run(["git", *args], cwd=REPO, capture_output=True, text=True, check=True).stdout


def read(ref, path):
    """ref 가 없으면 작업 트리, 있으면 그 커밋의 파일."""
    if ref is None:
        return (REPO / path).read_text(encoding="utf-8")
    return git("show", f"{ref}:{path}")


def version_of(text):
    m = re.search(r'VERSION\s*=\s*"(\d+\.\d+\.\d+)"', text)
    if not m:
        raise SystemExit(f"{VERSION_FILE} 에서 VERSION 을 찾지 못했다")
    return m.group(1)


def sections(changelog):
    """[(판, 절 본문)] — 위에서부터."""
    heads = list(HEADING.finditer(changelog))
    out = []
    for k, h in enumerate(heads):
        end = heads[k + 1].start() if k + 1 < len(heads) else len(changelog)
        out.append((h.group(1), changelog[h.start():end].strip()))
    return out


def key(v):
    return tuple(int(x) for x in v.split("."))


def main():
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--base", default="origin/main")
    ap.add_argument("--head", default=None, help="없으면 작업 트리")
    args = ap.parse_args()

    head_ver = version_of(read(args.head, VERSION_FILE))
    base_ver = version_of(read(args.base, VERSION_FILE))
    head_secs = sections(read(args.head, CHANGELOG))
    base_secs = sections(read(args.base, CHANGELOG))
    errors, notes = [], []

    if not head_secs or head_secs[0][0] != head_ver:
        errors.append(f"version.py 는 {head_ver} 인데 CHANGELOG 맨 위는 {head_secs[0][0] if head_secs else '없음'}")
    seen = {}
    for v, _ in head_secs:
        seen[v] = seen.get(v, 0) + 1
    dup = sorted(v for v, n in seen.items() if n > 1)
    if dup:
        errors.append(f"CHANGELOG 에 같은 판 절이 둘 이상: {', '.join(dup)}")
    if base_secs and base_secs[0][0] not in seen:
        errors.append(f"main 의 맨 위 판 {base_secs[0][0]} 절이 브랜치에 없다 — 브랜치를 main 위로 올린다(git rebase origin/main)")

    if key(head_ver) < key(base_ver):
        errors.append(f"판 {head_ver} 이 main 의 {base_ver} 보다 낮다 — main 위로 올리고 판을 다시 매긴다")
    elif head_ver == base_ver:
        if head_secs and base_secs and head_secs[0][1] != base_secs[0][1]:
            errors.append(f"판이 main 과 같은 {head_ver} 인데 그 절의 내용이 다르다 — 다른 PR 이 같은 판을 먼저 썼다. 판을 올린다")
        else:
            notes.append(f"판을 올리지 않는 PR 이다({head_ver})")
    else:
        tag = f"v{head_ver}"
        if git("tag", "-l", tag).strip() or git("ls-remote", "--tags", "origin", tag).strip():
            errors.append(f"태그 {tag} 가 이미 있다 — 판을 다시 매긴다")
        notes.append(f"판을 올린다: {base_ver} → {head_ver}")

    for n in notes:
        print("ok   ", n)
    for e in errors:
        print("FAIL ", e)
    if errors:
        sys.exit(1)
    print("ok    판 확인 통과")


if __name__ == "__main__":
    main()
