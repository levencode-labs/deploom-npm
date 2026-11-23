import unittest
from source_bootstrap import make_record, part_for_rank


class SourcePinTests(unittest.TestCase):
    def test_five_disjoint_part_boundaries(self):
        self.assertEqual([0, 0, 1, 3, 4, 4],
                         [part_for_rank(x) for x in (5501, 5600, 5601, 5900, 5901, 6000)])
        for rank in (5500, 6001, True):
            with self.subTest(rank=rank), self.assertRaises(ValueError):
                part_for_rank(rank)

    def test_record_uses_exact_source_fields_and_no_admission(self):
        row = {
            "name": "@example/pkg", "downloads_last_month": "42", "latest": "1.2.3",
            "repository": "git+https://github.com/example/pkg.git", "homepage": "https://example.test",
            "peerDependencies": "{\"react\":\"^18\"}", "dependencies": "{\"z\":\"1\",\"a\":\"2\"}",
            "devDependencies": "{\"test\":\"1\"}",
        }
        item = make_record(5501, row)
        self.assertEqual((5501, 5502, 0), (item["rank"], item["csvLine"], item["subbatch"]))
        self.assertEqual(["a", "z"], item["datasetDependencyNames"])
        self.assertEqual({"react": "^18"}, item["datasetPeerDependencies"])
        self.assertEqual("PENDING", item["exactRegistryMetadataStatus"])
        self.assertEqual("NOT_REQUESTED", item["productionAdmission"])


if __name__ == "__main__":
    unittest.main()
