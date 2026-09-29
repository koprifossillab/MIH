"""파이프라인 규칙 시험. 네트워크도 원본 자료도 없이 돈다.

    python -m unittest discover -s pipeline/tests -t .
"""
import unittest

from pipeline.common import age_key, belongs, environment_class, parse_dem_name, period
from pipeline.fossils import assign


class DemNameTest(unittest.TestCase):
    def test_plain_and_fractional_ages(self):
        self.assertEqual(parse_dem_name("Map88_PALEOMAP_1deg_Cambrian_Precambrian boundary_540Ma.nc"),
                         (540.0, "Cambrian Precambrian boundary"))
        self.assertEqual(parse_dem_name("Map48_PALEOMAP_1deg_Middle_Devonian_385.2Ma.nc"),
                         (385.2, "Middle Devonian"))

    def test_unknown_name(self):
        self.assertIsNone(parse_dem_name("License.txt"))

    def test_age_key_keeps_fractions_apart(self):
        self.assertEqual(age_key(385.2), "3852")
        self.assertEqual(age_key(385), "3850")
        self.assertEqual(age_key(0), "0000")


class PeriodTest(unittest.TestCase):
    def test_boundaries_go_to_younger_period(self):
        self.assertEqual(period(66.0)["ko"], "고진기")
        self.assertEqual(period(66.1)["ko"], "백악기")

    def test_ends(self):
        self.assertEqual(period(0)["en"], "Quaternary")
        self.assertEqual(period(540)["ko"], "에디아카라기")


class BinningTest(unittest.TestCase):
    def test_window_and_span(self):
        self.assertTrue(belongs(252, 248, 250))
        self.assertTrue(belongs(247.5, 247.5, 250))        # 창 끝은 넣는다
        self.assertFalse(belongs(247.4, 247.4, 250))
        self.assertTrue(belongs(270, 251, 260))            # 19 Myr — 범위가 창과 겹친다
        self.assertFalse(belongs(272, 251, 260))           # 21 Myr — 너무 넓다
        self.assertTrue(belongs(248, 252, 250))            # 뒤집혀 적힌 것도 받는다

    def test_emsian_reaches_400(self):
        # 에므스절(410.62–393.47, 17 Myr)은 중간값 402 라 옛 규칙으로는 400 Ma 가 비었다
        self.assertTrue(belongs(410.62, 393.47, 400))

    def test_assign_matches_belongs(self):
        rows = [(252.5, 252.5, ["a"]), (250, 250, ["b"]), (410.62, 393.47, ["emsian"])]
        ages = [255, 250, 245, 415, 410, 405, 400, 395, 390]
        binned = assign(rows, ages)
        self.assertEqual(binned[255], [["a"]])
        self.assertEqual(binned[250], [["a"], ["b"]])
        self.assertEqual(binned[245], [])
        self.assertEqual([a for a in ages if ["emsian"] in binned[a]], [410, 405, 400, 395])
        for old, young, row in rows:
            for age in ages:
                self.assertEqual(row in binned[age], belongs(old, young, age), (row, age))


class EnvironmentTest(unittest.TestCase):
    def test_classes(self):
        self.assertEqual(environment_class("offshore shelf"), "m")
        self.assertEqual(environment_class('"floodplain"'), "t")
        self.assertEqual(environment_class("estuary/bay"), "o")    # 해안선 바로 위 — 밀지 않는다
        self.assertEqual(environment_class(""), "o")


if __name__ == "__main__":
    unittest.main()
