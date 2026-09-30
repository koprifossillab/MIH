# 033 — PaleoClim 을 받기·가공·주간 점검의 흐름에 넣는다

2026-09-30 · `feature/paleoclim-in-pipeline` · koprifossillab

## 1. 무엇이 어긋나 있었나

연구자: PaleoClim 을 PBDB 등 갱신되는 자료들과 프로세스를 잘 맞추면 좋겠다.

0.26.0(tupandactyl 010)의 최근 절 기온(PaleoClim)은 **따로 떨어진 명령** `python -m pipeline paleoclim` 으로만 구워졌고, jschoi 가
운영 폴더(`/srv/WegenersDream/data`)에 바로 구웠다. 그래서:

- `pipeline fetch`·`all` 이 PaleoClim 원본을 받지 않고 `build` 도 굽지 않는다 — **paleoadmin 의 가공 폴더(`data/derived`)에 없어**
  운영의 원본 노릇을 못 한다. 운영 폴더를 가공 폴더로 다시 만들면(`rsync --delete`, 서버 옮기기, docs/백업.md 의 되살리기 뒤 다시
  가공) 최근 절 기온이 **말없이 빠진다** — 뷰어는 "기온 지도가 없다" 로 돌아갈 뿐이다
- 주간 갱신(032)의 점검이 PaleoClim 을 보지 않는다
- 운영 폴더의 파일이 저장소 코드로 다시 만든 것과 같은지 확인한 적이 없다
- **`requirements-pipeline.txt` 로 깐 환경에서는 굽지 못한다** — PaleoClim GeoTIFF 가 LZW 로 눌려 있어 `tifffile` 이 `imagecodecs` 를
  부르는데, 요구 목록에 없었다(jschoi 의 환경에는 우연히 있었다). paleoadmin 의 `.venv` 에는 `tifffile` 도 없었다

PaleoClim 은 PBDB 처럼 자라는 자료가 아니라 **PaleoDEM 처럼 SHA-256 으로 고정된 원본**이다. 그러니 "PBDB 와 같은 주기로 다시
받는" 것이 아니라 **고정 원본이 가는 길(받기·굽기·백업)에 올리는** 것이 맞다.

## 2. 무엇을 했나

- **받기**: `fetch` 가 PaleoDEM·PaleoCoastlines·기온(Scotese) 다음에 `fetch_pinned("paleoclim")` — 54 MB, 이미 있으면 SHA-256 확인만
- **가공**: `build` 가 Scotese 기온 다음에 PaleoClim 을 굽는다. 바뀌지 않는 원본이라 **`--no-relief`(주간 갱신)면 `climate/recent.json`
  이 있을 때 그대로 두고, 없을 때만 굽는다** — 배경·지형과 같은 대우. 뷰어가 `index.json` 이 아니라 `recent.json` 을 따로 읽는 것은
  그대로 둔다(010 의 설계). `pipeline paleoclim` 한 단계도 남긴다
- **주간 점검**: `weekly_refresh.sh` 가 가공물의 `climate/recent.json` 과 그 스냅숏 그림들이 있는지도 본다 — 없으면 운영에 옮기지
  않는다(빠진 채 옮겨 운영의 것을 덮을 일은 없지만, rsync 가 지우지 않아 운영에서만 살아남는 것을 다시 만들지 않게)
- **`requirements-pipeline.txt` 에 `imagecodecs`**, paleoadmin 의 `.venv` 에 `tifffile`·`imagecodecs` 를 깔았다
- **백업**: 따로 할 것이 없다 — 주간 백업(032)의 `srv-data/` 가 운영 폴더 통째라 `climate/pc_*.png`·`recent.json` 이 이미 든다.
  원본(54 MB)은 다른 Zenodo 것처럼 백업하지 않는다(다시 받는다)

## 3. 확인

- paleoadmin 에서 `fetch`(PaleoClim 넷만 새로 받음) → `build --no-relief`(PaleoClim 을 굽고 나머지는 전과 같이, 24 초)
- **paleoadmin 이 저장소 코드로 구운 `pc_*.png` 넷·`recent.json` 이 jschoi 가 운영 폴더에 구운 것과 바이트까지 같다**(sha256)
- 주간 점검을 가공 폴더에 돌려 통과, `recent.json` 을 치운 채로는 실패 — 뷰어 시험 16·파이프라인 시험 통과

## 4. 버린 것

- **PaleoClim 을 매주 다시 받기** — 고정 원본이라 받을 까닭이 없다(SHA-256 확인은 `fetch` 가 늘 한다)
- **`index.json` 에 `recent` 칸 싣기** — 뷰어·파이프라인을 둘 다 고쳐야 하고, 따로 읽는 지금 꼴로도 흐름은 맞출 수 있다
