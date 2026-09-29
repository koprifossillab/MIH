"""고기후 — Scotese (2021) 지표 기온 지도(1° 격자 100 장) → 시점마다 기온 격자 PNG 한 장.

지도는 배경(PaleoDEM)과 같은 PALEOMAP 틀이라 돌리지 않고 겹친다. 0~450 Ma 는 5 Myr 간격이라
시점과 딱 맞고, 그 뒤는 10 Myr 간격이라 455·465… Ma 시점에는 가장 가까운 지도(5 Myr 떨어진 것)를
쓴다. 385.2·390.5 Ma 는 385·390 Ma 지도다. 어느 나이의 지도인지 목록에 적어 화면에 띄운다.

**PNG 한 장이 두 일을 한다.** 회색조 한 칸이 한 격자(361×181), 값은 `기온(℃) + 100` 을 반올림한
것이다(0~255 → −100~155 ℃, 실제 자료는 −55~50). 브라우저가 이것을 읽어 (1) 색을 입혀 겹쳐
그리고 (2) 커서·채집지 자리의 기온을 읽는다. 색 지도를 따로 굽지 않으니 색표를 바꿔도 다시 가공하지
않는다. 한 장이 수십 KB 다.

원본의 북극 줄 첫 두 칸에는 기온이 아닌 값(50, −55)이 들어 있다 — 그림을 그릴 때 색 범위를 고정하려고
넣은 것으로 보인다. 같은 줄의 이웃 값으로 바꾼다.
"""
import glob
import os
import re

import netCDF4
import numpy as np
from PIL import Image

from .common import DERIVED, age_key, manifest, source_path

OFFSET = 100
REACH_MA = 5.0
_NAME = re.compile(r"^(\d+)_tas_")


def maps():
    """나이 → 파일 경로."""
    folder = source_path(next(a for a in manifest("paleotemp")["archives"] if a["id"] == "nc")["unzip"])
    found = {}
    for path in glob.glob(str(folder / "**" / "*.nc"), recursive=True):
        match = _NAME.match(os.path.basename(path))
        if match:
            found[float(match.group(1))] = path
    if not found:
        raise SystemExit(f"{folder} 에 기온 지도가 없다 — 먼저 `python -m pipeline fetch`")
    return found


def read(path):
    """행은 북→남(90..−90), 열은 −180..180 인 기온(℃) 배열. 북극 줄의 표지 값을 고친다."""
    with netCDF4.Dataset(path) as data:
        name = next(k for k in data.variables if "_tas_" in k)
        z = np.asarray(data.variables[name][:], dtype=float)
        lat = np.asarray(data.variables["northing"][:], dtype=float)
    if lat[0] < lat[-1]:
        z = z[::-1]
    z[0, :2] = np.median(z[0, 2:])
    return z


def global_mean(z):
    lat = np.linspace(90, -90, z.shape[0])
    weight = np.cos(np.radians(lat))[:, None] * np.ones_like(z)
    return float((z * weight).sum() / weight.sum())


def build(ages):
    available = maps()
    out = DERIVED / "climate"
    out.mkdir(parents=True, exist_ok=True)
    entries = {}
    for age in ages:
        source = min(available, key=lambda a: abs(a - age))
        if abs(source - age) > REACH_MA:
            continue
        z = read(available[source])
        image = Image.fromarray(np.clip(np.round(z + OFFSET), 0, 255).astype(np.uint8), mode="L")
        name = f"climate/{age_key(age)}.png"
        image.save(DERIVED / name, optimize=True)
        entries[age] = {"file": name, "source_age": source, "gmst": round(global_mean(z), 1),
                        "min": float(z.min()), "max": float(z.max()), "offset": OFFSET}
        print(f"  기온 {age:6.1f} Ma  (지도 {source:g} Ma)  전 지구 평균 {entries[age]['gmst']:5.1f} ℃")
    return entries
