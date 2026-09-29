"""reconstruct.Reconstructor — 판 모델 원본(PaleoCoastlines 압축본)이 있을 때만 돈다."""
import unittest

from pipeline.countries import PARTITION, model_path

try:
    from pipeline.reconstruct import Reconstructor
    HAVE_MODEL = model_path(PARTITION).exists()
except ImportError:                      # pygplates·shapely 가 없는 환경
    HAVE_MODEL = False


@unittest.skipUnless(HAVE_MODEL, "PALEOMAP v19o 판 모델이 없다 — python -m pipeline fetch")
class ReconstructTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.r = Reconstructor()

    def test_present_is_identity(self):
        lon, lat, ok = self.r.rotate([126.98, -122.4], [37.57, 37.77], 0)
        self.assertEqual(list(lon), [126.98, -122.4])
        self.assertTrue(ok.all())

    def test_india_moves_south(self):
        # 델리(77.2°E, 28.6°N) — 인도판은 70 Ma 에 적도 남쪽에 있었다
        lon, lat, ok = self.r.rotate([77.2], [28.6], 70)
        self.assertTrue(ok[0])
        self.assertLess(lat[0], 0)

    def test_unplaced_is_nan(self):
        lon, lat, ok = self.r.rotate([77.2, -150.0], [28.6, -30.0], 500)
        for k in range(2):
            self.assertEqual(bool(ok[k]), lon[k] == lon[k])    # 돌리지 못한 점만 nan


if __name__ == "__main__":
    unittest.main()
