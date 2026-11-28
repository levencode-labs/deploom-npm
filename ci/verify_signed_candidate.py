"""Verify the actual signed Pages candidate before deployment, without network."""
import argparse
from collections import Counter
from functools import partial
import hashlib
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
from unittest.mock import patch

from installed_release_guard import check_installed
from check_legacy_knowledge import check_stage_b_queries

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "cache"))
from evidence_scopes import annotate_corpus


def verify(site, revision, legacy_python, lock):
    identity = check_installed(lock)
    from deploom_mcp import shared_records, shared_records_v2, shared_records_v3
    source = ROOT / "knowledge/v2/records.json"
    raw = source.read_bytes()
    trusted = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
    annotated = annotate_corpus(raw, (ROOT / "knowledge/v3/evidence-scopes.json").read_bytes(), trusted_commit=trusted)
    legacy = shared_records.verified((site / "v1/cache.json").read_bytes(), (site / "v1/cache.sig").read_bytes())
    if legacy["revision"] != revision:
        raise ValueError("SIGNED_CANDIDATE_REVISION_MISMATCH")
    editions = {}
    with tempfile.TemporaryDirectory() as temporary, patch("socket.getaddrinfo", side_effect=AssertionError("Candidate verification is offline")):
        cache = Path(temporary)
        for reader, corpus in ((shared_records_v2, raw), (shared_records_v3, annotated)):
            directory = site / f"v{reader.SCHEMA}"
            def read(name, limit):
                target = (directory / name).resolve()
                if not target.is_relative_to(directory.resolve()):
                    raise ValueError("SIGNED_CANDIDATE_PATH_INVALID")
                with target.open("rb") as stream:
                    data = stream.read(limit + 1)
                if len(data) > limit:
                    raise ValueError("SIGNED_CANDIDATE_SIZE_INVALID")
                return data
            index_raw, sig = read("index.json", 2_000_000), read("index.sig", 64)
            index = reader.verified_index(index_raw, sig)
            if index["revision"] != revision or index["sourceSha256"] != hashlib.sha256(corpus).hexdigest():
                raise ValueError("SIGNED_CANDIDATE_SOURCE_MISMATCH")
            rows = []
            for bucket, descriptors in index["buckets"].items():
                for descriptor in descriptors:
                    rows.extend(reader.verified_shard(read(descriptor["path"], descriptor["bytes"]), descriptor, bucket))
            expected = json.loads(corpus)["records"]
            if index["recordCount"] != len(expected) or sorted(rows, key=lambda row: row["id"]) != sorted(expected, key=lambda row: row["id"]):
                raise ValueError("SIGNED_CANDIDATE_RECORD_PARITY_FAILED")
            if not reader.refresh_from_mirror(cache, read):
                raise ValueError("INSTALLED_READER_REJECTED_SIGNED_CANDIDATE")
            cases = check_stage_b_queries(partial(reader.lookup, cache), reader.SCHEMA)
            for damaged_raw, damaged_sig in ((index_raw + b" ", sig), (index_raw, bytes(64))):
                try:
                    reader.verified_index(damaged_raw, damaged_sig)
                except shared_records_v2.ERRORS:
                    pass
                else:
                    raise ValueError("SIGNED_CANDIDATE_TAMPER_ACCEPTED")
            other = shared_records_v3 if reader.SCHEMA == 2 else shared_records_v2
            try:
                other.verified_index(index_raw, sig)
            except shared_records_v2.ERRORS:
                pass
            else:
                raise ValueError("SIGNED_CANDIDATE_WRONG_SIGNATURE_DOMAIN_ACCEPTED")
            editions[f"v{reader.SCHEMA}"] = {
                "revision": revision, "records": len(rows), "sourceSha256": index["sourceSha256"],
                "indexSha256": hashlib.sha256(index_raw).hexdigest(), "signatureVerified": True,
                "stageBLookups": cases, "tamperRejected": True, "wrongDomainRejected": True,
            }
    environment = dict(os.environ)
    environment.pop("PYTHONPATH", None)
    result = subprocess.run([str(legacy_python.absolute()), str(ROOT / "ci/check_legacy_knowledge.py"),
                             str(site), str(ROOT / "cache/records-public.hex"), str(source),
                             "--signed-candidate", "--installed"], env=environment, check=True,
                            capture_output=True, text=True, timeout=60)
    legacy_report = json.loads(result.stdout)
    return {"schema": 1, "runtime": identity, "state": "SIGNED_CANDIDATE_NOT_YET_DEPLOYED",
            "v1": {"revision": revision, "signatureVerified": True}, "knowledge": editions,
            "legacyV2": legacy_report, "publicNetworkRequests": 0,
            "evidenceLevels": dict(sorted(Counter(row["evidenceScope"]["level"] for row in json.loads(annotated)["records"]).items()))}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--site", type=Path, required=True)
    parser.add_argument("--revision", type=int, required=True)
    parser.add_argument("--legacy-python", type=Path, required=True)
    parser.add_argument("--lock", type=Path, default=Path("ci/mcp-release.json"))
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()
    report = verify(args.site.resolve(), args.revision, args.legacy_python, args.lock)
    args.output.write_text(json.dumps(report, sort_keys=True, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(report, sort_keys=True))
