"""Bind Stage B execution reports to exact inputs and the complete CI matrix."""
import argparse
import hashlib
import json
import os
import platform
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
NODE = "v24.18.0"
SUITES = {
    "package-managers": "fixtures/stageb-package-managers",
    "react-ui": "fixtures/stageb-react-ui",
    "typescript-workspaces": "fixtures/stageb-typescript-workspaces",
}
RUNNERS = {"ubuntu-22.04": "Linux", "windows-latest": "Windows"}
NODE_PLATFORMS = {"ubuntu-22.04": "linux", "windows-latest": "win32"}
MANAGER_TOOLS = {
    "npm": ("11.16.0", "node-modules"),
    "yarn": ("4.12.0", "pnp"),
    "pnpm": ("10.29.3", "isolated-node-modules"),
}
MANAGERS = tuple(MANAGER_TOOLS)
EXPECTED = {(suite, runner, manager)
            for suite in SUITES for runner in RUNNERS
            for manager in (MANAGERS if suite == "package-managers" else ("npm",))}


def require(condition, message):
    if not condition:
        raise ValueError(message)


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def sha256(raw):
    return hashlib.sha256(raw).hexdigest()


def read_json(path):
    raw = Path(path).read_bytes()
    require(len(raw) <= 2_000_000, "Evidence JSON exceeds its bound")
    def unique(items):
        result = dict(items)
        require(len(result) == len(items), "Duplicate JSON field")
        return result
    return json.loads(raw, object_pairs_hook=unique), raw


def git(root, *args):
    return subprocess.check_output(["git", *args], cwd=root, timeout=30)


def input_manifest(root, commit, suite):
    require(re.fullmatch(r"[a-f0-9]{40}", commit), "Expected exact source commit")
    prefix = SUITES[suite] + "/"
    listing = git(root, "ls-tree", "-r", "-z", commit, "--", SUITES[suite])
    result = []
    for entry in listing.split(b"\0"):
        if not entry:
            continue
        metadata, raw_path = entry.split(b"\t", 1)
        mode, kind, blob = metadata.decode("ascii").split()
        path = raw_path.decode("utf-8")
        require(mode in {"100644", "100755"} and kind == "blob" and path.startswith(prefix),
                "Fixture input must be a regular tracked Git blob")
        raw = git(root, "cat-file", "blob", blob)
        require(len(raw) <= 2_000_000, "One retained input exceeds its bound")
        result.append({"path": path, "gitBlob": blob, "bytes": len(raw), "sha256": sha256(raw)})
    require(result and any(row["path"] == prefix + "check.cjs" for row in result),
            "Fixture inputs or checker missing")
    return sorted(result, key=lambda row: row["path"])


def node_version():
    return subprocess.check_output(["node", "--version"], text=True, timeout=15).strip()


def validate_execution_identity(report, suite, runner, manager, inputs):
    """Bind the checker's own identity and input hashes to the receipt's matrix leg."""
    require((suite, runner, manager) in EXPECTED, "Unexpected matrix leg")
    require(isinstance(report, dict) and report.get("status") == "passed", "Execution report did not pass")
    if suite == "package-managers":
        require(report.get("schemaVersion") == 1, "Execution report suite does not match its matrix leg")
        require(report.get("manager") == manager, "Execution report manager does not match its matrix leg")
        results = report.get("results")
        version, mode = MANAGER_TOOLS[manager]
        require(isinstance(results, list) and len(results) == 1 and isinstance(results[0], dict)
                and results[0].get("manager") == manager and results[0].get("managerVersion") == version
                and results[0].get("mode") == mode and results[0].get("status") == "passed",
                "Execution report manager toolchain does not match its matrix leg")
        runtime, expected_node = report.get("runtime"), NODE.removeprefix("v")
    else:
        require(report.get("schema") == 1 and report.get("fixture") == "stageb-" + suite,
                "Execution report suite does not match its matrix leg")
        runtime = report.get("toolchain") if suite == "typescript-workspaces" else report
        expected_node = NODE
    require(isinstance(runtime, dict) and runtime.get("node") == expected_node
            and runtime.get("platform") == NODE_PLATFORMS[runner],
            "Execution report Node or platform does not match its matrix leg")

    prefix = SUITES[suite] + "/"
    retained = {row["path"][len(prefix):]: row for row in inputs}
    if suite == "typescript-workspaces":
        require(runtime.get("npm") == MANAGER_TOOLS["npm"][0],
                "Execution report manager toolchain does not match its matrix leg")
        for field, name in (("fixtureSha256", "check.cjs"), ("toolchainLockSha256", "package-lock.json"),
                            ("workspaceLockSha256", "workspace/package-lock.json")):
            require(name in retained and report.get(field) == retained[name]["sha256"],
                    "Execution report input binding changed: " + name)
    else:
        reported_inputs, seen = report.get("inputs"), set()
        require(isinstance(reported_inputs, list), "Execution report input binding missing")
        for row in reported_inputs:
            require(isinstance(row, dict) and isinstance(row.get("path"), str),
                    "Execution report input binding malformed")
            name = row["path"]
            require(name in retained and name not in seen and row.get("bytes") == retained[name]["bytes"]
                    and row.get("sha256") == retained[name]["sha256"],
                    "Execution report input binding changed: " + name)
            seen.add(name)
        require("check.cjs" in seen, "Execution report checker binding missing")


