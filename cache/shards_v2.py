"""Deterministically partition the trusted v2-native migration-knowledge corpus.

The source is repository-maintained, immutable first-party fixture evidence.
No user contributions or LLM-generated records enter the signed publisher.
"""
import argparse
import hashlib
import json
import re
import subprocess
from collections import defaultdict
from pathlib import Path

from deploom_mcp.knowledge_contract_v2 import MAX_CORPUS_BYTES, SOURCE, validate_corpus

MAX_SHARD = 256_000
MAX_MANIFEST = 2_000_000
MAX_TOTAL = 32_000_000


def encode(obj):
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def git(*args):
    return subprocess.check_output(["git", *args], timeout=60)


def trusted_fixture(record, trusted_commit):
    """Verify source/receipt from a pinned ancestor of trusted main, never PR files."""
    source = record["evidence"]["source"]
    match = SOURCE.fullmatch(source)
    if not match or not re.fullmatch(r"[a-f0-9]{40}", trusted_commit):
        raise ValueError("Invalid immutable fixture identity")
    commit, path = match.groups()
    subprocess.run(["git", "merge-base", "--is-ancestor", commit, trusted_commit],
                   stdout=subprocess.DEVNULL, check=True, timeout=30)
    raw = git("show", f"{commit}:{path}")
    actual_sha = hashlib.sha256(raw).hexdigest()
    if actual_sha != record["evidence"]["fixtureSha256"] or len(raw) > 16_000:
        raise ValueError("Fixture identity differs from recorded SHA256")
    receipt_path = path.removesuffix("check.cjs") + "evidence.json"
    receipt_raw = git("show", f"{commit}:{receipt_path}")
    if len(receipt_raw) > 64_000:
        raise ValueError("Oversized evidence receipt")
    receipt = json.loads(receipt_raw)
    if (not isinstance(receipt, dict) or set(receipt) != {"fixtureSha256", "claims"}
            or receipt["fixtureSha256"] != actual_sha
            or record["evidence"]["claim"] not in receipt["claims"]):
        raise ValueError("No independently reviewed matching source-exact fixture claim")
    text = raw.decode("utf-8")
    claim = record["evidence"]["claim"]
    for expected in (claim["package"], claim["from"], claim["to"],
                     *(item["fixtureAssertion"] for item in record["negativeControls"])):
        if expected not in text:
            raise ValueError("Missing negative control or version claim in pinned fixture")
    return True


def write_shards(raw, destination, *, revision, trusted_commit=None, max_shard_bytes=MAX_SHARD):
    if type(revision) is not int or not 25 <= revision < 2**53:
        raise ValueError("Invalid signed edition revision")
    if not 512 <= max_shard_bytes <= MAX_SHARD:
        raise ValueError("Invalid shard size budget")
    data = validate_corpus(raw)
    if trusted_commit is not None:
        for row in data["records"]:
            trusted_fixture(row, trusted_commit)
    grouped = defaultdict(list)
    for record in data["records"]:
        bucket = hashlib.sha256(record["package"].encode("ascii")).hexdigest()[:2]
        grouped[bucket].append(record)
    manifest = {"schema": 2, "revision": revision, "sourceSha256": hashlib.sha256(raw).hexdigest(),
                "recordCount": len(data["records"]), "buckets": {}}
    blobs = {}
    for bucket in sorted(grouped):
        records = sorted(grouped[bucket], key=lambda r: encode(r))
        pieces, current = [], []
        for record in records:
            item = current + [record]
            if len(encode({"schema": 2, "records": item})) > max_shard_bytes:
                if not current:
                    raise ValueError("One record exceeds the per-shard limit")
                pieces.append(current)
                current = [record]
                if len(encode({"schema": 2, "records": current})) > max_shard_bytes:
                    raise ValueError("One record exceeds the per-shard limit")
            else:
                current = item
        if current:
            pieces.append(current)
        descriptors = []
        for rows in pieces:
            blob = encode({"schema": 2, "records": rows})
            sha = hashlib.sha256(blob).hexdigest()
            rel = f"shards/{bucket}/{sha}.json"
            blobs[rel] = blob
            descriptors.append({"path": rel, "sha256": sha, "bytes": len(blob), "records": len(rows)})
        manifest["buckets"][bucket] = descriptors
    raw_manifest = encode(manifest)
    if len(raw_manifest) > MAX_MANIFEST or sum(len(x) for x in blobs.values()) > MAX_TOTAL:
        raise ValueError("Edition exceeds bounded index or download budget")
    destination = Path(destination)
    for rel, blob in blobs.items():
        file = destination / rel
        file.parent.mkdir(parents=True, exist_ok=True)
        file.write_bytes(blob)
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "index.json").write_bytes(raw_manifest)
    return manifest


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("trusted_v2_corpus", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--revision", type=int, required=True)
    parser.add_argument("--trusted-commit", required=True)
    args = parser.parse_args()
    manifest = write_shards(args.trusted_v2_corpus.read_bytes(), args.destination,
                            revision=args.revision, trusted_commit=args.trusted_commit)
    print(json.dumps({"revision": manifest["revision"], "records": manifest["recordCount"],
                      "shards": sum(map(len, manifest["buckets"].values()))}, sort_keys=True))


if __name__ == "__main__":
    main()
