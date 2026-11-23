"""Offline-only original receipt checks and tamper negatives; no network."""
import copy
import importlib.util
import json
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parent
spec=importlib.util.spec_from_file_location("verify_receipts",ROOT/"verify_receipts.py")
verifier=importlib.util.module_from_spec(spec)
spec.loader.exec_module(verifier)

class ReceiptTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.ledger=json.loads((ROOT/"registry-receipts-manifest.json").read_text(encoding="utf-8"))
        cls.index=json.loads((ROOT/"index.json").read_text(encoding="utf-8"))

    def test_full_five_part_offline_manifest(self):
        self.assertEqual(499,verifier.validate(self.ledger,self.index)["exact"])
        self.assertEqual([{"rank":5484,"package":"@voyantjs/core","version":"0.109.0","status":"UNKNOWN_HTTP_404"}],self.ledger["unknowns"])
        for part in range(5):
            self.assertEqual(part,verifier.validate(self.ledger,self.index,part=part)["part"])

    def test_rank_and_identity_tamper_rejected(self):
        for field,value in [("rank",5000),("package","wrong-package"),("version","9.9.9"),
                            ("status","PUBLIC_EXACT_VERSION_OBSERVED"),("sourceReceipt","forged")]:
            with self.subTest(field=field):
                ledger=copy.deepcopy(self.ledger)
                target=ledger["items"][248]
                target[field]=value
                with self.assertRaises(ValueError):
                    verifier.validate(ledger,self.index)

    def test_zip_and_json_hash_tamper_rejected(self):
        for name in ("zipSha256","sha256","zipBytes","jsonBytes","id"):
            with self.subTest(field=name):
                ledger=copy.deepcopy(self.ledger)
                ledger["artifactData"][0][name]=0
                with self.assertRaises(ValueError):
                    verifier.validate(ledger,self.index)

    def test_unknown_does_not_promote_to_exact(self):
        ledger=copy.deepcopy(self.ledger)
        ledger["unknownCount"]=0
        with self.assertRaises(ValueError):
            verifier.validate(ledger,self.index)
        ledger=copy.deepcopy(self.ledger)
        ledger["unknowns"]=[]
        with self.assertRaises(ValueError):
            verifier.validate(ledger,self.index)

    def test_source_and_original_run_are_immutable(self):
        ledger=copy.deepcopy(self.ledger)
        ledger["sourceCsvSha256"]="0"*64
        with self.assertRaises(ValueError):
            verifier.validate(ledger,self.index)
        ledger=copy.deepcopy(self.ledger)
        ledger["workflowRun"]=0
        with self.assertRaises(ValueError):
            verifier.validate(ledger,self.index)

    def test_no_production_or_fixture_promotion(self):
        for field in ("productionV2Adds","newTrustedFixtureCount"):
            ledger=copy.deepcopy(self.ledger)
            ledger[field]=1
            with self.assertRaises(ValueError):
                verifier.validate(ledger,self.index)
if __name__=="__main__":
    unittest.main()
