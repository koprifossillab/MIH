# 031 — 릴리스 태그마다 Docker Hub 에 이미지를 올린다

2026-09-30 · `main`(설정만, 코드 변경 없음) · koprifossillab

## 1. 왜

TODOs "Docker Hub 비밀값을 넣어야 CI 가 태그에서 이미지를 민다". 지금까지 운영 이미지는 paleoserver 에서 그때그때
구웠다(`docker compose -f deploy/docker-compose.yml build`). Docker Hub 에 판마다 이미지가 있으면 다른 장비에서
`docker compose pull` 로 받을 수 있고, 판을 되돌릴 때 다시 굽지 않아도 된다.

## 2. 무엇을 넣었나

CI(`.github/workflows/test.yml` 의 "이미지 굽기")는 `v*` 태그에서 Docker Hub 에 로그인해
`koprifossillab/wegenersdream:<태그>` 를 올린다. PR #4 에서 이 올리기를 **저장소 변수 `DOCKERHUB_PUSH` 가 `true` 일 때만**
돌게 막아 두었다 — 비밀값이 없을 때 릴리스를 만들면 로그인에서 실패해서였다. 이번에 셋을 넣었다(연구자가 직접):

| 종류 | 이름 | 값 |
|---|---|---|
| 비밀값(secret) | `DOCKERHUB_USERNAME` | `koprifossillab` |
| 비밀값(secret) | `DOCKERHUB_TOKEN` | Docker Hub personal access token(Read & Write) — 비밀번호가 아니다 |
| 변수(variable) | `DOCKERHUB_PUSH` | `true` |

- 토큰은 Docker Hub **koprifossillab** 계정(Account settings → Personal access tokens)에서 만들었다 — 이미지 이름이
  `koprifossillab/…` 이다. 폐기도 같은 화면에서 한다
- 넣는 곳은 GitHub 저장소 Settings → Secrets and variables → Actions, 또는 저장소 소유자로 로그인한 gh:
  `gh secret set DOCKERHUB_TOKEN -R koprifossillab/WegenersDream`, `gh variable set DOCKERHUB_PUSH --body true`
- `DOCKERHUB_PUSH` 를 비밀값이 아니라 **변수**로 둔 것: 켜고 끄는 스위치일 뿐이고, 워크플로의 `if:` 에서 읽으려면
  `vars` 가 편하다. 끄려면 변수를 지우거나 `false` 로 — 워크플로를 고치지 않는다

## 3. 확인

- v0.15.3 태그의 CI 를 다시 돌렸다(`gh run rerun`) — 다시 돌릴 때는 그 순간의 비밀값·변수를 쓴다. 시험·Docker Hub
  로그인·굽기와 올리기 모두 성공
- Docker Hub 에 `koprifossillab/wegenersdream:v0.15.3`(52.8 MB)이 생겼고, paleoserver 에서 `docker pull` 로 받았다
- 받으면서 paleoserver 의 로컬 태그 `v0.15.3` 이 CI 가 구운 이미지로 바뀌었다. 같은 소스라 내용은 같고, 돌고 있던
  컨테이너는 원래 이미지 그대로다

## 4. 앞으로

- 판을 올려 릴리스(`v*` 태그)를 만들면 이미지가 저절로 올라간다. v0.15.2 이전 판은 올리지 않았다(되돌릴 일이 생기면
  그 태그의 CI 를 다시 돌린다)
- 배포는 지금처럼 paleoserver 에서 굽는 것으로 둔다. Docker Hub 에서 받아 띄우려면 운영 compose 가 이미 그 이름을
  가리키므로 `WEGENER_TAG=v… docker compose pull && … up -d` 면 된다(`deploy/srv/docker-compose.yml`)
