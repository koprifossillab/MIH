"""사건 목록 시험 — 경계 나이를 층서표에서 받는지, 이름·풀이가 빠지지 않았는지, 꼴이 맞는지(tupandactyl 016)."""
import unittest

from pipeline.events import events_for_index
from pipeline.timescale import units


class EventsTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.events = events_for_index()
        cls.flat = [e for ev in cls.events for e in [ev] + ev.get("pulses", [])]

    def test_big_five(self):
        # 대멸종 다섯 — 1 등급 박동. 데본기 후기는 띠(1 등급) 안의 켈바서가 본체다
        big = [e["id"] for e in self.flat if e["tier"] == 1 and e["kind"] == "pulse"]
        self.assertEqual(big, ["lome", "kellwasser", "epme", "ete", "kpg"])

    def test_boundary_ages_come_from_timescale(self):
        base = {u["en"]: u["base"] for u in units() if u["rank"] == "age"}
        by = {e["id"]: e for e in self.flat}
        self.assertEqual(by["epme"]["age"], base["Induan"])
        self.assertEqual(by["kpg"]["age"], base["Danian"])
        self.assertEqual((by["lome"]["old"], by["lome"]["young"]), (base["Hirnantian"], base["Rhuddanian"]))

    def test_names_and_refs(self):
        for e in self.flat:
            self.assertTrue(e["en"] and e["refs"], e["id"])
            self.assertNotIn("ko", e)                               # 이름은 영어로만, 풀이도 없다(연구자, 017)
            self.assertNotIn("cause", e)
            self.assertGreaterEqual(e["old"], e["age"])
            self.assertGreaterEqual(e["age"], e["young"])

    def test_types(self):
        climate = [e["id"] for e in self.flat if e["type"] == "climate"]
        self.assertEqual(climate, ["cpe", "toae", "oae2", "petm", "eot"])
        for e in self.flat:
            self.assertIn(e["type"], ("extinction", "climate"))
            if e["tier"] == 1:
                self.assertEqual(e["type"], "extinction", e["id"])

    def test_interval_spans_its_pulses(self):
        dev = next(e for e in self.events if e["kind"] == "interval")
        self.assertEqual(dev["old"], max(p["old"] for p in dev["pulses"]))
        self.assertEqual(dev["young"], min(p["young"] for p in dev["pulses"]))

    def test_all_within_the_maps(self):
        # 에디아카라기 시점(550 Ma, 019)이 생겨 Kotlin crisis 도 지도 안이다 — 가장 오래된 시점의 창(552.5 Ma) 안
        from pipeline.common import EDIACARAN_AGE, WINDOW_MA
        for e in self.flat:
            self.assertFalse(e.get("outside"), e["id"])
            self.assertLessEqual(e["young"], EDIACARAN_AGE + WINDOW_MA, e["id"])

if __name__ == "__main__":
    unittest.main()
