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
        self.assertEqual("lodash.keys", obj["items"][0]["name"])
        self.assertEqual("react-native-mmkv", obj["items"][-1]["name"])
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
        self.assertEqual((1001, 1500, 1501),
                         (obj["selection"]["startRank"], obj["selection"]["endRank"],
                          obj["selection"]["continuationStartRank"]))
        self.assertEqual(list(range(1001, 1501)), [x["rank"] for x in obj["items"]])
        self.assertEqual([1001, 1101, 1201, 1301, 1401],
                         [obj["items"][i]["rank"] for i in (0,100,200,300,400)])

    def test_no_duplicate_or_prior_ranks(self):
        obj = batch.manifest()
        self.assertEqual(500, len(set(row["name"] for row in obj["items"])))
        self.assertEqual(1001, min(row["rank"] for row in obj["items"]))
        self.assertTrue(all(row["rank"] > 1000 for row in obj["items"]))
        self.assertEqual(1501, obj["selection"]["continuationStartRank"])


    def test_completed_registry_receipt_index(self):
        from collections import Counter
        original = batch.manifest()
        final = json.loads((ROOT / "registry-receipts-manifest.json").read_text())
        self.assertEqual("deploom.research.npm-ranks-1001-1500-coverage.v1", final["schema"])
        self.assertEqual("RESEARCH_ONLY_NOT_V2_ADMISSION", final["authority"])
        self.assertEqual(original["source"]["sha256"], final["sourceCsvSha256"])
        self.assertEqual(original["source"]["commit"], final["sourceCommit"])
        self.assertEqual(500, final["recordCount"])
        self.assertEqual(499, final["verifiedMetadataCount"])
        self.assertEqual(1, final["unknownCount"])
        self.assertEqual(0, final["productionV2Adds"])
        self.assertEqual(0, final["newTrustedFixtureCount"])
        self.assertEqual(False, final["signingPerformed"])
        self.assertEqual(45205588796, final["workflowRun"])
        self.assertEqual("SUCCESS_ALL_6_JOBS", final["workflowResult"])
        self.assertEqual(1501, final["cumulative"]["nextRank"])
        self.assertEqual(1496, final["cumulative"]["exactMetadata"])
        self.assertEqual(4, final["cumulative"]["unknowns"])
        self.assertEqual(5, len(final["artifactData"]))
        self.assertEqual([1001, 1101, 1201, 1301, 1401],
                         [r["fromRank"] for r in final["artifactData"]])
        self.assertEqual([1100, 1200, 1300, 1400, 1500],
                         [r["toRank"] for r in final["artifactData"]])
        for part in final["artifactData"]:
            self.assertEqual(64, len(part["sha256"]))
            self.assertEqual(64, len(part["zipSha256"]))
            self.assertTrue(part["jsonBytes"] > 0)
        self.assertEqual(list(range(1001, 1501)),
                         [r["rank"] for r in final["items"]])
        self.assertEqual([r["name"] for r in original["items"]],
                         [r["package"] for r in final["items"]])
        self.assertEqual([r["datasetLatestVersion"] for r in original["items"]],
                         [r["version"] for r in final["items"]])
        self.assertEqual(final["statusCounts"],
                         dict(Counter(r["status"] for r in final["items"])))
        self.assertEqual([1495],
                         [r["rank"] for r in final["items"]
                          if r["status"] != "PUBLIC_EXACT_VERSION_OBSERVED"])
        self.assertEqual("browser-request", final["unknowns"][0]["package"])
        self.assertEqual("UNKNOWN_INVALID_METADATA", final["unknowns"][0]["status"])
        for i, row in enumerate(final["items"]):
            self.assertEqual(i // 100, row["subbatch"])
            self.assertEqual("RESEARCH_ONLY_NOT_V2_ADMISSION", row["authority"])
            self.assertEqual("GITHUB_ACTIONS_45205588796_PART_" + str(i // 100),
                             row["sourceReceipt"])


if __name__ == "__main__":
    unittest.main()
