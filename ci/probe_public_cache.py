"""Read deployed public data twice on independent packaged clients and count bytes."""
import argparse
import asyncio
import json
from pathlib import Path
from unittest.mock import patch

from deploom_mcp.public_cache import POINTER, get, refresh
from deploom_mcp import shared_records


def probe(directory):
    requests = []

    def fetch(url, limit, etag=None):
        data, tag = get(url, limit, etag)
        requests.append((url, bool(etag), len(data) if data is not None else 0))
        return data, tag

    tag = refresh(directory / "osv", fetch)
    shared_records.refresh(directory / "records", fetch)
    evidence = shared_records.lookup(directory / "records", "react-dom", "18.2.0", "18.3.1")
    if evidence["status"] != "found" or evidence["authority"] != "ADVISORY_ONLY" or evidence["snapshotSource"] != "verified-pages":
        raise ValueError("Public example record unavailable")
    first = requests[:]
    requests.clear()
    second = refresh(directory / "osv", fetch)
    shared_records.refresh(directory / "records", fetch)
    urls = [POINTER, shared_records.BASE + "cache.json"]
    if tag != second or requests != [(url, True, 0) for url in urls]:
        raise ValueError("The warm client fetched changed data. Rerun if the release advanced.")
    return tag, first, requests


def tamper_test(directory):
    def changed(url, limit, etag=None):
        if url.endswith("cache.json"):
            return b'{"schema":1,"revision":1,"history":[],"knowledge":[]}', '"unsigned"'
        if url.endswith("cache.sig"):
            return bytes(64), None
        raise AssertionError("Unexpected host or path")
    root = directory / "records"
    if shared_records.refresh(root, changed):
        raise ValueError("Modified snapshot was accepted")
    if shared_records.lookup(root, "react-dom", "18.2.0", "18.3.1")["snapshotSource"] != "bundled":
        raise ValueError("Expected the packaged snapshot")
    if not shared_records.refresh(root):
        raise ValueError("Failed to recover from rejected snapshot")


def check_public_advisory_fallback(work):
    from deploom_mcp.server import get_upgrade_plan_tool

    project = work / "lodash-demo"
    project.mkdir()
    manifest = {"name": "deploom-public-demo", "version": "1.0.0", "dependencies": {"lodash": "4.17.20"}}
    (project / "package.json").write_text(json.dumps(manifest))
    (project / "package-lock.json").write_text(json.dumps({"lockfileVersion": 3, "packages": {
        "": manifest, "node_modules/lodash": {"version": "4.17.20",
        "resolved": "https://registry.npmjs.org/lodash/-/lodash-4.17.20.tgz"}}}))
    with patch.dict("os.environ", {"DEPLOOM_MCP_OSV_DIR": str(work / "empty-osv"),
                                   "DEPLOOM_MCP_STATE_DIR": str(work / "planner-state"),
                                   "DEPLOOM_MCP_DISABLE_EXTERNAL_EVIDENCE": "1",
                                   "DEPLOOM_MCP_PUBLIC_ADVISORY_FALLBACK": "1"}):
        result = asyncio.run(get_upgrade_plan_tool(str(project.resolve()), registry="https://registry.npmjs.org",
                                                   use_system_proxy=False, deadline_seconds=90))
    payload = result.structured_content
    if not payload or not payload.get("ok"):
        raise ValueError("Public fallback plan failed")
    row, = (d for d in payload["dependencies"] if d["package"] == "lodash")
    evidence = row["evidence"]["currentSecurityEvidence"]
    if (evidence["status"] != "ASSESSED" or evidence["source"] != "REGISTRY_BULK_ADVISORY"
            or evidence["osvReason"] != "SNAPSHOT_UNAVAILABLE" or evidence["findingCount"] < 1):
        raise ValueError(f"Expected public registry evidence for lodash@4.17.20: {evidence}")
    return evidence


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("work", type=Path)
    work = parser.parse_args().work
    if work.exists():
        parser.error("work directory must be new")
    first = probe(work / "one")
    second = probe(work / "two")
    if first != second:
        raise ValueError("Independent clients differed. Rerun if the release advanced.")
    tamper_test(work / "two")
    print(json.dumps({"tag": first[0], "coldBytes": [n for _, _, n in first[1]],
                      "warmBytes": [n for _, _, n in first[2]], "profiles": 2,
                      "rejectedTamperedSnapshot": True,
                      "publicAdvisoryFallback": check_public_advisory_fallback(work.resolve())}))
