# 저장소에 담은 외부 라이브러리

외부 CDN 을 부르지 않는다 — 사내망에서 CDN 이 막혀도 지도가 떠야 한다(GSM 과 같다).

| 라이브러리 | 판 | 받은 곳 | 조건 |
|---|---|---|---|
| Leaflet | 1.9.4 | https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/ (2026-09-29) | BSD 2-Clause, (c) 2010-2023 Vladimir Agafonkin, (c) 2010-2011 CloudMade |
| CesiumJS | 1.145.0 | https://registry.npmjs.org/cesium/-/cesium-1.145.0.tgz 의 `Build/Cesium/` (2026-09-30, GSM `vendor/cesium/` 과 같은 것) | Apache-2.0, `cesium/LICENSE.md` |

갱신할 때는 같은 자리의 `leaflet.js`·`leaflet.css`·`images/` 를 통째로 바꾸고 이 표의 판을 고친다.

**Cesium** 은 3D 지구본(wetherilli P01)만 쓴다. `Cesium.js`·`Workers/`·`ThirdParty/`·`Assets/`·`Widgets/` 만 담았다(14 MB,
`index.js`·`index.cjs` 는 뺐다 — GSM 과 같다). 지구본을 처음 고를 때 `globe.js` 가 싣는다. 템플릿이 `data-cesium-base` 로
이 자리를 알린다. 확인값:

```
dbb7a1606ef2150c7266eee6eb10bfeba1bd1351cdce1df85787a45491f482e3  cesium/Cesium.js
```

판을 올릴 때는 GSM 과 같은 판으로 맞춘다(두 저장소가 같은 서버에 있다).
