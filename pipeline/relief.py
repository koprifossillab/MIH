"""PaleoDEM 격자 → 시점마다 배경 그림(정거원통, WebP) 두 장 — 2048·4096 폭.

색은 고도로 칠하고(바다는 깊이, 뭍은 높이) 북서쪽 빛의 음영을 얹는다. 해수면(0 m)에서
색이 끊기므로 PaleoDEM 자신의 해안선이 그림에 그대로 보인다. 화석으로 고친 해안선
(PaleoCoastlines)은 뷰어가 이 위에 선으로 따로 긋는다.

그리는 격자는 **6 분(0.1°, 3601×1801)** 이다. 1° 격자(361×181)로는 4096 폭에서 한 칸이
11 픽셀 덩어리라 확대하면 흐려졌다(devlog 002). 6 분 격자가 없으면 1° 로 돌아간다.
시점 목록(나이·영문 이름표)은 1° 격자의 파일 이름이 정한다 — 6 분 판은 385.2·390.5 Ma 를
정수로 반올림해 적어서, 나이가 1 Myr 안인 것을 짝으로 삼는다.

뷰어는 넓게 볼 때 2048, 확대하면 4096 을 부른다.

몰바이데 투영(024)의 배경도 같은 두 폭으로 굽는다 — 정거원통으로 그린 그림을 타원 안으로 옮긴 것이고
타원 밖은 투명하다. 뷰어가 그림을 투영하지 않게 하려는 것이다(4096 폭을 시점마다 브라우저에서 옮기면
밀대가 무거워진다).
"""
import sys
from functools import lru_cache

import netCDF4
import numpy as np
from PIL import Image
from scipy import ndimage

from .common import DERIVED, age_key, manifest, parse_dem_name, source_path

WIDTHS = (2048, 4096)
WIDTH = WIDTHS[0]
QUALITY = 80

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
    """정거원통 RGB 배열(uint8, 높이 = 폭/2)과 뭍의 비율."""
    fine = resample(z, width)
    colour = np.where((fine > 0)[..., None], ramp(fine, LAND), ramp(np.minimum(fine, 0), SEA))
    shade = hillshade(fine)
    # 뭍은 음영을 세게, 바다는 약하게 — 해저 지형이 뭍보다 눈에 띄지 않게 한다.
    strength = np.where(fine > 0, 0.55, 0.25)[..., None]
    lit = colour * (1.0 - strength + strength * 1.35 * shade[..., None])
    return np.clip(lit, 0, 255).astype(np.uint8), float((fine > 0).mean())


@lru_cache(maxsize=None)
def mollweide_lookup(width):
    """몰바이데 그림(폭 × 폭/2)의 각 픽셀이 정거원통 그림(같은 폭)의 어느 자리인지 — (행, 열, 타원 안).

    반지름 1 의 몰바이데는 x ∈ [−2√2, 2√2], y ∈ [−√2, √2] 이고 그림이 이 사각형을 꼭 채운다.
    역변환: θ = asin(y/√2), φ = asin((2θ + sin 2θ)/π), λ = πx / (2√2 cos θ).
    뷰어의 좌표계(map.js 의 Mollweide)와 같은 식이어야 점과 그림이 맞는다.
    """
    height = width // 2
    rows, cols = np.mgrid[0:height, 0:width]
    x = (cols + 0.5) / width * 4 * np.sqrt(2) - 2 * np.sqrt(2)
    y = np.sqrt(2) - (rows + 0.5) / height * 2 * np.sqrt(2)
    inside = x * x / 8 + y * y / 2 <= 1
    theta = np.arcsin(np.clip(y / np.sqrt(2), -1, 1))
    lat = np.degrees(np.arcsin(np.clip((2 * theta + np.sin(2 * theta)) / np.pi, -1, 1)))
    with np.errstate(divide="ignore", invalid="ignore"):
        lon = np.degrees(np.pi * x / (2 * np.sqrt(2) * np.cos(theta)))
    lon = np.clip(np.nan_to_num(lon), -180, 180)
    src_row = (90.0 - lat) / 180.0 * height - 0.5
    src_col = (lon + 180.0) / 360.0 * width - 0.5
    return src_row, src_col, inside


def mollweide(rgb):
    """정거원통 RGB 배열 → 몰바이데 RGBA 그림(같은 크기, 타원 밖은 투명)."""
    height, width = rgb.shape[:2]
    src_row, src_col, inside = mollweide_lookup(width)
    out = np.zeros((height, width, 4), dtype=np.uint8)
    for i in range(3):
        band = ndimage.map_coordinates(rgb[..., i].astype(np.float32), [src_row, src_col], order=1, mode="nearest")
        out[..., i] = np.clip(band, 0, 255).astype(np.uint8)
    out[..., 3] = np.where(inside, 255, 0)
    return Image.fromarray(out, "RGBA")


def _scan(folder):
    found = {}
    for path in folder.rglob("*.nc"):
        parsed = parse_dem_name(path.name)
        if parsed:
            found[parsed[0]] = (parsed[1], path)
    return found


def grids():
    """(나이, 영문 이름표, 그릴 격자 경로, 격자 이름)을 나이 순으로."""
    archives = {a["id"]: source_path(a["unzip"]) for a in manifest("paleodem")["archives"]}
    coarse = _scan(archives["1deg"])
    if not coarse:
        raise SystemExit(f"{archives['1deg']} 에 PaleoDEM 격자가 없다 — 먼저 `python -m pipeline fetch`")
    fine = _scan(archives["6min"]) if archives["6min"].exists() else {}
    out = []
    for age in sorted(coarse):
        label, path = coarse[age]
        match = min(fine, key=lambda a: abs(a - age), default=None)
        if match is not None and abs(match - age) < 1.0:
            out.append((age, label, fine[match][1], "6min"))
        else:
            out.append((age, label, path, "1deg"))
    return out


def build(only=None):
    for width in WIDTHS:
        (DERIVED / "relief" / str(width)).mkdir(parents=True, exist_ok=True)
        (DERIVED / "relief" / f"moll-{width}").mkdir(parents=True, exist_ok=True)
    entries = []
    for age, label, path, grid in grids():
        if only and age not in only:
            continue
        z = read_grid(path)
        files = {}
        for width in WIDTHS:
            rgb, land = render(z, width)
            name = f"relief/{width}/{age_key(age)}.webp"
            Image.fromarray(rgb).save(DERIVED / name, "WEBP", quality=QUALITY, method=4)
            files[str(width)] = name
            name = f"relief/moll-{width}/{age_key(age)}.webp"
            mollweide(rgb).save(DERIVED / name, "WEBP", quality=QUALITY, method=4)
            files[f"moll-{width}"] = name
        entries.append({"age": age, "label": label, "file": files[str(WIDTH)], "files": files,
                        "grid": grid, "land_fraction": round(land, 3)})
        print(f"  배경 {age:6.1f} Ma  {label:40s} {grid}  뭍 {land:5.1%}")
    return entries


if __name__ == "__main__":
    build({float(a) for a in sys.argv[1:]} or None)
