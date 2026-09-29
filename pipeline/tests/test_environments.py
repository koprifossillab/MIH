"""퇴적 환경 나무 시험."""
import unittest

from pipeline.environments import KO, TREE, classify, tree_for_index


class EnvironmentTreeTest(unittest.TestCase):
    def test_terms_are_unique_and_translated(self):
        seen = []
        for _, _, _, groups in TREE:
            for _, _, _, terms in groups:
                seen.extend(terms)
        self.assertEqual(len(seen), len(set(seen)))
        self.assertEqual(sorted(t for t in seen if t not in KO), [])

    def test_classify(self):
        self.assertEqual(classify("reef, buildup or bioherm"), ("m", "m-reef"))
        self.assertEqual(classify('"channel"'), ("t", "t-fluvial"))
        self.assertEqual(classify("estuary/bay"), ("o", "o-estuary"))
        self.assertEqual(classify(""), ("o", "o-none"))
        self.assertEqual(classify("something new"), ("o", "o-unlisted"))

    def test_index_shape(self):
        tree = tree_for_index({"offshore": 7})
        self.assertEqual([t["id"] for t in tree], ["m", "t", "o"])
        offshore = [g for g in tree[0]["groups"] if g["id"] == "m-clastic-offshore"][0]
        self.assertEqual(offshore["terms"], [{"term": "offshore", "ko": "외해", "total": 7}])
        self.assertEqual(tree[2]["groups"][-1]["id"], "o-unlisted")


if __name__ == "__main__":
    unittest.main()
