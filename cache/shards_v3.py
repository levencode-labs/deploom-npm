"""Publish reviewed scoped v3 alongside an unchanged legacy v2 representation."""
import argparse
import json
from collections import Counter
from pathlib import Path

from evidence_scopes import annotate_corpus
from shards_v2 import write_shards


def write_editions(raw, ledger_raw, destination, *, revision, trusted_commit):
    scoped = annotate_corpus(raw, ledger_raw, trusted_commit=trusted_commit)
    destination = Path(destination)
    legacy = write_shards(raw, destination / "v2", revision=revision, trusted_commit=trusted_commit)
    current = write_shards(scoped, destination / "v3", revision=revision, trusted_commit=trusted_commit,
                           edition_schema=3)
    levels = Counter(row["evidenceScope"]["level"] for row in json.loads(scoped)["records"])
    return {"v2": legacy, "v3": current, "evidenceLevels": dict(sorted(levels.items()))}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("legacy_corpus", type=Path)
    parser.add_argument("reviewed_scopes", type=Path)
    parser.add_argument("destination", type=Path)
    parser.add_argument("--revision", type=int, required=True)
    parser.add_argument("--trusted-commit", required=True)
    args = parser.parse_args()
    result = write_editions(args.legacy_corpus.read_bytes(), args.reviewed_scopes.read_bytes(),
                            args.destination, revision=args.revision, trusted_commit=args.trusted_commit)
    print(json.dumps({"revision": args.revision, "records": result["v3"]["recordCount"],
                      "v2SourceSha256": result["v2"]["sourceSha256"],
                      "v3SourceSha256": result["v3"]["sourceSha256"],
                      "evidenceLevels": result["evidenceLevels"]}, sort_keys=True))


if __name__ == "__main__":
    main()
