#!/usr/bin/env python3
"""Actual Stage C CLI against a manually assembled candidate runtime layout.

This test is not a registry installation and does not qualify release A.
It changes only a temporary XDG_DATA_HOME and retained report files. The
selected runtime directory is a symlink to an already installed candidate
wheel environment; no Python, wheel, package or client configuration is
installed or changed. strace observes actual network system calls when ptrace
is available; unavailable observation is retained explicitly, never reported
as zero traffic.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import stat
import subprocess
import tempfile
import zipfile


def sha(raw):
    return hashlib.sha256(raw).hexdigest()


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode()


def tree_snapshot(root):
    entries = []
    for path in sorted(Path(root).rglob("*")):
        relative = path.relative_to(root).as_posix()
        info = path.lstat()
        row = {"path": relative, "mode": stat.S_IMODE(info.st_mode), "mtimeNs": info.st_mtime_ns}
        if path.is_symlink():
            row.update(kind="symlink", targetSha256=sha(os.readlink(path).encode()))
        elif path.is_file():
            row.update(kind="file", bytes=info.st_size, sha256=sha(path.read_bytes()))
        elif path.is_dir():
            row.update(kind="directory")
        else:
            raise AssertionError("Unexpected test filesystem entry")
        entries.append(row)
    return {"entries": len(entries), "sha256": sha(canonical(entries))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--runtime", type=Path, required=True)
    parser.add_argument("--wheel", type=Path, required=True)
    parser.add_argument("--cli", type=Path, default=Path(__file__).resolve().parents[2] / "bin/deploom.cjs")
    parser.add_argument("--output-dir", type=Path, default=Path(__file__).resolve().parent)
    parser.add_argument("--require-network-trace", action="store_true",
                        help="Fail if strace cannot observe network system calls")
    args = parser.parse_args()
    runtime, wheel, cli = args.runtime.resolve(), args.wheel.resolve(), args.cli.resolve()
    output = args.output_dir.resolve()
    output.mkdir(parents=True, exist_ok=True)
    node, tracer = shutil.which("node"), shutil.which("strace")
    assert node, "Node is required"
    trace_probe = None
    if tracer:
        trace_probe = subprocess.run([tracer, "-f", "-qq", "-e", "trace=network", "-e", "signal=none",
                                      "-o", str(output / "installed-cli-tracer-probe.trace"), "true"],
                                     text=True, capture_output=True, timeout=5)
    can_trace = trace_probe is not None and trace_probe.returncode == 0 and trace_probe.stderr == ""
    network_observation = {"status": "OBSERVED" if can_trace else "NOT_OBSERVED", "tool": "strace"}
    if not can_trace:
        message = trace_probe.stderr if trace_probe else "strace is not installed\n"
        failure = output / "installed-cli-network-trace-unavailable.txt"
        failure.write_text(message, encoding="utf-8")
        probe_file = output / "installed-cli-tracer-probe.trace"
        if probe_file.exists() and not probe_file.read_bytes():
            probe_file.unlink()
        network_observation.update(reason="PTRACE_UNAVAILABLE" if tracer else "TRACER_UNAVAILABLE",
                                   evidence=failure.name, sha256=sha(message.encode()))
        assert not args.require_network_trace, message
    assert os.name == "posix" and (runtime / "bin/python3.13").is_file()
    pkg = cli.parent.parent
    package = json.loads((pkg / "package.json").read_bytes())
    lock = (pkg / "bin/posix-requirements.txt").read_bytes()
    locked = re.search(rb"deploom_mcp-([0-9]+\.[0-9]+\.[0-9]+)-py3-none-any\.whl", lock).group(1).decode()
    candidate_sha = sha(wheel.read_bytes())
    site = runtime / "lib/python3.13/site-packages"
    verified_files = 0
    with zipfile.ZipFile(wheel) as archive:
        for item in archive.infolist():
            if item.is_dir() or not item.filename.startswith("deploom_mcp/"):
                continue
            actual = site / item.filename
            assert actual.is_file() and sha(actual.read_bytes()) == sha(archive.read(item)), item.filename
            verified_files += 1
    assert verified_files > 0
    results = []
    fixture_version = "0.0.0-stagec.fixture"
    assert fixture_version != package["version"]
    with tempfile.TemporaryDirectory(prefix="deploom-c3-cli-") as directory:
        isolated = Path(directory)
        data_home = isolated / "xdg-data"
        base = data_home / "DepLoom/public"
        selected = base / "versions" / fixture_version
        selected.parent.mkdir(parents=True)
        selected.symlink_to(runtime, target_is_directory=True)
        profile = base / "clients/codex"
        profile.mkdir(parents=True)
        (profile / "active.json").write_bytes(canonical({"version": fixture_version,
            "fixture": "manually assembled candidate layout; not a registry installation"}))
        environment = {key: value for key, value in os.environ.items()
                       if not key.startswith("DEPLOOM_") and key not in ("PYTHONPATH", "PYTHONHOME", "NODE_OPTIONS")}
        environment.update(XDG_DATA_HOME=str(data_home), LOCALAPPDATA=str(data_home), DEPLOOM_MCP_LOCAL_CACHE_ONLY="1")
        before_local, before_runtime = tree_snapshot(isolated), tree_snapshot(runtime)
        for name, arguments in (("json", ["diagnose", "--client", "codex", "--json"]),
                                ("human", ["diagnose"])):
            trace_file = output / f"installed-cli-{name}-network.trace"
            command = [node, str(cli), *arguments]
            traced = ([tracer, "-f", "-qq", "-e", "trace=network", "-e", "signal=none", "-o", str(trace_file), *command]
                      if can_trace else command)
            if not can_trace and trace_file.exists():
                trace_file.unlink()  # discard only this harness's empty failed trace
            result = subprocess.run(traced, cwd=isolated, env=environment, text=True, capture_output=True, timeout=45)
            assert result.returncode == 1, (name, result.returncode, result.stderr)
            assert result.stderr == "", (name, result.stderr)
            network = trace_file.read_bytes() if can_trace else None
            if can_trace:
                assert not network.strip(), (name, "Unexpected network syscall", network.decode())
            filename = f"installed-cli-{name}." + ("json" if name == "json" else "txt")
            (output / filename).write_text(result.stdout, encoding="utf-8")
            results.append({"kind": name, "command": command, "exitCode": result.returncode,
                            "stdout": filename, "stdoutSha256": sha(result.stdout.encode()),
                            "networkObservation": network_observation["status"],
                            "networkTrace": trace_file.name if can_trace else None,
                            "networkTraceSha256": sha(network) if can_trace else None,
                            "networkSyscalls": 0 if can_trace else None})
            if name == "json":
                observed = json.loads(result.stdout)
                assert observed["cli"]["version"] == package["version"]
                assert observed["selection"] == {"client": "codex", "source": "SELECTED_ACTIVE_PROFILE", "version": fixture_version}
                actual = observed["runtime"]
                assert actual["status"] == "READY" and actual["loadingSource"] == "INSTALLED_WHEEL"
                assert Path(actual["packageDirectory"]).resolve() == site / "deploom_mcp"
                assert actual["mcpVersion"] == actual["distributionVersion"] == "0.2.34"
                assert actual["coreVersion"] == "0.1.22" and actual["coreIntegrity"] == "MATCHES_RELEASE_INVENTORY"
                assert actual["coreRevision"] == "8c65fc7311062169d1b1e058c5463a39efaed3d9"
                assert actual["installOrigin"]["kind"] == "LOCAL_WHEEL"
                assert actual["installOrigin"]["archiveSha256"] == candidate_sha
                assert actual["installOrigin"]["publication"] == "NOT_CHECKED"
                assert observed["expectedRelease"]["source"] == "NOT_AVAILABLE_FOR_SELECTED_PROFILE"
                assert actual["expectedPins"]["mcp"] == actual["expectedPins"]["core"] == "NOT_SUPPLIED"
                assert observed["knowledgePolicy"]["cachedKnowledgeEnabled"] is True
                assert set(observed["sources"]) == {"osv", "knowledgeV1", "knowledgeV2", "knowledgeV3"}
                assert all(source["status"] == "UNKNOWN" for source in observed["sources"].values())
                assert observed["sources"]["osv"]["reason"] == "SNAPSHOT_UNAVAILABLE"
                assert observed["selectedKnowledgeSnapshot"] is None
                assert observed["readOnly"] and observed["requiresProjectVerification"]
                assert observed["knowledgeStates"]["published"]["status"] == "NOT_CHECKED"
            else:
                assert "MCP 0.2.34; Core 0.1.22; INSTALLED_WHEEL" in result.stdout
                assert "Install origin: LOCAL_WHEEL" in result.stdout
                assert "COMMON_ACTIVE_PROFILE" in result.stdout
                assert "Project verification is still required" in result.stdout
        after_local, after_runtime = tree_snapshot(isolated), tree_snapshot(runtime)
        assert before_local == after_local, "CLI changed its isolated client/cache environment"
        assert before_runtime == after_runtime, "CLI changed its installed runtime"
        assert not (base / "cache").exists(), "Diagnostic created missing cache directories"
    source_files = {name: sha((pkg / name).read_bytes()) for name in
                    ("package.json", "bin/deploom.cjs", "bin/diagnose.cjs", "bin/launch.cjs", "bin/posix-requirements.txt")}
    receipt = {"schemaVersion": 1, "status": "PASS" if can_trace else "PASS_WITH_OBSERVATION_LIMIT", "scope": "source CLI against manually assembled installed C candidate",
        "ordinaryRegistryInstallation": False, "releaseAAcceptance": False, "productionPublicationVerified": False,
        "candidateWheelSha256": candidate_sha, "wheelPackageFilesVerified": verified_files,
        "sourceCliVersion": package["version"], "existingPosixLockMcpVersion": locked,
        "selectedFixtureRuntimeVersion": fixture_version, "sourceFileSha256": source_files,
        "node": subprocess.check_output([node, "--version"], text=True).strip(),
        "runtime": observed["runtime"], "expectedRelease": observed["expectedRelease"],
        "isolation": {"configuration": "temporary XDG_DATA_HOME/LOCALAPPDATA only", "localCacheOnly": True,
                      "runtimeLayout": "temporary version-directory symlink to existing installed candidate venv",
                      "PYTHONPATH": "REMOVED", "PYTHONHOME": "REMOVED", "globalConfigurationChanged": False,
                      "cacheDirectoryCreated": False, "localBefore": before_local, "localAfter": after_local,
                      "runtimeBefore": before_runtime, "runtimeAfter": after_runtime},
        "networkObservation": network_observation, "observations": results,
        "reproduce": "python docs/stage-c/exercise-installed-cli.py --runtime <installed-C-venv> --wheel <exact-C-wheel> --output-dir docs/stage-c"}
    (output / "installed-cli-receipt.json").write_bytes(canonical(receipt))
    print(json.dumps({"status": receipt["status"], "candidateWheelSha256": candidate_sha,
                      "wheelPackageFilesVerified": verified_files, "networkSyscalls": 0 if can_trace else None,
                      "networkObservation": network_observation["status"],
                      "localStateUnchanged": True, "installedRuntimeUnchanged": True,
                      "ordinaryRegistryInstallation": False, "cliVersion": package["version"],
                      "mcpVersion": observed["runtime"]["mcpVersion"], "oldLockMcpVersion": locked}, sort_keys=True))


if __name__ == "__main__":
    main()
