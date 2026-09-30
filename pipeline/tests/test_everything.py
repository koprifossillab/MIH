"""모든 시대 산지를 격자로 묶는 규칙(everything.py, tupandactyl 007). 표준 라이브러리만."""
import unittest

from pipeline.everything import STEP, cells


def item(lng, lat, env, old, young):
    return (old, young, [1, 0, 0, env], lng, lat)


class CellsTest(unittest.TestCase):
    def test_groups_by_grid_and_averages(self):
        out = cells([item(10.01, 20.01, "m", 100, 90), item(10.05, 20.04, "m", 80, 70), item(10.1 + STEP, 20.0, "t", 5, 0)])
        self.assertEqual(len(out), 2)
        big = out[0]
        self.assertEqual(big[2], 2)                 # 많은 칸부터
        self.assertAlmostEqual(big[0], 10.03)
        self.assertEqual(big[3], "m")
        self.assertEqual((big[4], big[5]), (100, 70))
        self.assertEqual(big[6], 85.0)              # 중간값 95·75 의 중앙값

    def test_dominant_environment_is_stable_on_ties(self):
        out = cells([item(0.01, 0.01, "t", 10, 0), item(0.02, 0.02, "m", 10, 0)])
        self.assertEqual(out[0][3], "m")


if __name__ == "__main__":
    unittest.main()
