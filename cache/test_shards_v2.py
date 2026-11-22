import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from shards_v2 import check_input, write_shards


class ShardsV2Tests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        repo = Path(__file__).resolve().parents[1]
        self.data = {"schema": 1, "revision": 26}
        for kind in ("history", "knowledge"):
            self.data[kind] = json.loads((repo / "docs/v1" / (kind + ".json")).read_text())

    def raw(self):
        return (json.dumps(self.data, sort_keys=True) + "\n").encode()

    def test_exact_partition_digests_and_determinism(self):
        raw = self.raw()
        first = self.root / "first"
        second = self.root / "second"
        a = write_shards(raw, first)
        b = write_shards(raw, second)
        self.assertEqual(a, b)
        self.assertEqual((first / "index.json").read_bytes(), (second / "index.json").read_bytes())
        self.assertEqual(a["recordCount"], sum(len(self.data[k]) for k in ("history", "knowledge")))
        observed = []
        for bucket, descriptors in a["buckets"].items():
            self.assertRegex(bucket, r"^[a-f0-9]{2}$")
            for descriptor in descriptors:
                path = descriptor["path"]
                self.assertTrue(path.startswith("shards/" + bucket + "/"))
                blob = (first / path).read_bytes()
                self.assertEqual(hashlib.sha256(blob).hexdigest(), descriptor["sha256"])
                self.assertEqual(len(blob), descriptor["bytes"])
                observed.extend(json.loads(blob)["records"])
        self.assertEqual(len(observed), a["recordCount"])
        self.assertEqual({(x["kind"], x["record"]["package"], x["record"]["from"])
                          for x in observed},
                         {(kind, x["package"], x["from"])
                          for kind in ("history", "knowledge") for x in self.data[kind]})

    def test_bounded_chunking(self):
        self.data["history"] *= 1
        # Small limit is deliberately above one row and below two identical rows.
        row = self.data["history"][0]
        self.data["history"] = [row]
        self.data["knowledge"] = []
        one = self.raw()
        index = write_shards(one, self.root / "small", max_shard_bytes=512)
        self.assertEqual(1, index["recordCount"])
        self.assertEqual(1, sum(len(x) for x in index["buckets"].values()))

    def test_rejects_tampered_contract_without_writing(self):
        self.data["history"][0]["outcome"] = "unverified"
        with self.assertRaises(ValueError):
            write_shards(self.raw(), self.root / "bad")
        self.assertFalse((self.root / "bad").exists())

    def test_rejects_invalid_revision(self):
        self.data["revision"] = 24
        with self.assertRaises(ValueError):
            check_input(self.raw())

    def test_rejects_too_small_budget(self):
        with self.assertRaises(ValueError):
            write_shards(self.raw(), self.root / "bad", max_shard_bytes=100)


if __name__ == "__main__":
    unittest.main()
