"""에디아카라기 시점 — 판 복원만으로 그린 배경(tupandactyl 019).

    python -m pipeline ediacaran     # 이 시점만 굽고 지금 index.json 에 붙인다(배경·국경·화석, 1 분 남짓)

PaleoDEM 은 540 Ma 까지라 그 앞의 지형은 없다. PALEOMAP v19o 판 모델은 1100 Ma 까지 있으므로, **오늘날 육지(Natural Earth 1:50m)를
점으로 찍어 판마다 그 나이 자리로 돌려** 단색 뭍으로 칠한다(화석 좌표와 같은 reconstruct.py 의 판 찾기). 그러므로 이 배경은 그때의 해안선이 아니라
"지금 육지가 그때 어디 있었나" 다. 해안선(PaleoCoastlines)과 기온(Scotese 2021)도 없다 — 뷰어는 그 겹쳐 보기를 끈다.

배경 그림은 relief.render 로 다른 시점과 같은 색·음영 규칙에 태운다 — 뭍은 +150 m, 바다는 해안 가까이 −120 m(대륙붕)에서 멀리
−3500 m 로 깊어지게 두어 다른 시점의 바다와 결을 맞춘다.
"""
import json

import numpy as np
from PIL import Image, ImageDraw
from scipy import ndimage

from . import countries, fossils, relief
from .common import DERIVED, EDIACARAN_AGE, EDIACARAN_LABEL, age_key

STEP = 0.1                     # 도 — PaleoDEM 6 분 격자와 같다
LAND_M, SHELF_M, SEA_M = 150.0, -120.0, -3500.0


