# design — 초상·엠블럼·아이콘을 만드는 곳

뷰어가 쓰는 그림 셋(`web/viewer/static/viewer/wegener.svg`·`emblem.svg`·`favicon.svg`)을 여기서 만든다(tupandactyl 005).
그림 파일을 손으로 고치지 않는다 — 아래를 다시 돌린다.

```
python design/trace_wegener.py     # 사진 → wegener_trace.json (numpy·scipy·pillow·potracer)
node design/make_icons.js          # wegener_trace.json + meso.js → SVG 셋
```

| 파일 | 무엇 |
|---|---|
| `sources/wegener_pipe.webp` | 알프레트 베게너 사진(털모자·파이프, 1000×1421). Photo: Alfred Wegener Institute. 연구자가 공공 영역 사진으로 준 것(2026-09-30) |
| `trace_wegener.py` | 사진을 따라 선을 따 두 겹(사람 윤곽·짙은 면)의 SVG path 로 — 윤곽은 사진에 격자를 대고 손으로 짚은 점 |
| `wegener_trace.json` | 위의 결과(960 틀) |
| `make_icons.js` | 초상 메달·엠블럼(메달을 두른 메소사우루스)·파비콘(몸을 만 메소사우루스). 메소사우루스는 `meso.js` 를 그대로 쓴다 |

**사진의 출처**: Photo: Alfred Wegener Institute(알프레트 베게너 연구소, 브레머하펜). 베게너는 1930년에 죽었고 이 사진은
그 전의 것이다. 연구자가 공공 영역이라며 준 것이다(2026-09-30). 초상을 쓰는 곳(대기 화면 밑 설명 등)에 이 표기를 남긴다.

색은 잉크 `#3b2a1a` 와 종이 `#efe4cc` 한 벌이다(대기 화면과 같다). 제목의 펜 획은 `python design/make_title.py`(fonttools·brotli·scikit-image) → `title.json`.
