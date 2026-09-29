"""파이프라인 규칙 시험. 네트워크도 원본 자료도 없이 돈다.

    python -m unittest discover -s pipeline/tests -t .
"""
import unittest

from pipeline.common import age_key, belongs, environment_class, parse_dem_name, period
from pipeline.fossils import assign
from pipeline.timescale import within_one_stage


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
        self.assertTrue(belongs(248, 252, 250))            # 뒤집혀 적힌 것도 받는다

    def test_no_span_limit(self):
        # 015 — 연대 범위의 상한이 없다. 후기 트라이아스기(237–201.4)는 걸친 모든 시점에 오른다
        self.assertTrue(belongs(237, 201.4, 205))
        self.assertTrue(belongs(237, 201.4, 235))
        self.assertFalse(belongs(237, 201.4, 240))         # 창(237.5–242.5)과 안 겹친다
        self.assertTrue(belongs(538.8, 251.902, 400))      # 고생대 — 넓어도 오른다(넓은 연대로 표시)


class PrecisionTest(unittest.TestCase):
    """절 하나 안에 드는가 — 뷰어가 넓은 연대를 고리로 그리는 기준(015)."""

    def test_single_stages(self):
        self.assertTrue(within_one_stage(227.3, 205.7))    # 노릭절(21.6 Myr)도 절 하나다
        self.assertTrue(within_one_stage(254.14, 251.902))  # 창싱절
        self.assertTrue(within_one_stage(399.5, 393.47))   # 후기 에므스절(아절)
        self.assertTrue(within_one_stage(66.0, 66.0))      # 한 점

    def test_pbdb_boundaries_within_tolerance(self):
        # PBDB 의 우지아핑절은 259.857–254.14, ICS 2024 는 259.51 — 허용(1 Myr) 안이라 절 하나다
        self.assertTrue(within_one_stage(259.857, 254.14))
        self.assertTrue(within_one_stage(47.8, 41.2))      # PBDB 루테티아절(ICS 48.07–41.03)

    def test_wide(self):
        self.assertFalse(within_one_stage(237, 201.4))     # 후기 트라이아스기
        self.assertFalse(within_one_stage(227.3, 201.4))   # 노릭절–래티아절
        self.assertFalse(within_one_stage(121.4, 100.5))   # 압트절–알바절
        self.assertFalse(within_one_stage(66, 56))         # 팔레오세(절 셋)

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
        self.assertEqual(environment_class("estuary/bay"), "t")    # 연구자의 판단(devlog 003)
        self.assertEqual(environment_class("lagoonal"), "m")
        self.assertEqual(environment_class(""), "o")


if __name__ == "__main__":
    unittest.main()
