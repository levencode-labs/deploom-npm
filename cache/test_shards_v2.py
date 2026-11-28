import copy
import hashlib
import json
import subprocess
import tempfile
import unittest
from contextlib import chdir
from pathlib import Path
from unittest.mock import patch

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


class TrustedFixtureMemoizationTests(unittest.TestCase):
    """Exercise the publisher against immutable objects in a small local repo."""

    def setUp(self):
        tmp = tempfile.TemporaryDirectory()
        self.addCleanup(tmp.cleanup)
        self.root = Path(tmp.name)
        self.repo = self.root / "repo"
        self.repo.mkdir()
        self.git("init", "-q")
        template = json.loads((Path(__file__).resolve().parents[1]
                               / "knowledge/v2/records.json").read_bytes())["records"][0]
        self.records = [copy.deepcopy(template), copy.deepcopy(template)]
        self.records[1]["id"] += "-second-claim"
        self.records[1]["verifiedTransitions"][0]["to"] = "18.3.2"
        self.records[1]["evidence"]["claim"]["to"] = "18.3.2"
        claims = [row["evidence"]["claim"] for row in self.records]
        expected = {value for claim in claims for key, value in claim.items()
                    if key in ("package", "from", "to")}
        expected.update(control["fixtureAssertion"] for row in self.records
                        for control in row["negativeControls"])
        raw = ("\n".join(sorted(expected)) + "\n").encode()
        sha = hashlib.sha256(raw).hexdigest()
        for directory in ("shared-fixture", "second-fixture"):
            fixture = self.repo / "fixtures" / directory
            fixture.mkdir(parents=True)
            (fixture / "check.cjs").write_bytes(raw)
            (fixture / "evidence.json").write_text(json.dumps({
                "fixtureSha256": sha, "claims": claims,
            }))
        self.git("add", "fixtures")
        self.git("-c", "user.name=Fixture test", "-c", "user.email=fixture@example.invalid",
                 "commit", "-q", "-m", "Pinned fixture evidence")
        self.commit = self.git("rev-parse", "HEAD").decode().strip()
        for row in self.records:
            row["evidence"]["source"] = ("https://github.com/levencode-labs/deploom-npm/blob/"
                                          + self.commit + "/fixtures/shared-fixture/check.cjs")
            row["evidence"]["fixtureSha256"] = sha

    def git(self, *args):
        return subprocess.check_output(["git", *args], cwd=self.repo,
                                       stderr=subprocess.DEVNULL, timeout=10)

    def publish(self, name, *, trusted_commit=None):
        raw = json.dumps({"schema": 2, "records": self.records}).encode()
        return write_shards(raw, self.root / name, revision=42,
                            trusted_commit=trusted_commit or self.commit)

    @staticmethod
    def git_commands(mock):
        # check_output also uses subprocess.run; count the actual three commands.
        return [call.args[0][1] for call in mock.call_args_list
                if call.args and call.args[0][0] == "git"]

    def test_reads_each_source_once_but_checks_each_record(self):
        with chdir(self.repo), patch("shards_v2.public_version", return_value=True) as public, \
                patch("shards_v2.subprocess.run", wraps=subprocess.run) as commands:
            result = self.publish("valid")
        self.assertEqual(2, result["recordCount"])
        self.assertCountEqual(["merge-base", "show", "show"], self.git_commands(commands))
        self.assertEqual(4, public.call_count)
        public.assert_any_call("react-dom", "18.3.2")

    def test_cached_source_does_not_authorize_another_records_claim_or_controls(self):
        valid = copy.deepcopy(self.records)
        for mutation in ("wrong-claim", "wrong-hash", "missing-control"):
            with self.subTest(mutation=mutation):
                self.records = copy.deepcopy(valid)
                row = self.records[1]
                if mutation == "wrong-claim":
                    row["evidence"]["claim"]["check"] = "test"
                elif mutation == "wrong-hash":
                    row["evidence"]["fixtureSha256"] = "f" * 64
                else:
                    row["negativeControls"][0]["fixtureAssertion"] = "unreviewed-negative-control"
                with chdir(self.repo), patch("shards_v2.public_version", return_value=True):
                    with self.assertRaises(ValueError):
                        self.publish(mutation)
                self.assertFalse((self.root / mutation).exists())

    def test_distinct_sources_at_same_commit_are_independently_verified(self):
        row = self.records[1]
        row["evidence"]["source"] = row["evidence"]["source"].replace(
            "/shared-fixture/", "/second-fixture/")
        with chdir(self.repo), patch("shards_v2.public_version", return_value=True), \
                patch("shards_v2.subprocess.run", wraps=subprocess.run) as commands:
            self.publish("distinct")
        self.assertCountEqual(["merge-base", "show", "show"] * 2, self.git_commands(commands))

    def test_repeated_publishes_reverify_source(self):
        with chdir(self.repo), patch("shards_v2.public_version", return_value=True), \
                patch("shards_v2.subprocess.run", wraps=subprocess.run) as commands:
            self.publish("first")
            self.publish("second")
        self.assertCountEqual(["merge-base", "show", "show"] * 2, self.git_commands(commands))

    def test_trusted_commit_cannot_reuse_previous_invocation(self):
        with chdir(self.repo), patch("shards_v2.public_version", return_value=True):
            self.publish("valid")
            with self.assertRaises(subprocess.CalledProcessError):
                self.publish("untrusted", trusted_commit="f" * 40)
        self.assertFalse((self.root / "untrusted").exists())

    def test_another_repository_cannot_reuse_previous_invocation(self):
        other = self.root / "other-repo"
        other.mkdir()
        subprocess.check_call(["git", "init", "-q", str(other)])
        with patch("shards_v2.public_version", return_value=True):
            with chdir(self.repo):
                self.publish("valid")
            with chdir(other), self.assertRaises(subprocess.CalledProcessError):
                self.publish("other")
        self.assertFalse((self.root / "other").exists())


if __name__ == "__main__":
    unittest.main()
