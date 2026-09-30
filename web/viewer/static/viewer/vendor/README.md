# 저장소에 담은 외부 라이브러리

외부 CDN 을 부르지 않는다 — 사내망에서 CDN 이 막혀도 지도가 떠야 한다(GSM 과 같다).

| 라이브러리 | 판 | 받은 곳 | 조건 |
|---|---|---|---|
| Leaflet | 1.9.4 | https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/ (2026-09-29) | BSD 2-Clause, (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade |
| CesiumJS | 1.145.0 | https://registry.npmjs.org/cesium/-/cesium-1.145.0.tgz 의 `Build/Cesium/` (2026-09-30, GSM `vendor/cesium/` 과 같은 것) | Apache-2.0, `cesium/LICENSE.md` |
| La Belle Aurore(글씨체) | Google Fonts v23, 라틴 부분만 | https://fonts.gstatic.com/s/labelleaurore/v23/ (2026-09-30) | SIL OFL 1.1, (c) 2010 Kimberly Geswein, `fonts/OFL-LaBelleAurore.txt` |
| 본명조 Noto Serif KR(글씨체) | Google Fonts v31, 400·600, 한글·한자 묶음 | https://fonts.gstatic.com/s/notoserifkr/v31/ (2026-09-30) | SIL OFL 1.1, `fonts/OFL-NotoSerifKR.txt` |
| Spectral(글씨체) | Google Fonts, 400·600·400 기울임, latin·latin-ext | https://fonts.gstatic.com/s/spectral/ (2026-09-30) | SIL OFL 1.1, (c) 2017 The Spectral Project Authors, `fonts/OFL-Spectral.txt` |

갱신할 때는 같은 자리의 `leaflet.js`·`leaflet.css`·`images/` 를 통째로 바꾸고 이 표의 판을 고친다.

**Cesium** 은 3D 지구본(wetherilli P01)만 쓴다. `Cesium.js`·`Workers/`·`ThirdParty/`·`Assets/`·`Widgets/` 만 담았다(14 MB,
`index.js`·`index.cjs` 는 뺐다 — GSM 과 같다). 지구본을 처음 고를 때 `globe.js` 가 싣는다. 템플릿이 `data-cesium-base` 로
이 자리를 알린다. 확인값:

```
dbb7a1606ef2150c7266eee6eb10bfeba1bd1351cdce1df85787a45491f482e3  cesium/Cesium.js
```

판을 올릴 때는 GSM 과 같은 판으로 맞춘다(두 저장소가 같은 서버에 있다).

**La Belle Aurore** 는 머리말·대기 화면의 제목만 쓴다(tupandactyl 005). 영문 제목뿐이라 라틴 부분(`U+0000-00FF` 등)만 담았다.
확인값:

```
54da154868e2237e6a2323ede6a4db035be01f0547692c66b0fd7e83a0867047  fonts/la-belle-aurore-latin.woff2
```

**본명조·Spectral** 은 본문 글씨체다(tupandactyl 006). `python design/fetch_fonts.py` 가 Google Fonts 의 CSS 를 받아 글자 묶음별
woff2 를 `fonts/noto-serif-kr/`·`fonts/spectral/` 에 담고 주소를 바꾼 `fonts/fonts.css` 를 쓴다. 본명조는 묶음이 많아(13 MB)
보이지만 브라우저는 화면에 쓰인 글자가 든 묶음만 받는다. 손으로 고치지 말고 스크립트를 다시 돌린다.
