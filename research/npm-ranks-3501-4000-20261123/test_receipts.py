"""Offline-only receipt verification and explicit negative tamper controls."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("verify_receipts", ROOT / "verify_receipts.py")
verifier = importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)

class ReceiptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
        cls.index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))

    def test_complete_original_500_verified_without_network(self):
        result = verifier.validate(self.ledger, self.index)
        self.assertEqual("PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE", result["status"])
        self.assertEqual((3501, 4000), (result["rankStart"], result["rankEnd"]))
        for part in range(5):
            self.assertEqual("PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE", verifier.validate(self.ledger, self.index, part=part)["status"])

    def test_manifest_tampering_is_fail_closed(self):
        controls = [
            ("rank changed", lambda x: x["items"][0].update(rank=3500)),
            ("duplicate package", lambda x: x["items"][4].update(package=x["items"][3]["package"])),
            ("identity modified", lambda x: x["items"][99].update(version="999.0.0")),
            ("status falsified", lambda x: x["items"][250].update(status="UNKNOWN_HTTP_404")),
            ("artifact ID replaced", lambda x: x["artifactData"][0].update(id=0)),
            ("ZIP SHA replaced", lambda x: x["artifactData"][1].update(zipSha256="0" * 64)),
            ("JSON SHA replaced", lambda x: x["artifactData"][3].update(sha256="f" * 64)),
            ("artifact part skipped", lambda x: x["artifactData"].pop()),
            ("source changed", lambda x: x.update(sourceCsvSha256="0" * 64)),
            ("prior status altered", lambda x: x["cumulative"].update(unknowns=0)),
            ("admission altered", lambda x: x.update(productionV2Adds=1)),
        ]
        for name, change in controls:
            with self.subTest(name=name):
                altered = copy.deepcopy(self.ledger)
                change(altered)
                with self.assertRaises(ValueError):
                    verifier.validate(altered, self.index)

    def test_mutated_index_rejected(self):
        broken = copy.deepcopy(self.index)
        broken["items"][450]["datasetLatestVersion"] = "tampered"
        with self.assertRaises(ValueError):
            verifier.validate(self.ledger, broken)

    def test_invalid_part_rejected(self):
        for part in (-1, 5, True):
            with self.subTest(part=part):
                with self.assertRaises(ValueError):
                    verifier.validate(self.ledger, self.index, part=part)

if __name__ == "__main__":
    unittest.main()
