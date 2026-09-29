"""퇴적 환경 나무 시험."""
import unittest

from pipeline.environments import KO, TREE, classify, tree_for_index


class EnvironmentTreeTest(unittest.TestCase):
    def test_terms_are_unique_and_translated(self):
        seen = []
        for _, _, _, _, groups in TREE:
            for _, _, _, _, terms in groups:
                seen.extend(terms)
        self.assertEqual(len(seen), len(set(seen)))
        self.assertEqual(len(seen), 76)      # PBDB 가 쓰는 환경 값 전부(빈 값 포함), 2026-09-29
        self.assertEqual(sorted(t for t in seen if t not in KO), [])

    def test_classify(self):
        self.assertEqual(classify("reef, buildup or bioherm"), ("m", "m-reef"))
        self.assertEqual(classify('"channel"'), ("t", "t-fluvial"))
        # 연구자의 판단 — 해안·석호는 해양기원, 하구·만은 육상기원
        self.assertEqual(classify("coastal indet."), ("m", "m-coastal"))
        self.assertEqual(classify("marginal marine indet."), ("m", "m-coastal"))
        self.assertEqual(classify("lagoonal"), ("m", "m-lagoon"))
        self.assertEqual(classify("estuary/bay"), ("t", "t-estuary"))
        self.assertEqual(classify(""), ("o", "o-none"))
        self.assertEqual(classify("something new"), ("o", "o-unlisted"))

    def test_indet_groups_come_last(self):
        for top, _, _, _, groups in TREE[:2]:
            self.assertTrue(groups[-1][1].endswith("[미상]"), top)

    def test_index_shape(self):
        tree = tree_for_index({"offshore": 7})
        self.assertEqual([t["id"] for t in tree], ["m", "t", "o"])
        offshore = [g for g in tree[0]["groups"] if g["id"] == "m-clastic-offshore"][0]
        self.assertEqual(offshore["terms"], [{"term": "offshore", "ko": "외해", "total": 7}])
        self.assertTrue(offshore["color"].startswith("#"))
        self.assertEqual(tree[2]["groups"][-1]["id"], "o-unlisted")


if __name__ == "__main__":
    unittest.main()
