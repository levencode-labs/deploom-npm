"""Negative controls for the evidence transport, not migration test results."""
import copy
import json
import os
import subprocess
import tempfile
import unittest
from contextlib import redirect_stdout
from io import StringIO
from pathlib import Path
from unittest.mock import patch

import stage_b_receipts as receipts


class ReceiptTransportTests(unittest.TestCase):
    def setUp(self):
        self.temporary = tempfile.TemporaryDirectory()
        self.addCleanup(self.temporary.cleanup)
        self.root = Path(self.temporary.name) / "source"
        self.root.mkdir()
        subprocess.run(["git", "init", "-q", str(self.root)], check=True)
        for directory in receipts.SUITES.values():
            path = self.root / directory
            path.mkdir(parents=True)
            (path / "check.cjs").write_text("// Synthetic receipt transport test input.\n", encoding="utf-8")
            (path / "package-lock.json").write_text('{"lockfileVersion":3}\n', encoding="utf-8")
        workspace = self.root / receipts.SUITES["typescript-workspaces"] / "workspace"
        workspace.mkdir()
        (workspace / "package-lock.json").write_text('{"lockfileVersion":3}\n', encoding="utf-8")
        subprocess.run(["git", "add", "."], cwd=self.root, check=True)
        subprocess.run(["git", "-c", "user.name=Receipt Test", "-c", "user.email=receipt@example.invalid",
                        "commit", "-qm", "Synthetic transport inputs"], cwd=self.root, check=True)
        self.commit = receipts.git(self.root, "rev-parse", "HEAD").decode().strip()
        self.artifacts = Path(self.temporary.name) / "artifacts"
        self.paths = []
        for suite, runner, manager in sorted(receipts.EXPECTED):
            directory = self.artifacts / f"{suite}-{runner}-{manager}"
            directory.mkdir(parents=True)
            report = directory / "execution.json"
            report.write_bytes(receipts.canonical(self.synthetic_report(suite, runner, manager)))
            path = directory / "receipt.json"
            with patch.object(receipts, "node_version", return_value=receipts.NODE), \
                 patch.object(receipts.platform, "system", return_value=receipts.RUNNERS[runner]), \
                 patch.dict(os.environ, {"GITHUB_RUN_ID": "42", "GITHUB_RUN_ATTEMPT": "1"}), \
                 redirect_stdout(StringIO()):
                receipts.capture(self.root, suite, runner, manager, report, path)
            self.paths.append(path)

    def synthetic_report(self, suite, runner, manager):
        """Represent the identity fields of each checker, without fake migration claims."""
        prefix = receipts.SUITES[suite] + "/"
        inputs = [{"path": row["path"][len(prefix):], "bytes": row["bytes"], "sha256": row["sha256"]}
                  for row in receipts.input_manifest(self.root, self.commit, suite)]
        node_platform = "linux" if runner == "ubuntu-22.04" else "win32"
        report = {"status": "passed", "testOnly": True}
        if suite == "package-managers":
            version, mode = {"npm": ("11.16.0", "node-modules"), "yarn": ("4.12.0", "pnp"),
                             "pnpm": ("10.29.3", "isolated-node-modules")}[manager]
            report.update(schemaVersion=1, manager=manager, inputs=inputs,
                          runtime={"node": "24.18.0", "platform": node_platform},
                          results=[{"manager": manager, "managerVersion": version,
                                    "mode": mode, "status": "passed"}])
        elif suite == "react-ui":
            report.update(schema=1, fixture="stageb-react-ui", node=receipts.NODE,
                          platform=node_platform, inputs=inputs)
        else:
            hashes = {row["path"]: row["sha256"] for row in inputs}
            report.update(schema=1, fixture="stageb-typescript-workspaces",
                          toolchain={"node": receipts.NODE, "platform": node_platform, "npm": "11.16.0"},
                          fixtureSha256=hashes["check.cjs"], toolchainLockSha256=hashes["package-lock.json"],
                          workspaceLockSha256=hashes["workspace/package-lock.json"])
        return report

    def leg(self, suite, runner="ubuntu-22.04", manager="npm"):
        return self.artifacts / f"{suite}-{runner}-{manager}" / "receipt.json"

    def assert_report_rejected(self, path, report, message):
        """Recompute transport hashes so only report identity/input validation can reject it."""
        execution = path.parent / "execution.json"
        original_receipt, original_report = path.read_bytes(), execution.read_bytes()
        row = json.loads(original_receipt)
        raw = receipts.canonical(report)
        row["execution"].update(bytes=len(raw), sha256=receipts.sha256(raw))
        execution.write_bytes(raw)
        path.write_bytes(receipts.canonical(row))
        try:
            with self.assertRaisesRegex(ValueError, message):
                self.verify()
            with patch.object(receipts, "node_version", return_value=receipts.NODE), \
                 patch.object(receipts.platform, "system", return_value=receipts.RUNNERS[row["runner"]]), \
                 patch.dict(os.environ, {"GITHUB_RUN_ID": "42", "GITHUB_RUN_ATTEMPT": "1"}), \
                 redirect_stdout(StringIO()), \
                 self.assertRaisesRegex(ValueError, message):
                receipts.capture(self.root, row["suite"], row["runner"], row["manager"], execution, path)
        finally:
            path.write_bytes(original_receipt)
            execution.write_bytes(original_report)

    def verify(self):
        return receipts.verify(self.root, self.artifacts, self.commit, 42)

    def test_complete_matrix_then_missing_leg_is_rejected(self):
        self.assertEqual(self.verify()["requiredLegs"], 10)
        self.paths[0].unlink()
        with self.assertRaisesRegex(ValueError, "Incomplete Stage B matrix"):
            self.verify()

    def test_report_tamper_is_rejected(self):
        (self.paths[0].parent / "execution.json").write_bytes(b'{"status":"passed","testOnly":false}\n')
        with self.assertRaisesRegex(ValueError, "report bytes changed"):
            self.verify()

    def test_relabelled_manager_and_toolchain_are_rejected(self):
        npm_report = json.loads((self.leg("package-managers").parent / "execution.json").read_bytes())
        self.assert_report_rejected(self.leg("package-managers", manager="yarn"), npm_report,
                                    "Execution report manager does not match")
        for field, value in (("manager", "yarn"), ("managerVersion", "0.0.0"), ("mode", "pnp")):
            with self.subTest(field=field):
                report = copy.deepcopy(npm_report)
                report["results"][0][field] = value
                self.assert_report_rejected(self.leg("package-managers"), report,
                                            "Execution report manager toolchain does not match")

    def test_wrong_report_node_or_operating_system_is_rejected(self):
        for suite in receipts.SUITES:
            wrong_node = "24.22.3" if suite == "package-managers" else "v24.22.3"
            for field, value in (("node", wrong_node), ("platform", "win32")):
                with self.subTest(suite=suite, field=field):
                    path = self.leg(suite)
                    report = json.loads((path.parent / "execution.json").read_bytes())
                    runtime = report["runtime"] if suite == "package-managers" else (
                        report["toolchain"] if suite == "typescript-workspaces" else report)
                    runtime[field] = value
                    self.assert_report_rejected(path, report, "Execution report Node or platform does not match")

    def test_relabelled_suite_is_rejected(self):
        for suite in receipts.SUITES:
            with self.subTest(suite=suite):
                path = self.leg(suite)
                other = "react-ui" if suite != "react-ui" else "typescript-workspaces"
                report = json.loads((self.leg(other).parent / "execution.json").read_bytes())
                self.assert_report_rejected(path, report, "Execution report suite does not match")

    def test_report_checker_hash_must_match_retained_git_input(self):
        for suite in receipts.SUITES:
            with self.subTest(suite=suite):
                path = self.leg(suite)
                report = json.loads((path.parent / "execution.json").read_bytes())
                if suite == "typescript-workspaces":
                    report["fixtureSha256"] = "f" * 64
                else:
                    next(row for row in report["inputs"] if row["path"] == "check.cjs")["sha256"] = "f" * 64
                self.assert_report_rejected(path, report, "Execution report input binding changed")

    def test_relabelled_source_or_retained_lock_is_rejected(self):
        path = self.paths[0]
        original = json.loads(path.read_bytes())
        wrong_source = copy.deepcopy(original)
        wrong_source["sourceCommit"] = "a" * 40
        path.write_bytes(receipts.canonical(wrong_source))
        with self.assertRaisesRegex(ValueError, "another source commit"):
            self.verify()
        wrong_input = copy.deepcopy(original)
        wrong_input["inputs"][0]["sha256"] = "b" * 64
        wrong_input["inputManifestSha256"] = receipts.sha256(receipts.canonical(wrong_input["inputs"]))
        path.write_bytes(receipts.canonical(wrong_input))
        with self.assertRaisesRegex(ValueError, "input binding changed"):
            self.verify()

    def test_duplicate_leg_and_other_run_are_rejected(self):
        path = self.paths[0]
        extra = self.artifacts / "duplicate"
        extra.mkdir()
        (extra / "receipt.json").write_bytes(path.read_bytes())
        (extra / "execution.json").write_bytes((path.parent / "execution.json").read_bytes())
        with self.assertRaisesRegex(ValueError, "duplicate matrix leg"):
            self.verify()
        (extra / "receipt.json").unlink()
        row = json.loads(path.read_bytes())
        row["workflow"]["runId"] = 43
        path.write_bytes(receipts.canonical(row))
        with self.assertRaisesRegex(ValueError, "another CI run"):
            self.verify()


if __name__ == "__main__":
    unittest.main()
