"""최근의 절 시점에 붙이는 기온 지도 — PaleoClim 의 제4기·플라이오세 스냅숏(tupandactyl 010).

Scotese(2021) 격자(climate.py)는 5 Myr 간격이라 0 Ma 와 5 Ma 사이에 지도가 없다. 최근 5 Ma 를 절로 나눈 시점(009)에
"그 절 안의 기온" 을 보이려고 PaleoClim(Brown 외 2018)의 연평균 기온(bio_1, ℃×10, 10′ 격자, 육지만)을 climate.py 와
같은 꼴의 PNG 로 옮긴다: 1° 격자(361×181, 칸 가운데가 정수 경위도), 값 = 기온 + 100. **바다(자료 없음)는 0** 이다 —
Scotese 자료는 −55 ℃ 가 가장 낮아 0 과 부딪히지 않는다. 뷰어는 0 을 빈칸으로 읽어 투명하게 그린다.

10′ 칸 36 개(6×6)를 1° 칸 하나로 평균한다(자료 있는 칸만). 좌표는 오늘날 것이다 — 5 Myr 안에서 판이 움직인 거리는 1° 보다
작아 PALEOMAP 틀과 따로 맞추지 않는다. 육지만의 평균은 전 지구 평균 기온이 아니라서 온도계에 쓰지 않는다(gmst 없음).

    python -m pipeline paleoclim    # 받기(SHA-256 확인) + 굽기 → climate/pc_*.png, climate/recent.json

뷰어는 climate/recent.json 을 읽어, 스냅숏의 나이가 드는 절 시점에 그 지도를 붙인다. 파일이 없으면 전처럼 그 절은
"기온 지도가 없다" 고 말한다. 표준 라이브러리 밖으로 numpy·pillow·tifffile 이 든다.
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image

from .common import DERIVED, manifest, source_path
from .fetch import fetch_pinned

OFFSET = 100
NODATA = -32768


def read(folder):
    """bio_1.tif(℃×10) → (기온 ℃ 배열 — 자료 없는 칸은 NaN, 왼쪽 위 칸 가운데 경도·위도, 칸 크기)."""
    import tifffile
    tif = next(Path(folder).rglob("bio_1.tif"))
    tfw = [float(line) for line in tif.with_suffix(".tfw").read_text().split()]
    z = tifffile.imread(str(tif)).astype(float)
    z[z <= NODATA + 1] = np.nan
    return z / 10.0, tfw[4], tfw[5], tfw[0]


def to_degree(z, lon0, lat0, step):
    """10′ 칸을 1° 격자(행 90…−90, 열 −180…180, 칸 가운데가 정수 경위도)로 평균한다."""
    out = np.full((181, 361), np.nan)
    rows, cols = z.shape
    lats = lat0 - np.arange(rows) * step
    lons = lon0 + np.arange(cols) * step
    r_idx = np.clip(np.round(90 - lats).astype(int), 0, 180)
    c_idx = np.clip(np.round(lons + 180).astype(int), 0, 360)
    total = np.zeros((181, 361))
    count = np.zeros((181, 361))
    ok = ~np.isnan(z)
    rr, cc = np.nonzero(ok)
    np.add.at(total, (r_idx[rr], c_idx[cc]), z[rr, cc])
    np.add.at(count, (r_idx[rr], c_idx[cc]), 1)
    have = count > 0
    out[have] = total[have] / count[have]
    out[:, 360] = np.where(np.isnan(out[:, 360]), out[:, 0], out[:, 360])   # 180° 는 −180° 와 같은 경선
    return out


def build():
    spec = manifest("paleoclim")
    folder = DERIVED / "climate"
    folder.mkdir(parents=True, exist_ok=True)
    entries = []
    for archive in spec["archives"]:
        sid = archive["id"]
        snap = spec["snapshots"][sid]
        z, lon0, lat0, step = read(source_path(archive["unzip"]))
        grid = to_degree(z, lon0, lat0, step)
        pixels = np.where(np.isnan(grid), 0, np.clip(np.round(grid + OFFSET), 1, 255)).astype(np.uint8)
        name = f"climate/pc_{sid}.png"
        Image.fromarray(pixels, mode="L").save(DERIVED / name, optimize=True)
        land = grid[~np.isnan(grid)]
        entries.append({"id": sid, "age": snap["age"], "en": snap["en"], "ko": snap["ko"], "file": name,
                        "source": "PaleoClim", "offset": OFFSET, "gmst": None, "land_only": True,
                        "min": round(float(land.min()), 1), "max": round(float(land.max()), 1)})
        print(f"  기온 {snap['en']:40s} 육지 {land.size} 칸, {land.min():.1f}…{land.max():.1f} ℃ -> {name}")
    payload = {"citation": spec["citation"], "license": spec["license"]["name"], "license_url": spec["license"]["url"],
               "snapshots": entries}
    (folder / "recent.json").write_text(json.dumps(payload, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"목록: {len(entries)} 스냅숏 -> {folder / 'recent.json'}")
    return entries


def main():
    fetch_pinned("paleoclim")
    build()