def land_grid(age):
    """그 나이 자리로 돌린 오늘날 육지 — 행은 북→남, 열은 −180→180 인 고도(m) 배열(STEP 간격).

    오늘날 육지를 SAMPLE 간격의 점으로 찍고, 점마다 판을 찾아(reconstruct.py, 화석 좌표와 같은 길) 그 나이로 돌린 뒤 격자에
    찍는다. 다각형째 돌리면 판 경계에서 쪼개진 조각이 선으로 돌아와 칠할 수 없다. 점 사이의 틈은 닫기(closing)로 메운다.
    """
    from .reconstruct import Reconstructor
    sample = 0.2
    cols, rows = int(360 / sample), int(180 / sample)
    present = Image.new("L", (cols, rows), 0)
    draw = ImageDraw.Draw(present)
    for _, _, _, rings in countries.natural_earth():
        for ring in rings:
            if len(ring) >= 3:
                draw.polygon([((lon + 180) / sample, (90 - lat) / sample) for lon, lat in ring], fill=255)
    r, c = np.nonzero(np.asarray(present) > 127)
    lons = -180 + (c + 0.5) * sample
    lats = 90 - (r + 0.5) * sample
    rebuilder = Reconstructor()
    plates = rebuilder.plates(lons, lats, age)
    out_lon = np.full(lons.shape, np.nan)
    out_lat = np.full(lats.shape, np.nan)
    xyz = np.stack([np.cos(np.radians(lats)) * np.cos(np.radians(lons)),
                    np.cos(np.radians(lats)) * np.sin(np.radians(lons)), np.sin(np.radians(lats))], axis=1)
    for plate in np.unique(plates):
        if not plate:
            continue
        pick = plates == plate
        pole_lat, pole_lon, angle = rebuilder.rotation.get_rotation(float(age), int(plate)).get_lat_lon_euler_pole_and_angle_degrees()
        k = np.array([np.cos(np.radians(pole_lat)) * np.cos(np.radians(pole_lon)),
                      np.cos(np.radians(pole_lat)) * np.sin(np.radians(pole_lon)), np.sin(np.radians(pole_lat))])
        a = np.radians(angle)
        v = xyz[pick]
        moved = v * np.cos(a) + np.cross(k, v) * np.sin(a) + np.outer(v @ k, k) * (1 - np.cos(a))   # 로드리게스 회전
        out_lat[pick] = np.degrees(np.arcsin(np.clip(moved[:, 2], -1, 1)))
        out_lon[pick] = np.degrees(np.arctan2(moved[:, 1], moved[:, 0]))
    ok = ~np.isnan(out_lon)
    land = np.zeros((rows, cols), dtype=bool)
    rr = np.clip(((90 - out_lat[ok]) / sample).astype(int), 0, rows - 1)
    cc = np.clip(((out_lon[ok] + 180) / sample).astype(int), 0, cols - 1)
    land[rr, cc] = True
    # 극 쪽으로 옮겨 간 점은 정거원통에서 옆으로 벌어져 틈이 생긴다 — 위도에 맞춰 가로로 닫는다(1/cos φ 칸)
    for row in range(rows):
        lat = 90 - (row + 0.5) * sample
        k = int(min(cols // 8, np.ceil(1 / max(np.cos(np.radians(lat)), 0.02))))
        if k > 1 and land[row].any():
            land[row] = ndimage.binary_closing(land[row], structure=np.ones(k + 1, bool), border_value=0) | land[row]
    land = ndimage.binary_closing(land, iterations=2) | land
    fine = ndimage.zoom(land.astype(float), sample / STEP, order=1)
    height, width = int(180 / STEP) + 1, int(360 / STEP) + 1
    grid = np.zeros((height, width))
    grid[:min(height, fine.shape[0]), :min(width, fine.shape[1])] = fine[:height, :width]
    edge = ndimage.gaussian_filter(grid, 1.5)
    # 바닷가에 얕은 대륙붕 — 다른 시점의 바다처럼 해안에서 멀어질수록 깊게(뭍이 가까울수록 얕다)
    near = np.clip(ndimage.gaussian_filter(grid, 12.0) * 2.5, 0, 1)
    sea = SEA_M + (SHELF_M - SEA_M) * near
    print(f"  에디아카라기 뭍: 점 {len(lons)} 가운데 판으로 돌린 것 {int(ok.sum())}")
    return np.where(edge > 0.5, LAND_M, sea * (1 - edge) + LAND_M * edge)


def relief_entry(age=EDIACARAN_AGE):
    """relief.build 의 항목과 같은 꼴."""
    z = land_grid(age)
    files = {}
    for width in relief.WIDTHS:
        rgb, land = relief.render(z, width)
        for kind, image in ((str(width), Image.fromarray(rgb)), (f"moll-{width}", relief.mollweide(rgb))):
            name = f"relief/{kind}/{age_key(age)}.webp"
            (DERIVED / name).parent.mkdir(parents=True, exist_ok=True)
            image.save(DERIVED / name, "WEBP", quality=relief.QUALITY, method=4)
            files[kind] = name
    print(f"  배경 {age:6.1f} Ma  {EDIACARAN_LABEL:40s} plates  뭍 {land:5.1%}")
    return {"age": age, "label": EDIACARAN_LABEL, "file": files[str(relief.WIDTH)], "files": files,
            "grid": "plates", "land_fraction": round(land, 3)}


def attach():
    """`python -m pipeline ediacaran` — 이 시점의 배경·국경·화석만 굽고 지금 index.json 의 시점 목록에 넣는다."""
    from .build import frame_entry
    path = DERIVED / "index.json"
    index = json.loads(path.read_text(encoding="utf-8"))
    entry = relief_entry()
    border_entries, _ = countries.build([EDIACARAN_AGE])
    fossil_entries, _ = fossils.build([EDIACARAN_AGE])
    frame = frame_entry(entry, terrain=None, coast=None, border=border_entries[0]["file"], temp=None,
                        found=fossil_entries[0] if fossil_entries else {})
    index["frames"] = sorted([f for f in index["frames"] if f["age"] != EDIACARAN_AGE] + [frame], key=lambda f: f["age"])
    path.write_text(json.dumps(index, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"에디아카라기 시점 {EDIACARAN_AGE} Ma -> {path}")
