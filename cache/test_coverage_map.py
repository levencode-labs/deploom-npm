"""Coverage counts must remain reproducible, source-bound and conservatively scoped."""
import copy
from contextlib import closing
import hashlib
import json
import os
import socket
import sqlite3
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from cryptography.exceptions import InvalidSignature
from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

import coverage_map
from coverage_identity import recommendation_id
from evidence_scopes import canonical
from deploom_mcp import shared_records_v2, shared_records_v3

ROOT = Path(__file__).resolve().parents[1]
RAW = json.loads((ROOT / "knowledge/v2/records.json").read_bytes())["records"]
B_ROWS = [row for row in RAW if row["id"].startswith("stageb-")]


def scoped(row):
    row = copy.deepcopy(row)
    row["evidenceScope"] = {"schema": 1, "level": "fixture-behavior", "retainedInputSha256": "a" * 64,
                            "archiveStatus": "UNKNOWN", "archiveReason": "MISSING_ARCHIVE_EVIDENCE",
                            "projectStatus": "UNKNOWN", "conditionsRequired": True}
    return row


class CoverageIdentityTests(unittest.TestCase):
    def test_provenance_duplicates_group_and_keep_counts(self):
        row = scoped(B_ROWS[0])
        other = copy.deepcopy(row)
        other.update(id="another-reviewed-source", title="Another title", summary="Another summary")
        other["evidence"]["fixtureSha256"] = "b" * 64
        other["evidenceScope"]["level"] = "typecheck"
        self.assertEqual(recommendation_id(row), recommendation_id(other))
        actual = coverage_map.metrics([row, other])
        self.assertEqual((2, 1, 1), (actual["records"], actual["distinctRecommendations"], actual["mergedRecords"]))
        self.assertEqual(1, actual["evidenceLevels"]["typecheck"]["records"])
        self.assertEqual(1, actual["evidenceLevels"]["fixture-behavior"]["records"])

    def test_different_actions_conditions_cohorts_managers_and_transitions_do_not_merge(self):
        row = B_ROWS[0]
        mutations = [
            ("actions", ["Use another repair"]), ("conditions", ["Use the incompatible cohort"]),
            ("verification", ["Check another application result"]), ("packageManagers", ["pnpm"]),
            ("verifiedTransitions", [{"from": "1.0.0", "to": "2.0.0"}]), ("kind", "incompatibility"),
        ]
        for key, value in mutations:
            if row[key] == value:
                continue
            changed = copy.deepcopy(row)
            changed[key] = value
            self.assertNotEqual(recommendation_id(row), recommendation_id(changed), key)

    def test_order_independent_sets_but_ordered_actions_and_verification(self):
        row = copy.deepcopy(B_ROWS[0])
        reordered = copy.deepcopy(row)
        reordered["conditions"].reverse()
        reordered["packageManagers"].reverse()
        reordered["verifiedTransitions"].reverse()
        self.assertEqual(recommendation_id(row), recommendation_id(reordered))
        for key in ("actions", "verification"):
            reordered = copy.deepcopy(row)
            reordered[key].reverse()
            self.assertNotEqual(recommendation_id(row), recommendation_id(reordered))

    def test_real_b_coupled_repairs_stay_distinct(self):
        rows = [row for row in B_ROWS if row["id"].startswith("stageb-react-")]
        self.assertEqual(2, len(rows))
        self.assertEqual(2, len({recommendation_id(row) for row in rows}))
        self.assertEqual(2, coverage_map.metrics(rows)["distinctRecommendations"])

    def test_shared_identity_vectors(self):
        fixture = json.loads((ROOT / "knowledge/review/recommendation-identity-v1.json").read_bytes())
        by_id = {row["id"]: row for row in RAW}
        for item in fixture["vectors"]:
            self.assertEqual(item["recommendationId"], recommendation_id(by_id[item["recordId"]]))
        canonicalization = json.loads((ROOT / "knowledge/review/recommendation-identity-canonicalization-v1.json").read_bytes())
        for item in canonicalization["vectors"]:
            self.assertEqual(item["recommendationId"], recommendation_id(item["record"]), item["name"])


class CoverageGenerationTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        with patch.object(socket, "create_connection", side_effect=AssertionError("Network is forbidden")):
            cls.first = coverage_map.build()
            cls.second = coverage_map.build()

    def test_repeated_full_generation_is_byte_identical(self):
        self.assertEqual(canonical(self.first), canonical(self.second))
        self.assertEqual(coverage_map.markdown(self.first), coverage_map.markdown(self.second))
        self.assertEqual(coverage_map.markdown(self.first, russian=True), coverage_map.markdown(self.second, russian=True))

    def test_retains_all_corpus_and_explicit_review_counts(self):
        prepared = self.first["states"]["prepared"]
        self.assertEqual(1530, prepared["metrics"]["records"])
        self.assertEqual(695, prepared["metrics"]["packages"])
        self.assertEqual(1519, prepared["metrics"]["exactTransitions"])
        self.assertEqual(206, prepared["metrics"]["evidenceLevels"]["fixture-behavior"]["records"])
        self.assertEqual(104, self.first["provenance"]["reviewedSources"])
        self.assertEqual(1038, self.first["provenance"]["retainedInputEntries"])
        self.assertIsNone(prepared["revision"])
        self.assertEqual("NOT_SIGNED", prepared["signature"])
        for state in ("published", "local"):
            self.assertEqual("NOT_OBSERVED", self.first["states"][state]["status"])
            self.assertIsNone(self.first["states"][state]["metrics"])

    def test_platform_browser_claims_require_retained_execution_evidence(self):
        prepared = self.first["states"]["prepared"]
        expected = {row["id"] for row in B_ROWS}
        for platform in ("Linux", "Windows"):
            self.assertEqual(expected, set(prepared["platforms"][platform]["recordIds"]))
            self.assertEqual(5, prepared["platforms"][platform]["distinctRecommendations"])
        self.assertEqual(2, prepared["browsers"]["Chromium"]["records"])
        self.assertEqual(2, prepared["browsers"]["Chromium"]["distinctRecommendations"])
        self.assertNotIn("macOS", prepared["platforms"])
        self.assertNotIn("Firefox", prepared["browsers"])
        evidence = self.first["qualificationEvidence"][0]
        self.assertEqual(10, evidence["verifiedLegs"])
        self.assertTrue(all(not item["browser"]["physicalDevice"] for item in evidence["observations"] if "browser" in item))

    def test_changed_input_and_missing_output_detect_staleness(self):
        with tempfile.TemporaryDirectory() as tmp:
            outputs = coverage_map.outputs(self.first, Path(tmp))
            for path, data in outputs.items(): path.write_bytes(data)
            coverage_map.check_outputs(outputs)
            changed = copy.deepcopy(self.first)
            changed["provenance"]["inputs"][0]["sha256"] = "f" * 64
            with self.assertRaisesRegex(ValueError, "stale"):
                coverage_map.check_outputs(coverage_map.outputs(changed, Path(tmp)))
            next(iter(outputs)).unlink()
            with self.assertRaisesRegex(ValueError, "stale"):
                coverage_map.check_outputs(outputs)

    def test_corrupted_retained_report_fails_before_platform_claim(self):
        original = coverage_map.bounded
        def altered(path, limit=8_000_000):
            data = original(path, limit)
            return data + b" " if str(path).endswith("execution.json") else data
        with patch.object(coverage_map, "bounded", side_effect=altered), self.assertRaisesRegex(ValueError, "Retained member changed"):
            coverage_map.qualification_coverage(ROOT, "knowledge/review/stage-b/qualification", B_ROWS)


class SignedStateTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.root = Path(self.tmp.name)
        self.key = Ed25519PrivateKey.generate()
        self.pin = self.root / "public.hex"
        self.pin.write_text(self.key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw).hex())
        pin_patch = patch.object(shared_records_v2, "public_key_file", self.pin)
        pin_patch.start()
        self.addCleanup(pin_patch.stop)
        self.rows = [scoped(row) for row in B_ROWS]
        self.create_edition(2)
        self.create_edition(3)

    def create_edition(self, version, *, revision=42, missing_scope=False):
        folder = self.root / f"v{version}"
        folder.mkdir(exist_ok=True)
        groups = {}
        for record in self.rows:
            row = copy.deepcopy(record)
            if version == 2 or missing_scope: row.pop("evidenceScope", None)
            bucket = hashlib.sha256(row["package"].encode()).hexdigest()[:2]
            groups.setdefault(bucket, []).append(row)
        index = {"schema": version, "revision": revision, "sourceSha256": str(version) * 64,
                 "recordCount": len(self.rows), "buckets": {}}
        for bucket, rows in groups.items():
            raw = canonical({"schema": 2, "records": rows})
            digest = hashlib.sha256(raw).hexdigest()
            name = f"shards/{bucket}/{digest}.json"
            path = folder / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(raw)
            index["buckets"][bucket] = [{"path": name, "sha256": digest, "bytes": len(raw), "records": len(rows)}]
        raw = canonical(index)
        (folder / "index.json").write_bytes(raw)
        domain = shared_records_v2.DOMAIN if version == 2 else shared_records_v3.DOMAIN
        (folder / "index.sig").write_bytes(self.key.sign(domain + hashlib.sha256(raw).digest()))

    def test_two_verified_representations_count_one_logical_corpus(self):
        result = coverage_map.publication_snapshot(self.root, self.rows)
        self.assertEqual(5, result["metrics"]["records"])
        self.assertEqual({"v2", "v3"}, set(result["editions"]))
        self.assertEqual("v3", result["selectedEdition"])
        self.assertTrue(result["matchesPreparedCorpus"])
        self.assertEqual("NOT_CHECKED", result["liveAvailability"])

    def test_bad_signature_changed_shard_missing_scope_and_mixed_revision_reject(self):
        v3 = self.root / "v3"
        signature = (v3 / "index.sig").read_bytes()
        (v3 / "index.sig").write_bytes(b"x" * 64)
        with self.assertRaises(InvalidSignature): coverage_map.publication_snapshot(self.root, self.rows)
        (v3 / "index.sig").write_bytes(signature)
        shard = next((v3 / "shards").rglob("*.json"))
        raw = shard.read_bytes()
        shard.write_bytes(raw + b" ")
        with self.assertRaises(ValueError): coverage_map.publication_snapshot(self.root, self.rows)
        shard.write_bytes(raw)
        self.create_edition(3, missing_scope=True)
        with self.assertRaisesRegex(ValueError, "scope"): coverage_map.publication_snapshot(self.root, self.rows)
        self.create_edition(3, revision=43)
        with self.assertRaisesRegex(ValueError, "revisions differ"): coverage_map.publication_snapshot(self.root, self.rows)

    def test_legacy_only_does_not_invent_scopes(self):
        (self.root / "v3/index.json").unlink()
        result = coverage_map.publication_snapshot(self.root, self.rows)
        self.assertEqual("v2", result["selectedEdition"])
        self.assertEqual(5, result["metrics"]["evidenceLevels"]["UNKNOWN"]["records"])

    def test_local_read_is_offline_and_does_not_change_cache_bytes(self):
        cache = self.root / "cache"
        cache.mkdir()
        for version in (2, 3):
            source = self.root / f"v{version}"
            path = cache / f"signed-records-v{version}.sqlite"
            with closing(sqlite3.connect(path)) as db, db:
                db.executescript("CREATE TABLE edition(id INTEGER PRIMARY KEY,raw BLOB,sig BLOB,checked INTEGER);"
                                 "CREATE TABLE shard(path TEXT PRIMARY KEY,data BLOB);")
                db.execute("INSERT INTO edition VALUES(1,?,?,0)", ((source / "index.json").read_bytes(), (source / "index.sig").read_bytes()))
                for item in (source / "shards").rglob("*.json"):
                    db.execute("INSERT INTO shard VALUES(?,?)", (str(item.relative_to(source)), item.read_bytes()))
        before = {str(path): path.read_bytes() for path in cache.iterdir()}
        with patch.object(socket, "create_connection", side_effect=AssertionError("Network is forbidden")):
            actual = coverage_map.local_snapshot(cache, self.rows)
        self.assertEqual(5, actual["metrics"]["records"])
        self.assertEqual(before, {str(path): path.read_bytes() for path in cache.iterdir()})
        original_snapshot = coverage_map._snapshot
        def concurrent_change(*args, **kwargs):
            result = original_snapshot(*args, **kwargs)
            path = cache / "signed-records-v3.sqlite"
            stat = path.stat()
            os.utime(path, ns=(stat.st_atime_ns, stat.st_mtime_ns + 1000))
            return result
        with patch.object(coverage_map, "_snapshot", side_effect=concurrent_change):
            with self.assertRaisesRegex(ValueError, "changed during verification"):
                coverage_map.local_snapshot(cache, self.rows)
        for suffix in ("-wal", "-journal"):
            pending = cache / ("signed-records-v3.sqlite" + suffix)
            pending.write_bytes(b"pending")
            with self.assertRaisesRegex(ValueError, "journal"): coverage_map.local_snapshot(cache, self.rows)
            pending.unlink()


if __name__ == "__main__":
    unittest.main()
