# 022 — CI 의 파이프라인 규칙 시험을 표준 라이브러리만으로 다시 돌게

2026-09-30 · `work/20260930-koprifossillab`

## 1. 무엇이 깨져 있었나

CI(`.github/workflows/test.yml`)는 웹 의존성만 깔고 파이프라인 규칙 시험을 돌린다 — "규칙 시험은 표준
라이브러리만 쓴다" 가 전제다. 017(화석 좌표를 시점마다 v19o 로)부터 이 전제가 깨져 **0.9.0 이후 `main` 의
CI 가 모두 실패**하고 있었다. PR #1(021)에서 드러났다.

- `test_common` 이 `pipeline.fossils.assign` 을 부르는데, `fossils.py` 가 맨 위에서 `reconstruct`(numpy·pygplates)를
  불렀다
- `test_reconstruct` 가 `pipeline.countries`(pygplates)를 `try` 밖에서 불렀다. 원본이 없으면 건너뛰려고 둔
  `try … except ImportError` 가 그보다 뒤에 있었다

## 2. 무엇을 바꿨나

- `fossils.py` 는 `Reconstructor` 를 쓰는 곳(`build`)에서만 부른다. `assign` 같은 규칙은 의존성 없이 불린다
- `test_reconstruct` 는 `countries` 도 `try` 안에서 부른다 — 의존성이 없으면 세 시험을 건너뛴다

표준 라이브러리만 있는 venv 에서 26 개(3 개 건너뜀), 의존성을 다 갖춘 venv 에서 26 개 모두 돈다.

## 3. 버린 것

CI 에 `requirements-pipeline.txt` 를 까는 것 — pygplates 까지 받으면 시험이 몇 배로 느려지고, 판 모델 시험은
원본(Zenodo 압축본)이 없어 어차피 건너뛴다. 규칙 시험이 가벼운 채로 도는 편이 원래의 뜻이다.
