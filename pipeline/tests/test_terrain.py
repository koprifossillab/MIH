"""terrain — 높이를 RGB 두 칸에 나눠 담고 되읽는 것(wetherilli 016). numpy·Pillow·scipy 가 있을 때만 돈다."""
import io
import unittest

try:
    import numpy as np
    from PIL import Image
    from pipeline import terrain
    HAVE_LIBS = True
except ImportError:                      # CI 는 파이프라인 의존성을 깔지 않는다
    HAVE_LIBS = False


@unittest.skipUnless(HAVE_LIBS, "numpy·Pillow·scipy 가 없다")
class TerrainTest(unittest.TestCase):
    def test_round_trip_through_lossless_webp(self):
        heights = np.array([[-10990.0, -4204.4, -5.0], [0.0, 4.9, 8848.0]])
        buf = io.BytesIO()
        terrain.encode(heights).save(buf, "WEBP", lossless=True, quality=100)
        back = terrain.decode(Image.open(io.BytesIO(buf.getvalue())).convert("RGB"))
        self.assertTrue((np.abs(back - heights) <= terrain.UNIT / 2).all(), back)

    def test_sample_keeps_both_edges(self):
        z = np.zeros((181, 361))
        z[:, 0] = z[:, -1] = 100.0            # −180° 와 180° 는 같은 경선이다
        out = terrain.sample(z, step=1.0)
        self.assertEqual(out.shape, (181, 361))
        self.assertGreater(out[90, 0], 0)
        self.assertGreater(out[90, -1], 0)


if __name__ == "__main__":
    unittest.main()
