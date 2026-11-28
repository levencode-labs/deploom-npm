"""The reviewed classification must stay attached to its retained Git inputs."""
import copy
import hashlib
import json
import subprocess
import tempfile
import unittest
from contextlib import chdir
from pathlib import Path

from evidence_scopes import annotate_corpus, canonical, input_manifest, record_digest


class EvidenceScopeTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.repo = Path(self.tmp.name)
        self.git("init", "-q")
        root = Path(__file__).resolve().parents[1]
        self.row = copy.deepcopy(json.loads((root / "knowledge/v2/records.json").read_bytes())["records"][0])
        self.fixture = self.repo / "fixtures/reviewed"
        self.fixture.mkdir(parents=True)
        self.source = b"// react-dom 18.2.0 18.3.1\nassert.equal(held, false);\n"
        self.sha = hashlib.sha256(self.source).hexdigest()
        (self.fixture / "check.cjs").write_bytes(self.source)
        (self.fixture / "evidence.json").write_bytes(canonical({
            "fixtureSha256": self.sha, "claims": [self.row["evidence"]["claim"]],
        }))
        (self.fixture / "facts.json").write_bytes(b'{"node": ">=18"}\n')
        self.git("add", "fixtures")
        self.git("-c", "user.name=Fixture test", "-c", "user.email=fixture@example.invalid",
                 "commit", "-qm", "Retained reviewed input")
        self.commit = self.git("rev-parse", "HEAD").decode().strip()
        self.url = f"https://github.com/levencode-labs/deploom-npm/blob/{self.commit}/fixtures/reviewed/check.cjs"
        self.row["evidence"]["source"] = self.url
        self.row["evidence"]["fixtureSha256"] = self.sha
        self.raw = canonical({"schema": 2, "records": [self.row]})
        with chdir(self.repo):
            inputs = input_manifest(self.commit, ["fixtures/reviewed"])
        self.ledger = {"schema": 1, "sources": [{
            "source": self.url, "fixtureSha256": self.sha,
            "inputRoots": ["fixtures/reviewed"], "inputs": inputs,
            "records": [{"id": self.row["id"], "recordSha256": record_digest(self.row),
                         "level": "source-pinned-metadata",
                         "basis": {"path": "fixtures/reviewed/check.cjs",
                                   "contains": "assert.equal(held, false);"}}],
        }]}

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo, stderr=subprocess.DEVNULL)

    def annotate(self, ledger=None, raw=None, trusted=None):
        with chdir(self.repo):
            return annotate_corpus(raw or self.raw, canonical(ledger or self.ledger),
                                   trusted_commit=trusted or self.commit)

    def test_retained_input_scope_is_deterministic_and_does_not_mutate_legacy(self):
        first = self.annotate()
        self.assertEqual(first, self.annotate())
        self.assertNotIn("evidenceScope", json.loads(self.raw)["records"][0])
        row = json.loads(first)["records"][0]
        scope = row["evidenceScope"]
        self.assertEqual("source-pinned-metadata", scope["level"])
        self.assertEqual("UNKNOWN", scope["archiveStatus"])
        self.assertEqual("MISSING_ARCHIVE_EVIDENCE", scope["archiveReason"])
        self.assertEqual("UNKNOWN", scope["projectStatus"])
        self.assertIs(True, scope["conditionsRequired"])
        self.assertRegex(scope["retainedInputSha256"], r"^[a-f0-9]{64}$")
        del row["evidenceScope"]
        self.assertEqual(self.row, row)

    def test_missing_duplicate_and_unknown_record_classifications_fail_closed(self):
        for case in ("missing", "duplicate", "extra"):
            with self.subTest(case=case):
                ledger = copy.deepcopy(self.ledger)
                rows = ledger["sources"][0]["records"]
                if case == "missing":
                    rows.clear()
                elif case == "duplicate":
                    rows.append(copy.deepcopy(rows[0]))
                else:
                    extra = copy.deepcopy(rows[0])
                    extra["id"] = "unknown-new-record"
                    rows.append(extra)
                with self.assertRaises(ValueError):
                    self.annotate(ledger)

    def test_changed_record_content_or_record_digest_is_rejected(self):
        altered = copy.deepcopy(self.row)
        altered["summary"] = "Unreviewed changed claim"
        with self.assertRaises(ValueError):
            self.annotate(raw=canonical({"schema": 2, "records": [altered]}))
        ledger = copy.deepcopy(self.ledger)
        ledger["sources"][0]["records"][0]["recordSha256"] = "f" * 64
        with self.assertRaises(ValueError):
            self.annotate(ledger)

    def test_input_digest_size_omission_and_review_anchor_tampering_are_rejected(self):
        for case in ("digest", "size", "omission", "anchor", "fixture"):
            with self.subTest(case=case):
                ledger = copy.deepcopy(self.ledger)
                source = ledger["sources"][0]
                if case == "digest":
                    source["inputs"][0]["sha256"] = "e" * 64
                elif case == "size":
                    source["inputs"][0]["bytes"] += 1
                elif case == "omission":
                    source["inputs"].pop()
                elif case == "anchor":
                    source["records"][0]["basis"]["contains"] = "unreviewed assertion"
                else:
                    source["fixtureSha256"] = "d" * 64
                with self.assertRaises(ValueError):
                    self.annotate(ledger)

    def test_unknown_level_untrusted_source_and_duplicate_json_keys_are_rejected(self):
        ledger = copy.deepcopy(self.ledger)
        ledger["sources"][0]["records"][0]["level"] = "UNKNOWN"
        with self.assertRaises(ValueError):
            self.annotate(ledger)
        with self.assertRaises((ValueError, subprocess.CalledProcessError)):
            self.annotate(trusted="f" * 40)
        with chdir(self.repo), self.assertRaises(ValueError):
            annotate_corpus(self.raw, b'{"schema":1,"schema":1,"sources":[]}', trusted_commit=self.commit)

    def test_worktree_files_do_not_replace_pinned_input_bytes(self):
        first = self.annotate()
        (self.fixture / "facts.json").write_bytes(b'{"node":"*"}\n')
        (self.fixture / "check.cjs").write_bytes(b"// changed uncommitted worktree\n")
        self.assertEqual(first, self.annotate())


if __name__ == "__main__":
    unittest.main()
