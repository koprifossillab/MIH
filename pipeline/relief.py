"""PaleoDEM 1° 격자 → 시점마다 배경 그림 한 장(정거원통, WebP).

색은 고도로 칠하고(바다는 깊이, 뭍은 높이) 북서쪽 빛의 음영을 얹는다. 해수면(0 m)에서
색이 끊기므로 PaleoDEM 자신의 해안선이 그림에 그대로 보인다. 화석으로 고친 해안선
(PaleoCoastlines)은 뷰어가 이 위에 선으로 따로 긋는다.

1° 격자는 361×181 칸이다. 2048 폭으로 겹선형 보간하면 칸이 계단으로 보이지 않을
만큼만 부드러워진다 — 없는 세부가 생기는 것은 아니다.
"""
import sys

import netCDF4
import numpy as np
from PIL import Image
from scipy import ndimage

from .common import DERIVED, age_key, manifest, parse_dem_name, source_path

WIDTH = 2048
QUALITY = 82

# (고도 m, RGB). 사이는 선형으로 섞는다. 0 m 에서 바다 쪽과 뭍 쪽이 따로 선다.
SEA = [(-9000, (6, 22, 48)), (-5000, (18, 52, 96)), (-2500, (36, 86, 138)),
       (-500, (82, 140, 186)), (-100, (134, 186, 214)), (0, (170, 214, 230))]
LAND = [(0, (112, 150, 96)), (250, (150, 172, 106)), (800, (196, 184, 124)),
        (1800, (176, 138, 96)), (3200, (150, 120, 104)), (4500, (206, 198, 190)),
        (6500, (250, 250, 250))]


def read_grid(path):
    """행은 북→남, 열은 -180→180 인 고도(m) 배열."""
    with netCDF4.Dataset(path) as data:
        names = {name[:3]: name for name in data.variables if name[:3] in ("lon", "lat")}
        lat = np.asarray(data.variables[names["lat"]][:], dtype=float)
        z = np.asarray(data.variables["z"][:], dtype=float)
    return z[::-1] if lat[0] < lat[-1] else z


def resample(z, width=WIDTH):
    height = width // 2
    rows, cols = np.mgrid[0:height, 0:width]
    lat = 90.0 - (rows + 0.5) / height * 180.0
    lon = -180.0 + (cols + 0.5) / width * 360.0
    coords = [(90.0 - lat) / (180.0 / (z.shape[0] - 1)),
              (lon + 180.0) / (360.0 / (z.shape[1] - 1))]
    return ndimage.map_coordinates(z, coords, order=1, mode="nearest")


def ramp(z, stops):
    heights = np.array([h for h, _ in stops], dtype=float)
    colours = np.array([c for _, c in stops], dtype=float)
    return np.stack([np.interp(z, heights, colours[:, i]) for i in range(3)], axis=-1)


def hillshade(z, azimuth=315.0, altitude=45.0, exaggeration=12.0):
    """0..1 음영. 경도 방향 칸 너비를 위도에 맞춰 줄여, 극 가까이 음영이 눕지 않게 한다."""
    height, width = z.shape
    cell = 40_075_000.0 / width                                  # 적도에서 한 칸의 m
    lat = np.radians(90.0 - (np.arange(height) + 0.5) / height * 180.0)
    dx = np.maximum(np.cos(lat), 0.05)[:, None] * cell
    gy, gx = np.gradient(z * exaggeration)
    gx = gx / dx
    gy = gy / cell
    slope = np.arctan(np.hypot(gx, gy))
    aspect = np.arctan2(-gx, gy)
    az, alt = np.radians(360.0 - azimuth + 90.0), np.radians(altitude)
    shade = np.sin(alt) * np.cos(slope) + np.cos(alt) * np.sin(slope) * np.cos(az - aspect)
    return np.clip(shade, 0.0, 1.0)


def render(z, width=WIDTH):
    fine = resample(z, width)
    colour = np.where((fine > 0)[..., None], ramp(fine, LAND), ramp(np.minimum(fine, 0), SEA))
    shade = hillshade(fine)
    # 뭍은 음영을 세게, 바다는 약하게 — 해저 지형이 뭍보다 눈에 띄지 않게 한다.
    strength = np.where(fine > 0, 0.55, 0.25)[..., None]
    lit = colour * (1.0 - strength + strength * 1.35 * shade[..., None])
    return Image.fromarray(np.clip(lit, 0, 255).astype(np.uint8)), float((fine > 0).mean())


def grids():
    """(나이, 영문 이름표, 경로)를 나이 순으로."""
    folder = source_path(manifest("paleodem")["archive"]["unzip"])
    found = {}
    for path in folder.rglob("*.nc"):
        parsed = parse_dem_name(path.name)
        if parsed:
            found[parsed[0]] = (parsed[0], parsed[1], path)
    if not found:
        raise SystemExit(f"{folder} 에 PaleoDEM 격자가 없다 — 먼저 `python -m pipeline fetch`")
    return [found[age] for age in sorted(found)]


def build(only=None):
    out = DERIVED / "relief"
    out.mkdir(parents=True, exist_ok=True)
    entries = []
    for age, label, path in grids():
        if only and age not in only:
            continue
        image, land = render(read_grid(path))
        name = f"relief/{age_key(age)}.webp"
        image.save(DERIVED / name, "WEBP", quality=QUALITY, method=6)
        entries.append({"age": age, "label": label, "file": name, "land_fraction": round(land, 3)})
        print(f"  배경 {age:6.1f} Ma  {label:40s} 뭍 {land:5.1%}")
    return entries


if __name__ == "__main__":
    build({float(a) for a in sys.argv[1:]} or None)
