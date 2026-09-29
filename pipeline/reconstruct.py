"""산지의 고좌표를 **시점마다** 계산한다 — PALEOMAP v19o 판 모델(017).

PBDB 의 고좌표(`pgm=scotese`)는 산지 연대의 **중간값**에서 계산한 하나뿐이다. 범위가 넓은 산지(특히 모호한
연대, 016)는 여러 시점에 오르는데 모든 시점에서 그 한 자리에 그려져, 판이 움직인 만큼(수 도) 어긋났다.
또 PBDB 의 모델 판본(Scotese 2021)은 해안선·국경(v19o)과 달라 1° 안팎 어긋났다(001·003).

그래서 산지의 **현재 좌표**를 판에 올리고 **지도 시점의 나이로** 돌린다. 판 모델은 PaleoCoastlines 압축본 안의
회전 파일과 판 나눔 다각형(`paleomap_model_v19o_r1c`) — 해안선·국경과 같은 모델이다.

- 판 번호: **그 나이에 유효한** 판 나눔 다각형 가운데 현재 좌표를 품은 것. 다각형은 현재 좌표로 적혀 있다
- 유효 기간이 0–0 인 다각형 200 개는 뺀다 — 현재 순간에만 켜져 지구 거의 전부를 덮는다(EarthThruTime3D 022)
- 0 Ma 시점은 회전이 없으니 현재 좌표 그대로다
- 그 나이에 유효한 다각형 밖이면(모델에 그때 없던 지각) PBDB 고좌표를 그대로 쓰고 표시한다
"""
import numpy as np
import pygplates
import shapely
from shapely.geometry import Polygon

from .countries import PARTITION, ROTATION, model_path


class Reconstructor:
    def __init__(self):
        self.rotation = pygplates.RotationModel(str(model_path(ROTATION)))
        wrapper = pygplates.DateLineWrapper()
        self.polygons = []          # (시작 나이, 끝 나이, 판 번호, shapely 다각형)
        for feature in pygplates.FeatureCollection(str(model_path(PARTITION))):
            begin, end = feature.get_valid_time()
            begin = 1e9 if pygplates.GeoTimeInstant(begin).is_distant_past() else float(begin)
            end = float(end) if not pygplates.GeoTimeInstant(end).is_distant_future() else 0.0
            if begin - end < 1e-9:
                continue            # 0–0 다각형
            plate = feature.get_reconstruction_plate_id()
            for geometry in feature.get_geometries():
                if not isinstance(geometry, pygplates.PolygonOnSphere):
                    continue
                # 날짜변경선을 넘는 다각형은 잘라서 넣는다 — 안 자르면 경도 −180~180 평면에서 지구를 가로지른다
                for piece in wrapper.wrap(geometry):
                    ring = [(p.get_longitude(), p.get_latitude()) for p in piece.get_exterior_points()]
                    if len(ring) >= 3:
                        poly = Polygon(ring)
                        if not poly.is_valid:
                            poly = poly.buffer(0)
                        if not poly.is_empty:
                            self.polygons.append((begin, end, plate, poly))
        self._trees = {}
        self._rotations = {}

    def _tree(self, age):
        if age not in self._trees:
            valid = [(plate, poly) for begin, end, plate, poly in self.polygons if end - 1e-9 <= age <= begin + 1e-9]
            self._trees[age] = (shapely.STRtree([poly for _, poly in valid]), np.array([p for p, _ in valid]))
        return self._trees[age]

    def plates(self, lons, lats, age):
        """현재 좌표들의 판 번호(그 나이에 유효한 다각형). 못 찾으면 0."""
        tree, plate_ids = self._tree(age)
        points = shapely.points(np.asarray(lons), np.asarray(lats))
        out = np.zeros(len(points), dtype=int)
        if len(plate_ids):
            point_idx, poly_idx = tree.query(points, predicate="intersects")
            # 한 점이 두 다각형에 걸리면(경계 위) 먼저 나온 것을 쓴다
            seen = np.zeros(len(points), dtype=bool)
            for i, j in zip(point_idx, poly_idx):
                if not seen[i]:
                    out[i] = plate_ids[j]
                    seen[i] = True
        return out

    def rotate(self, lons, lats, age):
        """현재 좌표들을 그 나이의 자리로. (경도, 위도, 돌렸나) 배열을 돌려준다. 판을 못 찾은 점은 nan."""
        n = len(lons)
        out_lon = np.full(n, np.nan)
        out_lat = np.full(n, np.nan)
        if age <= 1e-9:
            return np.asarray(lons, float), np.asarray(lats, float), np.ones(n, dtype=bool)
        plates = self.plates(lons, lats, age)
        for i in range(n):
            plate = int(plates[i])
            if not plate:
                continue
            key = (plate, age)
            if key not in self._rotations:
                self._rotations[key] = self.rotation.get_rotation(float(age), plate)
            point = self._rotations[key] * pygplates.PointOnSphere(float(lats[i]), float(lons[i]))
            out_lat[i], out_lon[i] = point.to_lat_lon()
        return out_lon, out_lat, ~np.isnan(out_lon)
