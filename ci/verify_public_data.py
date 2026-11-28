"""Verify deployed editions with the installed, hash-pinned DepLoom wheel."""
import argparse
import hashlib
import importlib.metadata
import json
import sqlite3
import sys
import tempfile
from contextlib import closing
from pathlib import Path
from unittest.mock import patch

from deploom_mcp import public_cache, shared_records_v2
from deploom_mcp.distribution import resolve_core_dir, release_manifest_path


def verify(source, revision):
    expected = hashlib.sha256(source.read_bytes()).hexdigest()
    with tempfile.TemporaryDirectory() as temporary:
        root = Path(temporary)
        tag = public_cache.refresh(root / "osv")
        manifest = json.loads((root / "osv/active.json").read_bytes())
        if manifest["expires"] != manifest["published"] + 7 * 86400:
            raise ValueError("OSV expiry policy changed")
        if not public_cache.usable(root / "osv", manifest):
            raise ValueError("Installed OSV database failed its manifest digest")
        if not shared_records_v2.refresh(root / "records"):
            raise ValueError("Installed DepLoom rejected the published knowledge edition")
        with closing(sqlite3.connect(root / "records" / shared_records_v2.DB)) as db:
            raw, signature = db.execute("SELECT raw,sig FROM edition WHERE id=1").fetchone()
        edition = shared_records_v2.verified_index(raw, signature)
        if edition["revision"] != revision or edition["sourceSha256"] != expected:
            raise ValueError("Published knowledge is not the exact deployed source/revision")
        hit = shared_records_v2.lookup(root / "records", "react-dom", "18.2.0", "18.3.1")
        if not hit or hit["status"] != "found":
            raise ValueError("Installed DepLoom cannot read the signed knowledge records")
        # Import the Core bundled in the installed wheel, never this checkout.
        sys.path.insert(0, str(resolve_core_dir()))
        import osv_offline
        with patch.object(osv_offline.time, "time", return_value=manifest["expires"]):
            assessment = osv_offline.assess(root / "osv", "lodash", ["4.17.20"])
            if assessment["4.17.20"].reason != "SNAPSHOT_STALE":
                raise ValueError("Expired installed snapshot was not rejected at the seven-day boundary")
        component = json.loads(release_manifest_path().read_bytes())
        return {
            "mcpVersion": importlib.metadata.version("deploom-mcp"),
            "coreRevision": component["core"]["revision"],
            "osv": {"tag": tag, "sha256": manifest["sha256"],
                    "published": manifest["published"], "expires": manifest["expires"],
                    "manifestAndDatabaseVerified": True},
            "knowledge": {"revision": edition["revision"], "sourceSha256": expected,
                          "records": edition["recordCount"], "signatureVerified": True},
            "expiredSnapshot": {"status": "UNKNOWN", "reason": "SNAPSHOT_STALE"},
        }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--revision", type=int, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = json.dumps(verify(args.source, args.revision), sort_keys=True, indent=2) + "\n"
    args.output.write_text(report, encoding="utf-8")
    print(report, end="")
