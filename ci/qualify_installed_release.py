"""Run retained R01/R02 scenarios against the installed published Stage A wheel.

The supplied checkouts provide tests only. All production modules must come from
the installed wheel, including its bundled Core. No public requests are allowed.
"""
from __future__ import annotations

import argparse
import hashlib
import importlib.util
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import unittest
from unittest.mock import patch

from installed_release_guard import check_installed, STAGE_A


def load_test(name, root, relative, commit):
    path = root / relative
    observed = subprocess.check_output(["git", "-C", str(root), "rev-parse", "HEAD"], text=True).strip()
    if observed != commit:
        raise ValueError("RETAINED_TEST_SOURCE_COMMIT_MISMATCH")
    raw = subprocess.check_output(["git", "-C", str(root), "show", commit + ":" + relative])
    if path.read_bytes() != raw:
        raise ValueError("RETAINED_TEST_SOURCE_BYTES_CHANGED")
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    sys.modules[name] = module
    spec.loader.exec_module(module)
    return module, {"commit": commit, "path": relative, "sha256": hashlib.sha256(raw).hexdigest()}


def qualify(lock, core_source, mcp_source):
    identity = check_installed(lock)
    import deploom_mcp
    from deploom_mcp.distribution import resolve_core_dir
    package = Path(deploom_mcp.__file__).resolve().parent
    core = resolve_core_dir().resolve()
    # This is the installed wheel's own Core directory, verified above. Neither
    # source checkout nor its src/tests directory is placed on the import path.
    sys.path.insert(0, str(core))
    originals = []
    security, retained = load_test("release_r01", core_source, "tests/test_online_security_evidence.py", STAGE_A["coreRevision"])
    originals.append(retained)
    fixture, retained = load_test("test_shared_knowledge_batch", mcp_source, "tests/test_shared_knowledge_batch.py", STAGE_A["commit"])
    originals.append(retained)
    policy, retained = load_test("release_r02", mcp_source, "tests/test_shared_records_private_policy.py", STAGE_A["commit"])
    originals.append(retained)
    r01 = unittest.defaultTestLoader.loadTestsFromModule(security)
    r02 = unittest.defaultTestLoader.loadTestsFromModule(policy)
    for method in (
        "test_private_snapshot_batch_uses_existing_matcher_and_keeps_sources_separate",
        "test_private_snapshot_plan_preserves_provenance_and_disables_official_lookup",
        "test_private_snapshot_failures_preserve_public_knowledge",
        "test_private_snapshot_requires_operator_opt_in_and_respects_disabled_mode",
        "test_private_scopes_and_disabled_evidence_do_not_look_up",
    ):
        r02.addTest(fixture.SignedBatchKnowledgeTests(method))
    lookup = socket.getaddrinfo
    outbound_attempts = []
    def loopback_only(host, *args, **kwargs):
        if host not in {"127.0.0.1", "localhost", "::1", b"127.0.0.1", b"localhost", b"::1"}:
            outbound_attempts.append("blocked-non-loopback")
            raise AssertionError("Public network is forbidden during R01/R02")
        return lookup(host, *args, **kwargs)
    results = {}
    with patch("socket.getaddrinfo", side_effect=loopback_only), patch.dict(os.environ, {"NO_PROXY": "127.0.0.1,localhost,::1"}):
        for label, suite in (("R01", r01), ("R02", r02)):
            result = unittest.TextTestRunner(verbosity=2).run(suite)
            results[label] = {"status": "PASS" if result.wasSuccessful() else "FAIL", "tests": result.testsRun,
                              "failures": len(result.failures), "errors": len(result.errors), "skipped": len(result.skipped)}
            if not result.wasSuccessful() or result.skipped:
                raise ValueError(label + "_INSTALLED_ACCEPTANCE_FAILED")
    if outbound_attempts:
        raise ValueError("R01_R02_ATTEMPTED_PUBLIC_NETWORK")
    for name, module in list(sys.modules.items()):
        location = getattr(module, "__file__", None)
        if not location:
            continue
        location = Path(location).resolve()
        if name == "deploom_mcp" or name.startswith("deploom_mcp."):
            if not location.is_relative_to(package):
                raise ValueError("MCP_SOURCE_IMPORT_DETECTED")
        if location.is_relative_to(core_source) or location.is_relative_to(mcp_source):
            if location not in {core_source / originals[0]["path"], mcp_source / originals[1]["path"], mcp_source / originals[2]["path"]}:
                raise ValueError("PRODUCTION_CHECKOUT_IMPORT_DETECTED")
    import dependency_live_roadmap_generator as engine
    if not Path(engine.__file__).resolve().is_relative_to(core):
        raise ValueError("CORE_SOURCE_IMPORT_DETECTED")
    return {"schema": 1, "runtime": identity, "acceptance": results, "testSources": originals,
            "publicNetworkRequests": 0, "r01Transport": "isolated-loopback-HTTP",
            "r02Surfaces": ["single", "batch", "plan"], "productionModules": "installed-wheel-only"}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--lock", type=Path, default=Path("ci/mcp-release.json"))
    parser.add_argument("--core-tests", type=Path, required=True)
    parser.add_argument("--mcp-tests", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = qualify(args.lock, args.core_tests.resolve(), args.mcp_tests.resolve())
    args.output.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, sort_keys=True))
