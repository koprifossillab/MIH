# wetherilli 016 — 지구본 지형 격자를 굽는다 (파이프라인)

2026-09-30 · `feature/globe-terrain` · 계획은 [wetherilli P01](20260930_wetherilli_P01_globe_3d.md) §4

## 1. 무엇을 했나

`pipeline/terrain.py` — 배경 그림과 같은 PaleoDEM 격자(6 분, 없으면 1°)를 시점마다 **1/4° 마디 격자(1441 × 721)**로
줄여 `terrain/<나이>.webp` 에 담고, `index.json` 의 시점마다 `terrain` 칸(파일·간격·OFFSET·UNIT·최저·최고)을 단다.

- `python -m pipeline build` 가 배경 다음에 굽는다(`--no-relief` 에서도 — 5 분 남짓이라)
- **`python -m pipeline terrain`** 은 지형만 굽고 **지금 index.json 에 붙인다**. 배경·화석·국경을 다시 만들지 않고 운영
  가공물에 지형을 더하는 길이다(paleoadmin 이 돌릴 것, TODOs). index.json 은 임시 파일에 쓰고 바꿔 끼운다

## 2. 담는 꼴

- **간격 1/4°** — 지구 전체를 볼 때 한 마디가 몇 픽셀이다. 6 분 격자 그대로(3601 × 1801)는 브라우저가 풀어 들고 있기에
  크다(26 MB Float32). 줄이기 전에 3 × 3 평균을 걸어 마디 사이에 떨어진 잔 봉우리가 사라지지 않게 한다
- **R·G 두 칸에 16 비트** — (해발 + 12000) / 10. 브라우저 캔버스는 16 비트 회색조 PNG 를 8 비트로 깎아 읽는다
- **10 m 단위, 무손실 WebP** — 재 본 크기(0 Ma / 250 Ma):

  | 단위 | PNG | 무손실 WebP |
  |---|---|---|
  | 1 m | 1465 / 529 KB | 1130 / 371 KB |
  | 10 m | 934 / 295 KB | 667 / 180 KB |

  109 장 합이 1 m PNG 로 80 MB 남짓, 10 m WebP 로 **27 MB**. 지구본은 높이를 ×15 안팎으로 과장해 멀리서 보므로 10 m 는
  보이지 않는다. 뷰어가 내주는 확장자(`views.SERVED`)에 `.webp` 가 이미 있어 서버는 그대로다
- 숫자(간격·OFFSET·UNIT)는 index.json 칸으로 간다 — 뷰어에 다시 적지 않는다(CLAUDE.md 의 "한 곳에만")

## 3. 버린 것

- **음영 없는 색 그림을 따로 굽기**(P01 §4) — 지형을 세우면 배경에 구운 음영(북서 빛)과 Cesium 의 빛이 겹칠 것을 걱정했다.
  해 보니 Cesium 의 빛은 끄고(0.19.0 과 같다) 구운 음영만 두어도 기울였을 때 입체가 또렷했다(017 §5). Cesium 의 빛은 켜면
  시계의 해 자리로 비춰 밤 반구가 생기므로 따로 빛을 잡아야 한다 — 그 값을 치를 만큼 나아 보이지 않아 109 장 × 2 폭의
  그림을 더 굽지 않는다. 화면에서 음영이 겹쳐 보이면 그때 다시 본다
- **Cesium 지형 타일(quantized-mesh)로 굽기** — 서버에 타일 트리를 두어야 하고 시점마다 수천 개다. 격자 한 장을 브라우저가
  받아 `CustomHeightmapTerrainProvider` 로 타일을 그 자리에서 만드는 편이 가공물도 뷰어도 단순하다(017)

## 4. 확인

paleoadmin 의 원본·`.venv` 로 가공물 사본(`WEGENER_DATA_DIR` 를 scratch 로)에 `python -m pipeline terrain` 을 돌렸다 — 109/109,
4 분 29 초, 27 MB. `pipeline/tests/test_terrain.py`(무손실 WebP 왕복·경도 양 끝) — CI 는 파이프라인 의존성이 없어 건너뛴다.
