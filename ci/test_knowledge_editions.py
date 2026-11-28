"""Offline corpus -> production signers -> old v2 and new v3 readers.

The retained source/receipt/input checks are real. Only the pre-existing live npm
identity probe is replaced: publication retains that gate, this parity test does
not repeat thousands of registry requests for already admitted records.
"""
import argparse
import base64
import copy
import hashlib
import json
import os
import subprocess
import tempfile
from collections import Counter
from pathlib import Path
from unittest.mock import patch

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from deploom_mcp import shared_records_v2, shared_records_v3
from evidence_scopes import annotate_corpus, canonical
from shards_v2 import write_shards
from shards_v3 import write_editions
from check_legacy_knowledge import check_v2_queries

ROOT = Path(__file__).resolve().parents[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--legacy-consumer", type=Path, required=True)
    args = parser.parse_args()
    corpus_file = ROOT / "knowledge/v2/records.json"
    corpus = corpus_file.read_bytes()
    ledger = (ROOT / "knowledge/v3/evidence-scopes.json").read_bytes()
    trusted = subprocess.check_output(["git", "rev-parse", "--verify", "refs/remotes/origin/main"],
                                      text=True).strip()
    subprocess.run(["git", "merge-base", "--is-ancestor", trusted, "HEAD"], check=True, timeout=30)
    rows = json.loads(corpus)["records"]
    identities = {(row["package"], item[version]) for row in rows for item in row["verifiedTransitions"]
                  for version in ("from", "to")}
    def retained_identity(package, version):
        assert (package, version) in identities, "Unadmitted identity reached the offline parity test"
        return True
    with tempfile.TemporaryDirectory() as tmp:
        scratch = Path(tmp)
        site = scratch / "site"
        with patch("shards_v2.public_version", side_effect=retained_identity) as metadata:
            result = write_editions(corpus, ledger, site, revision=42, trusted_commit=trusted)
        assert metadata.call_count == len(rows) * 4  # Both exact endpoints in both editions.
        assert result["v2"]["recordCount"] == result["v3"]["recordCount"] == len(rows)
        assert result["v2"]["sourceSha256"] == hashlib.sha256(corpus).hexdigest()
        scoped = annotate_corpus(corpus, ledger, trusted_commit=trusted)
        assert result["v3"]["sourceSha256"] == hashlib.sha256(scoped).hexdigest()
        enriched = json.loads(scoped)["records"]
        for row in enriched:
            scope = row["evidenceScope"]
            assert scope["level"] != "UNKNOWN"
            assert (scope["archiveStatus"], scope["projectStatus"]) == ("UNKNOWN", "UNKNOWN")
            assert scope["conditionsRequired"] is True
            if "/npm-github-transitions-batch-" in row["evidence"]["source"]:
                assert scope["level"] == "source-pinned-metadata", row["id"]
        for raw, schema in ((scoped, 2), (corpus, 3)):
            try:
                write_shards(raw, scratch / "invalid", revision=42, edition_schema=schema)
            except ValueError:
                pass
            else:
                raise AssertionError("Evidence scopes leaked across edition schemas")

        key = Ed25519PrivateKey.generate()
        pkcs8 = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
                                  serialization.NoEncryption())
        pin = scratch / "publisher.hex"
        pin.write_text(key.public_key().public_bytes(serialization.Encoding.Raw,
                                                    serialization.PublicFormat.Raw).hex())
        env = dict(os.environ, DEPLOOM_RECORDS_SIGNING_KEY=base64.b64encode(pkcs8).decode())
        for version in (2, 3):
            folder = site / f"v{version}"
            subprocess.run(["node", str(ROOT / f"cache/sign-shards-v{version}.cjs"),
                            str(folder / "index.json"), str(folder / "index.sig"), str(pin)],
                           env=env, check=True, timeout=30)
        replacement = copy.deepcopy(result["v2"])
        replacement["sourceSha256"] = "e" * 64
        (site / "v2/equal-revision.json").write_bytes(canonical(replacement))
        subprocess.run(["node", str(ROOT / "cache/sign-shards-v2.cjs"),
                        str(site / "v2/equal-revision.json"), str(site / "v2/equal-revision.sig"), str(pin)],
                       env=env, check=True, timeout=30)

        # The old interpreter process imports only the released strict v2 source.
        old_env = dict(os.environ, PYTHONPATH=str(args.legacy_consumer.resolve() / "src"))
        subprocess.run([os.sys.executable, str(ROOT / "ci/check_legacy_knowledge.py"), str(site),
                        str(pin), str(corpus_file)], env=old_env, check=True, timeout=60)

        original_pin = shared_records_v2.public_key_file
        shared_records_v2.public_key_file = pin
        try:
            check_v2_queries(site / "v2", scratch / "current-v2-only-client", intermediate=True)
            current = site / "v3"
            def read(path, limit):
                raw = (current / path).read_bytes()
                assert len(raw) <= limit
                return raw
            cache = scratch / "current-client"
            assert shared_records_v3.refresh_from_mirror(cache, read)
            index = shared_records_v3.verified_index(read("index.json", 2_000_000), read("index.sig", 64))
            all_rows = []
            for bucket, descriptors in index["buckets"].items():
                for desc in descriptors:
                    all_rows.extend(shared_records_v3.verified_shard(read(desc["path"], desc["bytes"]), desc, bucket))
            assert sorted(all_rows, key=lambda row: row["id"]) == sorted(enriched, key=lambda row: row["id"])
            for package, before, after, expected_id, level in (
                ("minimatch", "3.0.0", "7.0.0", "github-b001-minimatch-3.0.0-7.0.0", "source-pinned-metadata"),
                ("typescript", "5.9.2", "6.0.3", "typescript6-baseurl-alias", "typecheck"),
                ("react-markdown", "9.0.3", "10.0.0", "react-markdown10-classname-wrapper", "fixture-behavior"),
            ):
                hit = shared_records_v3.lookup(cache, package, before, after)
                assert hit["snapshotSchema"] == 3 and hit["status"] == "found", hit
                assert any(row["id"] == expected_id and row["evidenceScope"]["level"] == level
                           for row in hit["knowledge"]), hit

            # A valid v3 signature still cannot authorize unscoped legacy rows.
            damaged = copy.deepcopy(enriched)
            del damaged[0]["evidenceScope"]
            # Construct the malformed wire bytes directly; the normal producer
            # correctly rejects them before it creates any edition.
            bad = copy.deepcopy(index)
            bucket = hashlib.sha256(damaged[0]["package"].encode()).hexdigest()[:2]
            descriptor = next(desc for desc in bad["buckets"][bucket]
                              if any(row["id"] == damaged[0]["id"] for row in
                                     json.loads((current / desc["path"]).read_bytes())["records"]))
            payload = json.loads((current / descriptor["path"]).read_bytes())
            for row in payload["records"]:
                if row["id"] == damaged[0]["id"]:
                    del row["evidenceScope"]
            raw_payload = canonical(payload)
            digest = hashlib.sha256(raw_payload).hexdigest()
            descriptor.update(path=f"shards/{bucket}/{digest}.json", sha256=digest, bytes=len(raw_payload))
            bad["revision"] += 1
            raw_index = canonical(bad)
            replacements = {"index.json": raw_index,
                            "index.sig": key.sign(shared_records_v3.DOMAIN + hashlib.sha256(raw_index).digest()),
                            descriptor["path"]: raw_payload}
            def corrupted(path, limit):
                return replacements[path] if path in replacements else read(path, limit)
            assert not shared_records_v3.refresh_from_mirror(cache, corrupted)
            assert shared_records_v3.lookup(cache, "react-dom", "18.2.0", "18.3.1")["status"] == "found"
        finally:
            shared_records_v2.public_key_file = original_pin
    print(json.dumps({"records": len(rows), "evidenceLevels": dict(Counter(
        row["evidenceScope"]["level"] for row in enriched)), "sourceSha256": result["v3"]["sourceSha256"],
        "legacyV2": "PASS", "scopedV3": "PASS", "signedMissingScope": "REJECTED",
        "v2LookupSemantics": "PASS", "equalRevisionReplacement": "REJECTED",
        "registryRequests": 0}, sort_keys=True))


if __name__ == "__main__":
    main()
