"""층서표 표 시험 — 빠진 칸, 겹친 경계, 나이가 속한 단위."""
import unittest
from collections import Counter

from pipeline.timescale import containing, units


class TimescaleTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.units = units()

    def names(self, age):
        return [u["full"] for u in containing(age, self.units)]

    def test_counts(self):
        # 현생누대의 절 101 — 층서표 세 칸의 36·34·31(프리돌리세는 절이 없다)
        ranks = Counter(u["rank"] for u in self.units)
        self.assertEqual(ranks["age"], 101)
        self.assertEqual(ranks["era"], 4)
        self.assertEqual(ranks["period"], 13)
        self.assertEqual(ranks["subperiod"], 2)

    def test_every_unit_has_a_range(self):
        for unit in self.units:
            self.assertIsNotNone(unit["top"], unit)
            self.assertLess(unit["top"], unit["base"], unit)

    def test_ages_tile_without_gaps(self):
        leaves = sorted((u for u in self.units if not any(c["parent"] == u["id"] for c in self.units)),
                        key=lambda u: u["top"])
        for young, old in zip(leaves, leaves[1:]):
            self.assertEqual(young["base"], old["top"], (young["ko"], old["ko"]))

    def test_2024_boundaries(self):
        by = {u["en"]: u for u in self.units}
        self.assertEqual(by["Berriasian"]["base"], 143.1)
        self.assertEqual(by["Langhian"]["base"], 15.98)
        self.assertEqual(by["Tournaisian"]["base"], 358.86)
        self.assertEqual(by["Cambrian"]["base"], 538.8)

    def test_containing(self):
        self.assertEqual(self.names(250), ["중생대", "트라이아스기", "트라이아스기 전기", "인더스절"])
        self.assertEqual(self.names(66.0), ["신생대", "고진기", "팔레오세", "다니아절"])   # 경계는 젊은 쪽
        self.assertEqual(self.names(310), ["고생대", "석탄기", "펜실베니아아기", "펜실베니아아기 중기", "모스코바절"])
        self.assertEqual(self.names(420), ["고생대", "실루리아기", "프리돌리세"])
        self.assertEqual(self.names(540), ["신원생대", "에디아카라기"])
        self.assertEqual(self.names(0)[-1], "메갈라야절")


if __name__ == "__main__":
    unittest.main()
