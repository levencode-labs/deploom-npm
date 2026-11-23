"""The retained v1 fallback is read-only and built from trusted main Git blobs."""
import json
import os
import subprocess
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


class LegacyFallbackTests(unittest.TestCase):
    def setUp(self):
        import records_intake
        self.intake = records_intake
        original = Path.cwd()
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        os.chdir(temp.name)
        self.addCleanup(os.chdir, original)
        (Path("docs/v1")).mkdir(parents=True)
        Path("docs/v1/history.json").write_text("[]")
        Path("docs/v1/knowledge.json").write_text("[]")
        subprocess.run(["git", "init", "-q"], check=True)
        self.sha = self.commit()

    def commit(self):
        subprocess.run(["git", "add", "."], check=True)
        subprocess.run(["git", "-c", "user.name=Test", "-c", "user.email=test@example.invalid",
                        "commit", "-qm", "fixture"], check=True)
        return self.intake.git("rev-parse", "HEAD").decode().strip()

    def test_source_exact_empty_fallback_and_bad_head(self):
        data = json.loads(self.intake.snapshot(self.sha))
        self.assertEqual([], data["history"])
        self.assertEqual([], data["knowledge"])
        self.assertEqual(1, data["schema"])
        with self.assertRaises(ValueError):
            self.intake.snapshot("main")
        with self.assertRaises(ValueError):
            self.intake.snapshot("../HEAD")

    def test_only_regular_tracked_files_and_valid_schemas(self):
        with self.assertRaisesRegex(ValueError, "regular"):
            self.intake.blob(self.sha, "not-a-file", 4096)
        Path("docs/v1/knowledge.json").write_text('[{"custom":"LLM text"}]')
        with self.assertRaises(ValueError):
            self.intake.snapshot(self.commit())

    def test_pinned_evidence_must_be_ancestor(self):
        with self.assertRaises(subprocess.CalledProcessError):
            self.intake.evidence(self.sha, "https://github.com/levencode-labs/deploom-npm/blob/" +
                                 "0"*40 + "/fixtures/test/check.cjs")
        self.assertFalse(hasattr(self.intake, "inspect_pr"))
        self.assertFalse(hasattr(self.intake, "additions"))


if __name__ == "__main__":
    unittest.main()
