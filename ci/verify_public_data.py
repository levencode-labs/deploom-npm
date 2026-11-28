"""Verify deployed editions with the installed, hash-pinned DepLoom wheel."""
import argparse
import hashlib
import importlib.metadata
import json
import os
import sqlite3
import subprocess
import sys
import tempfile
from contextlib import closing
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from installed_release_guard import check_installed

from deploom_mcp import public_cache, shared_records, shared_records_v2, shared_records_v3
from deploom_mcp.distribution import resolve_core_dir, release_manifest_path

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "cache"))
from evidence_scopes import annotate_corpus


def verify(source, scopes, revision, lock):
    identity = check_installed(lock)
    raw_source = source.read_bytes()
    expected_v2 = hashlib.sha256(raw_source).hexdigest()
    trusted = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True, timeout=30).strip()
    scoped = annotate_corpus(raw_source, scopes.read_bytes(), trusted_commit=trusted)
    expected_v3 = hashlib.sha256(scoped).hexdigest()
    expected_rows = {row["id"]: row for row in json.loads(scoped)["records"]}
    expected_legacy_rows = {row["id"]: row for row in json.loads(raw_source)["records"]}
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        with patch.dict(os.environ, {"DEPLOOM_MCP_RECORDS_DIR": str(root / "records")}):
            health = public_cache.refresh_all(root / "osv")
        if (health.get("ok") is not True or health.get("status") != "READY"
                or set(health.get("sources", {})) != {"osv", "knowledgeV1", "knowledgeV2", "knowledgeV3"}
                or any(value.get("status") != "READY" for value in health["sources"].values())):
            raise ValueError(f"Installed aggregate public-cache refresh is not READY: {health}")
        tag = health["sources"]["osv"]["edition"]
        manifest = json.loads((root / "osv/active.json").read_bytes())
        if manifest["expires"] != manifest["published"] + 7 * 86400:
            raise ValueError("OSV expiry policy changed")
        if not public_cache.usable(root / "osv", manifest):
            raise ValueError("Installed OSV database failed its manifest digest")
        with closing(sqlite3.connect(root / "records" / shared_records.DATABASE)) as db:
            raw, signature = db.execute("SELECT data,sig FROM signed WHERE id=1 AND active=1").fetchone()
            legacy = shared_records.verified(raw, signature)
        deployed_revision = legacy["revision"]
        if revision is not None and deployed_revision != revision:
            raise ValueError("Knowledge v1 differs from the requested deployment revision")
        editions = {"v1": {"revision": deployed_revision, "signatureVerified": True}}
        actual_editions = {2: {}, 3: {}}
        for reader, expected in ((shared_records_v2, expected_v2), (shared_records_v3, expected_v3)):
            with closing(sqlite3.connect(root / "records" / reader.DB)) as db:
                raw, signature = db.execute("SELECT raw,sig FROM edition WHERE id=1").fetchone()
                edition = reader.verified_index(raw, signature)
                if (edition["revision"] != deployed_revision or edition["sourceSha256"] != expected
                        or edition["recordCount"] != len(expected_rows)):
                    raise ValueError(f"Knowledge v{reader.SCHEMA} differs from deployed source/revision")
                for bucket, descriptors in edition["buckets"].items():
                    for desc in descriptors:
                        payload = db.execute("SELECT data FROM shard WHERE path=?", (desc["path"],)).fetchone()[0]
                        for record in reader.verified_shard(payload, desc, bucket):
                            if record["id"] in actual_editions[reader.SCHEMA]:
                                raise ValueError(f"Published v{reader.SCHEMA} repeats a reviewed record")
                            actual_editions[reader.SCHEMA][record["id"]] = record
            hit = reader.lookup(root / "records", "react-dom", "18.2.0", "18.3.1")
            if not hit or hit["status"] != "found" or hit["snapshotSchema"] != reader.SCHEMA:
                raise ValueError(f"Installed DepLoom cannot read signed knowledge v{reader.SCHEMA}")
            editions[f"v{reader.SCHEMA}"] = {
                "revision": edition["revision"], "sourceSha256": expected,
                "records": edition["recordCount"], "signatureVerified": True,
            }
        if actual_editions[2] != expected_legacy_rows or actual_editions[3] != expected_rows:
            raise ValueError("Published v2/v3 rows differ from the reproduced reviewed corpus")
        levels = Counter(row["evidenceScope"]["level"] for row in actual_editions[3].values())
        # Import the Core bundled in the installed wheel, never this checkout.
        sys.path.insert(0, str(resolve_core_dir()))
        import osv_offline
        with patch.object(osv_offline.time, "time", return_value=manifest["expires"]):
            assessment = osv_offline.assess(root / "osv", "lodash", ["4.17.20"])
            if assessment["4.17.20"].reason != "SNAPSHOT_STALE":
                raise ValueError("Expired installed snapshot was not rejected at the seven-day boundary")
        component = json.loads(release_manifest_path().read_bytes())
        return {
            "installedRuntime": identity,
            "mcpVersion": importlib.metadata.version("deploom-mcp"),
            "coreRevision": component["core"]["revision"],
            "osv": {"tag": tag, "sha256": manifest["sha256"],
                    "published": manifest["published"], "expires": manifest["expires"],
                    "manifestAndDatabaseVerified": True},
            "knowledge": {**editions, "evidenceLevels": dict(sorted(levels.items())),
                          "reviewedRecordParity": True},
            "aggregateRefresh": health,
            "expiredSnapshot": {"status": "UNKNOWN", "reason": "SNAPSHOT_STALE"},
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--scopes", type=Path, required=True)
    parser.add_argument("--revision", type=int,
                        help="Require this deployment revision; omit for scheduled corpus-parity checks")
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--lock", type=Path, default=Path("ci/mcp-release.json"))
    args = parser.parse_args()
    report = json.dumps(verify(args.source, args.scopes, args.revision, args.lock), sort_keys=True, indent=2) + "\n"
    args.output.write_text(report, encoding="utf-8")
    print(report, end="")
