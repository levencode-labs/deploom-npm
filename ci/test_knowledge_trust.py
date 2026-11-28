"""Real Git ancestry tests: current, historical, and untrusted release inputs."""
import json
from pathlib import Path
import subprocess
import tempfile
import unittest

from knowledge_trust import trusted_commit


class KnowledgeTrustTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        self.git("init", "-q", "-b", "main")
        self.git("config", "user.name", "Fixture")
        self.git("config", "user.email", "fixture@example.invalid")
        self.old = self.commit("0.2.31")
        self.git("tag", "-a", "npm-v0.2.31", "-m", "historical")
        self.tip = self.commit("0.2.32")
        self.git("update-ref", "refs/remotes/origin/main", self.tip)
        self.tag_env = {"GITHUB_REF_TYPE": "tag", "GITHUB_REF": "refs/tags/npm-v0.2.31"}

    def git(self, *args):
        return subprocess.check_output(["git", "-C", str(self.root), *args],
                                       text=True, timeout=30).strip()

    def commit(self, version):
        (self.root / "package.json").write_text(json.dumps({"version": version}), encoding="utf-8")
        self.git("add", "package.json")
        self.git("commit", "-qm", "fixture " + version)
        return self.git("rev-parse", "HEAD")

    def test_current_main_and_descendant_pr_keep_current_main_anchor(self):
        self.assertEqual(trusted_commit(self.root, env={}), self.tip)
        self.commit("0.2.33")
        self.assertEqual(trusted_commit(self.root, env={}), self.tip)

    def test_historical_tag_after_main_advances_uses_only_tagged_history(self):
        self.git("checkout", "-q", "--detach", self.old)
        self.assertEqual(trusted_commit(self.root, env=self.tag_env), self.old)

    def test_older_untagged_checkout_does_not_get_release_exception(self):
        self.git("checkout", "-q", "--detach", self.old)
        with self.assertRaises(subprocess.CalledProcessError):
            trusted_commit(self.root, env={})

    def test_matching_tag_off_main_is_rejected(self):
        self.git("checkout", "-q", "--detach", self.old)
        self.commit("0.2.99")
        self.git("tag", "-a", "npm-v0.2.99", "-m", "untrusted")
        with self.assertRaises(subprocess.CalledProcessError):
            trusted_commit(self.root, env={"GITHUB_REF_TYPE": "tag",
                                           "GITHUB_REF": "refs/tags/npm-v0.2.99"})

    def test_tag_checkout_mismatch_is_rejected(self):
        with self.assertRaisesRegex(ValueError, "RELEASE_TAG_HEAD_MISMATCH"):
            trusted_commit(self.root, env=self.tag_env)

    def test_wrong_version_is_rejected(self):
        self.git("checkout", "-q", "--detach", self.old)
        self.git("tag", "npm-v0.2.30")
        with self.assertRaisesRegex(ValueError, "RELEASE_TAG_VERSION_MISMATCH"):
            trusted_commit(self.root, env={"GITHUB_REF_TYPE": "tag",
                                           "GITHUB_REF": "refs/tags/npm-v0.2.30"})

    def test_non_npm_tags_keep_the_ordinary_ancestry_gate(self):
        env = {"GITHUB_REF_TYPE": "tag", "GITHUB_REF": "refs/tags/other"}
        self.assertEqual(trusted_commit(self.root, env=env), self.tip)
        self.git("checkout", "-q", "--detach", self.old)
        with self.assertRaises(subprocess.CalledProcessError):
            trusted_commit(self.root, env=env)


if __name__ == "__main__":
    unittest.main()
