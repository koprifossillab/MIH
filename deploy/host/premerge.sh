#!/bin/bash
# 병합 전 확인(wetherilli 010). PR 을 main 에 넣기 직전에 사람이(또는 대신하는 이가) 돌린다.
#
#   deploy/host/premerge.sh 12
#
# 1. GitHub 가 보는 병합 가능 여부 — 글자 충돌(CONFLICTING)이면 멈춘다
# 2. 브랜치가 main 보다 뒤처졌는가 — 뒤처졌으면 멈춘다(main 위로 올리고 다시 시험)
# 3. 판 확인(deploy/check_version.py) — 판·CHANGELOG·태그가 main 과 부딪히지 않는가
# 4. CI 가 모두 통과했는가
# 모두 통과하면 병합 명령을 적어 준다. 병합은 하지 않는다 — 병합은 사람이 정한다(CLAUDE.md).
set -euo pipefail

PR="${1:-}"
if [[ -z "$PR" ]]; then
    echo "PR 번호를 준다: deploy/host/premerge.sh 12" >&2
    exit 1
fi
cd "$(dirname "${BASH_SOURCE[0]}")/../.."

fail=0
git fetch -q --tags origin

read -r HEAD_REF BASE_REF MERGEABLE < <(gh pr view "$PR" --json headRefName,baseRefName,mergeable \
    -q '[.headRefName, .baseRefName, .mergeable] | join(" ")')
echo "== PR #$PR: $HEAD_REF → $BASE_REF =="
git fetch -q origin "$HEAD_REF"

# GitHub 가 병합 가능 여부를 아직 셈하는 중이면 UNKNOWN 이다 — 잠깐 기다려 다시 묻는다
for _ in 1 2 3 4 5; do
    [[ "$MERGEABLE" != "UNKNOWN" ]] && break
    sleep 3
    MERGEABLE=$(gh pr view "$PR" --json mergeable -q .mergeable)
done
if [[ "$MERGEABLE" == "MERGEABLE" ]]; then
    echo "ok    글자 충돌 없음"
else
    echo "FAIL  병합 가능 여부: $MERGEABLE — 충돌을 풀고 다시"
    fail=1
fi

BEHIND=$(git rev-list --count "origin/$HEAD_REF..origin/$BASE_REF")
if [[ "$BEHIND" == "0" ]]; then
    echo "ok    $BASE_REF 보다 뒤처지지 않음"
else
    echo "FAIL  $BASE_REF 에 브랜치에 없는 커밋 $BEHIND 개 — git rebase origin/$BASE_REF 하고 시험·push 다시"
    git log --oneline "origin/$HEAD_REF..origin/$BASE_REF" | sed 's/^/        /'
    fail=1
fi

echo "== 판 확인 =="
python3 deploy/check_version.py --base "origin/$BASE_REF" --head "origin/$HEAD_REF" || fail=1

echo "== CI =="
if gh pr checks "$PR"; then
    echo "ok    CI 통과"
else
    echo "FAIL  CI 가 통과하지 않았거나 아직 돈다"
    fail=1
fi

echo
if [[ "$fail" == "0" ]]; then
    echo "병합해도 된다:  gh pr merge $PR --merge --subject \"$HEAD_REF 를 $BASE_REF 에 병합한다 — <판> <무엇> (<devlog>)\""
else
    echo "병합하지 않는다 — 위의 FAIL 을 먼저 푼다."
fi
exit $fail
