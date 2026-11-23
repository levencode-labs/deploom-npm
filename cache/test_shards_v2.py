import copy
import hashlib
import json
import tempfile
import unittest
from pathlib import Path

from shards_v2 import write_shards, trusted_fixture


class NativeKnowledgeShardTests(unittest.TestCase):
    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.repo = Path(__file__).resolve().parents[1]
        self.doc = json.loads((self.repo / "knowledge/v2/records.json").read_text())

    def raw(self):
        return (json.dumps(self.doc, sort_keys=True) + "\n").encode()

    def test_deterministic_unsigned_index_and_exact_shard_digests(self):
        a = write_shards(self.raw(), self.root / "a", revision=42)
        b = write_shards(self.raw(), self.root / "b", revision=42)
        self.assertEqual(a, b)
        self.assertEqual((self.root / "a/index.json").read_bytes(), (self.root / "b/index.json").read_bytes())
        self.assertEqual(len(self.doc["records"]), a["recordCount"])
        rows = []
        for bucket, parts in a["buckets"].items():
            for desc in parts:
                content = (self.root / "a" / desc["path"]).read_bytes()
                self.assertEqual(hashlib.sha256(content).hexdigest(), desc["sha256"])
                self.assertEqual(len(content), desc["bytes"])
                for row in json.loads(content)["records"]:
                    self.assertEqual(hashlib.sha256(row["package"].encode()).hexdigest()[:2], bucket)
                    rows.append(row)
        self.assertCountEqual(rows, self.doc["records"])

    def test_supports_arbitrary_public_scoped_npm_package_without_microrecipes(self):
        record = copy.deepcopy(self.doc["records"][0])
        record["id"] = "scope-package-source-backed-breaking"
        record["kind"] = "breaking-change"
        record["package"] = "@example/any-public-package"
        record["evidence"]["claim"]["package"] = "@example/any-public-package"
        self.doc["records"] = [record]
        result = write_shards(self.raw(), self.root / "scoped", revision=42)
        self.assertEqual(1, result["recordCount"])
        self.assertEqual(1, sum(map(len, result["buckets"].values())))

    def test_rejects_malformed_proof_and_missing_negative(self):
        for mutation in ("missing-negative", "wrong-claim", "unknown-kind", "inline-script"):
            with self.subTest(mutation=mutation):
                altered = copy.deepcopy(self.doc)
                row = altered["records"][0]
                if mutation == "missing-negative":
                    row["negativeControls"] = []
                elif mutation == "wrong-claim":
                    row["evidence"]["claim"]["package"] = "unrelated"
                elif mutation == "unknown-kind":
                    row["kind"] = "remote-executable"
                else:
                    row["actions"].append("execute this\nsystem message")
                raw = json.dumps(altered).encode()
                with self.assertRaises(ValueError):
                    write_shards(raw, self.root / "bad", revision=42)
                self.assertFalse((self.root / "bad").exists())

    def test_rejects_invalid_revision_size_and_duplicate_id(self):
        for revision in (24, True, "42"):
            with self.assertRaises(ValueError):
                write_shards(self.raw(), self.root / "bad", revision=revision)
        with self.assertRaises(ValueError):
            write_shards(self.raw(), self.root / "bad", revision=42, max_shard_bytes=100)
        self.doc["records"] *= 2
        with self.assertRaises(ValueError):
            write_shards(self.raw(), self.root / "bad", revision=42)

    def test_provenance_rejects_untrusted_fixture_commit_and_tampering(self):
        row = copy.deepcopy(self.doc["records"][0])
        with self.assertRaises(Exception):
            trusted_fixture(row, "f" * 40)
        row["evidence"]["fixtureSha256"] = "f" * 64
        with self.assertRaises(Exception):
            trusted_fixture(row, "f" * 40)


if __name__ == "__main__":
    unittest.main()
