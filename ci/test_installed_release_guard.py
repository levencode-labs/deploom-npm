"""The release proof must reject an old wheel, editable install and wrong hash."""
import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from installed_release_guard import STAGE_A, check_installed, validate_lock, verify_direct_url


def lock():
    return dict(STAGE_A, repository="levencode-labs/deploom-mcp", tag="v0.2.34", sha256="a" * 64,
                url="https://github.com/levencode-labs/deploom-mcp/releases/download/v0.2.34/deploom_mcp-0.2.34-py3-none-any.whl")


class InstalledReleaseGuardTests(unittest.TestCase):
    def test_previous_runtime_and_wrong_source_cannot_satisfy_stage_a(self):
        for key, value in (("version", "0.2.33"), ("commit", "b" * 40),
                           ("coreRevision", "c" * 40), ("tag", "v0.2.33"),
                           ("url", "file:///tmp/deploom.whl"), ("sha256", "unknown")):
            candidate = lock()
            candidate[key] = value
            with self.subTest(key=key), self.assertRaises(ValueError):
                validate_lock(candidate)

    def test_exact_origin_is_required_without_an_editable_escape(self):
        expected = lock()
        origin = {"url": expected["url"], "archive_info": {"hashes": {"sha256": expected["sha256"]}}}
        verify_direct_url(origin, expected)
        for candidate in (
            dict(origin, url="file:///tmp/local.whl"), dict(origin, dir_info={"editable": True}),
            dict(origin, dir_info={"editable": False}), dict(origin, archive_info={}),
            dict(origin, archive_info={"hashes": {"sha256": "f" * 64}}),
            dict(origin, archive_info={"hashes": {"sha256": expected["sha256"]}, "hash": "sha256=" + "f" * 64}),
            dict(origin, archive_info={"hashes": {"sha256": "f" * 64}, "hash": "sha256=" + expected["sha256"]}),
            dict(origin, archive_info=[]),
        ):
            with self.subTest(candidate=candidate), self.assertRaises(ValueError):
                verify_direct_url(candidate, expected)

    def test_pythonpath_rejects_before_importing_a_runtime(self):
        with tempfile.TemporaryDirectory() as temporary:
            source = Path(temporary) / "release.json"
            source.write_text(json.dumps(lock()))
            with patch.dict(os.environ, {"PYTHONPATH": "/source/checkout"}):
                with self.assertRaisesRegex(ValueError, "PYTHONPATH_FORBIDDEN"):
                    check_installed(source)


if __name__ == "__main__":
    unittest.main()
