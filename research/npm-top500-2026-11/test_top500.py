"""Isolated, zero-network negative controls for the research intake."""
import hashlib
import importlib.util
import io
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("top500", ROOT / "top500.py")
top500 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(top500)


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
        obj = top500.manifest()
        self.assertEqual(500, len(obj["items"]))
        self.assertEqual("semver", obj["items"][0]["name"])
        self.assertEqual("@jest/create-cache-key-function", obj["items"][-1]["name"])
        self.assertEqual(0, obj["counts"]["productionV2Adds"])
        self.assertEqual([100] * 5, [
            sum(row["subbatch"] == part for row in obj["items"]) for part in range(5)
        ])
        self.assertFalse(any(row["productionAdmission"] != "NOT_REQUESTED"
                             for row in obj["items"]))

    def test_pinned_source_digest_rejects_corruption(self):
        with self.assertRaises(ValueError):
            top500.source_bytes(b"not-pinned")
        self.assertEqual(64, len(top500.CSV_SHA256))

    def test_immutable_selection_negative_control(self):
        obj = top500.manifest()
        obj["items"][0]["name"] = "../malicious"
        with self.assertRaises(ValueError):
            # Apply the same no-path-escape invariant used by manifest().
            if not top500.PKG.fullmatch(obj["items"][0]["name"]):
                raise ValueError("untrusted package name")

    def test_exact_registry_metadata_success(self):
        row = {"rank": 1, "name": "@example/check", "datasetLatestVersion": "1.0.0"}
        raw = json.dumps({"name": row["name"], "version": "1.0.0",
                          "engines": {"node": ">=20"},
                          "peerDependencies": {"react": "^18"},
                          "peerDependenciesMeta": {}}).encode()
        got = top500.probe_one(row, opener=Opener(raw), sleeper=lambda _: None)
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
            (Opener(b"x" * (top500.MAX_REGISTRY_RESPONSE + 1)), "UNKNOWN_OVERSIZE"),
            (Opener(b"not-json"), "UNKNOWN_MALFORMED_RESPONSE"),
        ]
        for opener, expected in controls:
            with self.subTest(expected=expected):
                result = top500.probe_one(row, opener=opener, sleeper=lambda _: None)
                self.assertEqual(expected, result["status"])
                self.assertEqual("RESEARCH_ONLY", result["admission"])
                self.assertIsNone(result["sourceSha256"])


    def test_completed_research_coverage_matches_pinned_inventory(self):
        from collections import Counter
        obj = top500.manifest()
        covered = json.loads((ROOT / "registry-receipts-manifest.json").read_text())
        self.assertEqual("RESEARCH_ONLY_NOT_V2_ADMISSION", covered["authority"])
        self.assertEqual(0, covered["newProductionAdmissions"])
        self.assertEqual(500, len(covered["items"]))
        self.assertEqual(5, len(covered["artifactData"]))
        self.assertEqual(498, covered["registryMetadataObserved"])
        self.assertEqual(2, covered["unknownCount"])
        self.assertEqual(covered["statusCounts"],
                         dict(Counter(x["status"] for x in covered["items"])))
        self.assertEqual(list(range(1,501)), [x["rank"] for x in covered["items"]])
        self.assertEqual([x["name"] for x in obj["items"]],
                         [x["package"] for x in covered["items"]])
        for idx, row in enumerate(covered["items"]):
            self.assertEqual(row["version"], obj["items"][idx]["datasetLatestVersion"])
            self.assertEqual(row["subbatch"], idx//100)
            self.assertEqual("RESEARCH_ONLY_NOT_V2_ADMISSION", row["authority"])
        for p, item in enumerate(covered["artifactData"]):
            self.assertEqual(p, item["part"])
            self.assertEqual(p*100+1, item["fromRank"])
            self.assertEqual((p+1)*100, item["toRank"])
            self.assertEqual(64, len(item["sha256"]))


if __name__ == "__main__":
    unittest.main()
