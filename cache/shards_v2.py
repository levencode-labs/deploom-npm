"""Deterministic, content-addressed v2 shards from reviewed v1 records.

This is a *publication format*, not a new admission route: the input must be
the validated v1 snapshot emitted by records_intake.py from trusted main.
"""
import argparse
import hashlib
import json
import re
from collections import defaultdict
from pathlib import Path

from deploom_mcp.record_contract import KINDS, LIMIT, parse, validate

MAX_SHARD = 256_000
MAX_MANIFEST = LIMIT
HEX = re.compile(r"[a-f0-9]{64}\Z")


def encode(obj):
    return (json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def check_input(raw):
    data = parse(raw)
    if (not isinstance(data, dict) or set(data) != {"schema", "revision", *KINDS}
            or type(data["schema"]) is not int or data["schema"] != 1
            or type(data["revision"]) is not int or not 25 <= data["revision"] < 2 ** 53):
        raise ValueError("Expected a validated v1 snapshot")
    records = []
    for kind in KINDS:
        for row in validate(kind, data[kind]):
            records.append({"kind": kind, "record": row})
    return data["revision"], records


def write_shards(raw, destination, *, max_shard_bytes=MAX_SHARD):
    if not 512 <= max_shard_bytes <= 1_000_000:
        raise ValueError("Invalid shard limit")
    revision, records = check_input(raw)
    destination = Path(destination)
    grouped = defaultdict(list)
    for item in records:
        package = item["record"]["package"]
        bucket = hashlib.sha256(package.encode("ascii")).hexdigest()[:2]
        grouped[bucket].append(item)
    index = {"schema": 2, "revision": revision, "sourceSha256": hashlib.sha256(raw).hexdigest(),
             "recordCount": len(records), "buckets": {}}
    pending = {}
    for bucket in sorted(grouped):
        rows = sorted(grouped[bucket], key=lambda v: encode(v))
        pieces, current = [], []
        for row in rows:
            trial = current + [row]
            blob = encode({"schema": 2, "records": trial})
            if len(blob) > max_shard_bytes:
                if not current:
                    raise ValueError("Single record exceeds shard budget")
                pieces.append(current)
                current = [row]
                if len(encode({"schema": 2, "records": current})) > max_shard_bytes:
                    raise ValueError("Single record exceeds shard budget")
            else:
                current = trial
        if current:
            pieces.append(current)
        descriptors = []
        for piece in pieces:
            blob = encode({"schema": 2, "records": piece})
            sha = hashlib.sha256(blob).hexdigest()
            path = f"shards/{bucket}/{sha}.json"
            pending[path] = blob
            descriptors.append({"path": path, "sha256": sha, "bytes": len(blob), "records": len(piece)})
        index["buckets"][bucket] = descriptors
    manifest = encode(index)
    if len(manifest) > MAX_MANIFEST:
        raise ValueError("Index exceeds v2 size budget")
    # Only write after all size and schema checks have passed.
    for name, blob in pending.items():
        path = destination / name
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(blob)
    destination.mkdir(parents=True, exist_ok=True)
    (destination / "index.json").write_bytes(manifest)
    return index


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("reviewed_v1_snapshot", type=Path)
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    print(json.dumps(write_shards(args.reviewed_v1_snapshot.read_bytes(), args.destination),
                     sort_keys=True))


if __name__ == "__main__":
    main()