def capture(root, suite, runner, manager, report, destination):
    require((suite, runner, manager) in EXPECTED, "Unexpected matrix leg")
    require(platform.system() == RUNNERS[runner], "Runner operating system does not match")
    require(node_version() == NODE, "The exact Node toolchain is required")
    commit = git(root, "rev-parse", "HEAD").decode("ascii").strip()
    subprocess.run(["git", "diff", "--exit-code", "HEAD", "--", SUITES[suite]],
                   cwd=root, check=True, timeout=30)
    data, raw = read_json(report)
    require(report.resolve().parent == destination.resolve().parent, "Keep report beside its receipt")
    run_id, attempt = os.environ.get("GITHUB_RUN_ID", ""), os.environ.get("GITHUB_RUN_ATTEMPT", "")
    require(run_id.isdigit() and attempt.isdigit() and int(attempt) > 0, "A real CI run identity is required")
    inputs = input_manifest(root, commit, suite)
    validate_execution_identity(data, suite, runner, manager, inputs)
    for item in inputs:
        current = (root / item["path"]).read_bytes()
        require(len(current) == item["bytes"] and sha256(current) == item["sha256"],
                "Fixture inputs changed during execution")
    receipt = {
        "schema": 1, "suite": suite, "runner": runner, "manager": manager,
        "status": "passed", "sourceCommit": commit,
        "workflow": {"runId": int(run_id), "attempt": int(attempt),
                     "job": os.environ.get("GITHUB_JOB", ""), "event": os.environ.get("GITHUB_EVENT_NAME", "")},
        "runtime": {"node": NODE, "system": platform.system(), "arch": platform.machine()},
        "inputs": inputs, "inputManifestSha256": sha256(canonical(inputs)),
        "execution": {"path": report.name, "bytes": len(raw), "sha256": sha256(raw)},
    }
    destination.parent.mkdir(parents=True, exist_ok=True)
    destination.write_bytes(canonical(receipt))
    print(json.dumps({"leg": [suite, runner, manager], "sourceCommit": commit,
                      "reportSha256": receipt["execution"]["sha256"]}))
    return receipt


def verify(root, directory, commit, run_id):
    manifests, seen, verified = {}, set(), []
    for path in sorted(directory.rglob("receipt.json")):
        row, receipt_raw = read_json(path)
        key = (row.get("suite"), row.get("runner"), row.get("manager"))
        require(key in EXPECTED and key not in seen, "Unexpected or duplicate matrix leg")
        require(row.get("schema") == 1 and row.get("status") == "passed", "Unsuccessful receipt")
        require(row.get("sourceCommit") == commit, "Receipt belongs to another source commit")
        workflow = row.get("workflow", {})
        require(workflow.get("runId") == run_id and type(workflow.get("attempt")) is int
                and workflow["attempt"] > 0, "Receipt belongs to another CI run")
        require(row.get("runtime", {}).get("node") == NODE
                and row["runtime"].get("system") == RUNNERS[key[1]], "Toolchain or operating system changed")
        if key[0] not in manifests:
            manifests[key[0]] = input_manifest(root, commit, key[0])
        inputs = manifests[key[0]]
        require(row.get("inputs") == inputs
                and row.get("inputManifestSha256") == sha256(canonical(inputs)), "Retained input binding changed")
        execution = row.get("execution", {})
        name = execution.get("path", "")
        require(isinstance(name, str) and re.fullmatch(r"[a-z0-9_-]+\.json", name), "Unsafe execution report path")
        report, raw = read_json(path.parent / name)
        require(len(raw) == execution.get("bytes") and sha256(raw) == execution.get("sha256"),
                "Execution report bytes changed")
        validate_execution_identity(report, *key, inputs)
        seen.add(key)
        verified.append({"suite": key[0], "runner": key[1], "manager": key[2],
                         "runAttempt": workflow["attempt"],
                         "receiptSha256": sha256(receipt_raw), "executionSha256": sha256(raw),
                         "executionBytes": len(raw), "inputManifestSha256": row["inputManifestSha256"]})
    require(seen == EXPECTED, "Incomplete Stage B matrix: " + repr(sorted(EXPECTED - seen)))
    result = {"schema": 1, "status": "passed", "sourceCommit": commit, "runId": run_id,
              "requiredLegs": len(EXPECTED), "verifiedLegs": verified}
    return result


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("capture")
    create.add_argument("--suite", choices=SUITES, required=True)
    create.add_argument("--runner", choices=RUNNERS, required=True)
    create.add_argument("--manager", choices=MANAGERS, default="npm")
    create.add_argument("--report", type=Path, required=True)
    create.add_argument("--output", type=Path, required=True)
    check = commands.add_parser("verify")
    check.add_argument("directory", type=Path)
    check.add_argument("--commit", required=True)
    check.add_argument("--run-id", required=True, type=int)
    check.add_argument("--output", required=True, type=Path)
    args = parser.parse_args()
    if args.command == "capture":
        capture(ROOT, args.suite, args.runner, args.manager, args.report, args.output)
    else:
        result = verify(ROOT, args.directory, args.commit, args.run_id)
        args.output.parent.mkdir(parents=True, exist_ok=True)
        args.output.write_bytes(canonical(result))
        print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
