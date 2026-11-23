"""Isolated, zero-network negative controls for the research intake."""
import hashlib
import importlib.util
import io
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("batch", ROOT / "batch.py")
batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)


class Response(io.BytesIO):
    status = 200
    def __init__(self, raw, url):
        super().__init__(raw)
        self.url = url
    def geturl(self):
        return self.url


class Opener:
    def __init__(self, data, *, mismatch_url=False):
        self.data = data
        self.mismatch_url = mismatch_url
    def open(self, request, timeout=15):
        url = request.full_url
        return Response(self.data, url + "/redirect" if self.mismatch_url else url)


class ResearchTests(unittest.TestCase):
    def test_complete_ranked_manifest_and_no_production_admission(self):
        obj = batch.manifest()
        self.assertEqual(500, len(obj["items"]))
        self.assertEqual("@cropper/element-handle", obj["items"][0]["name"])
        self.assertEqual("tiny-cursor", obj["items"][-1]["name"])
        self.assertEqual(0, obj["counts"]["productionV2Adds"])
        self.assertEqual([100] * 5, [
            sum(row["subbatch"] == part for row in obj["items"]) for part in range(5)
        ])
        self.assertFalse(any(row["productionAdmission"] != "NOT_REQUESTED"
                             for row in obj["items"]))

    def test_pinned_source_digest_rejects_corruption(self):
        with self.assertRaises(ValueError):
            batch.source_bytes(b"not-pinned")
        self.assertEqual(64, len(batch.CSV_SHA256))

    def test_immutable_selection_negative_control(self):
        obj = batch.manifest()
        obj["items"][0]["name"] = "../malicious"
        with self.assertRaises(ValueError):
            # Apply the same no-path-escape invariant used by manifest().
            if not batch.PKG.fullmatch(obj["items"][0]["name"]):
                raise ValueError("untrusted package name")

    def test_exact_registry_metadata_success(self):
        row = {"rank": 1, "name": "@example/check", "datasetLatestVersion": "1.0.0"}
        raw = json.dumps({"name": row["name"], "version": "1.0.0",
                          "engines": {"node": ">=20"},
                          "peerDependencies": {"react": "^18"},
                          "peerDependenciesMeta": {}}).encode()
        got = batch.probe_one(row, opener=Opener(raw), sleeper=lambda _: None)
        self.assertEqual("PUBLIC_EXACT_VERSION_OBSERVED", got["status"])
        self.assertEqual(hashlib.sha256(raw).hexdigest(), got["sourceSha256"])
        self.assertEqual({"react": "^18"}, got["peerDependencies"])
        self.assertTrue(got["url"].startswith("https://registry.npmjs.org/%40example%2Fcheck/"))

    def test_registry_mismatch_redirect_and_oversize_fail_closed(self):
        row = {"rank": 1, "name": "test-only", "datasetLatestVersion": "2.0.0"}
        controls = [
            (Opener(b'{"name":"other","version":"2.0.0"}'), "UNKNOWN_IDENTITY_MISMATCH"),
            (Opener(b'{"name":"test-only","version":"2.0.0"}', mismatch_url=True),
             "UNKNOWN_REDIRECT_OR_STATUS"),
            (Opener(b"x" * (batch.MAX_REGISTRY_RESPONSE + 1)), "UNKNOWN_OVERSIZE"),
            (Opener(b"not-json"), "UNKNOWN_MALFORMED_RESPONSE"),
        ]
        for opener, expected in controls:
            with self.subTest(expected=expected):
                result = batch.probe_one(row, opener=opener, sleeper=lambda _: None)
                self.assertEqual(expected, result["status"])
                self.assertEqual("RESEARCH_ONLY", result["admission"])
                self.assertIsNone(result["sourceSha256"])


    def test_disjoint_rank_boundaries_and_next_cursor(self):
        obj = batch.manifest()
        self.assertEqual((4001, 4500, 4501),
                         (obj["selection"]["startRank"], obj["selection"]["endRank"],
                          obj["selection"]["continuationStartRank"]))
        self.assertEqual(list(range(4001, 4501)), [x["rank"] for x in obj["items"]])
        self.assertEqual([4001, 4101, 4201, 4301, 4401],
                         [obj["items"][i]["rank"] for i in (0,100,200,300,400)])

    def test_no_duplicate_or_prior_ranks(self):
        obj = batch.manifest()
        self.assertEqual(500, len(set(row["name"] for row in obj["items"])))
        self.assertEqual(4001, min(row["rank"] for row in obj["items"]))
        self.assertTrue(all(row["rank"] > 4000 for row in obj["items"]))
        self.assertEqual(4501, obj["selection"]["continuationStartRank"])





    def test_source_csv_physical_line_offset_and_negative_control(self):
        import tempfile
        obj = batch.manifest()
        self.assertTrue(all(x["csvLine"] == x["rank"] + 1 for x in obj["items"]))
        obj["items"][0]["csvLine"] = 3002
        prior = batch.INDEX
        with tempfile.TemporaryDirectory() as temp:
            invalid = Path(temp) / "bad-index.json"
            invalid.write_text(json.dumps(obj), encoding="utf-8")
            try:
                batch.INDEX = invalid
                with self.assertRaises(ValueError):
                    batch.manifest()
            finally:
                batch.INDEX = prior

if __name__ == "__main__":
    unittest.main()
