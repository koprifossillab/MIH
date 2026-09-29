# 판 이력

## 0.1.0 — 2026-09-29

첫 판.

- 파이프라인: PaleoDEM 1° 격자 109 장 → 배경 WebP, PaleoCoastlines v7.1 81 시점 →
  해안선 GeoJSON, PBDB 채집지 전체(`pgm=scotese`) → 시점별 화석 JSON, 목록 `index.json`
- 뷰어: 시점 슬라이더(540 Ma → 현재, 방향키), 차례로 보기, 환경별(바다·뭍·그 밖) 채집지 점,
  눌러서 PBDB 산출 목록 보기, 분류군 찾기(PBDB 실시간), 해안선·경위선 겹쳐 보기
- 배포: Docker 이미지 `koprifossillab/mih`, nginx `/MIH/` 서브경로, 포트 8095
