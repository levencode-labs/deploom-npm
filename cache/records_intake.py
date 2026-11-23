"""Trusted main-only source-exact verification for the frozen v1 fallback.

There is deliberately no contributor intake, pull-request admission, LLM
reviewer, mutation command, or data-only auto-merge path.
"""
import argparse
import hashlib
import json
import re
import subprocess
from functools import lru_cache
from pathlib import Path
from urllib.request import HTTPRedirectHandler, build_opener

from deploom_mcp.record_contract import KINDS, LIMIT, SOURCE, parse, validate

FILES = {f"docs/v1/{kind}.json": kind for kind in KINDS}


def git(*args):
    return subprocess.check_output(["git", *args], timeout=60)


def blob(commit, name, limit):
    entry = git("ls-tree", "-z", commit, "--", name)
    if not re.fullmatch(rb"100644 blob [0-9a-f]{40}\t" + re.escape(name.encode()) + rb"\x00", entry):
        raise ValueError("Expected regular source-exact Git blob")
    oid = entry.split(b" ", 2)[2].split(b"\t")[0].decode()
    if int(git("cat-file", "-s", oid)) > limit:
        raise ValueError("Public fallback blob exceeds bound")
    return git("cat-file", "blob", oid)


class RegistryOnly(HTTPRedirectHandler):
    def redirect_request(self, *args):
        raise ValueError("Unexpected npm redirect")


@lru_cache(maxsize=512)
def npm_version(package, version):
    with build_opener(RegistryOnly()).open(
            f"https://registry.npmjs.org/{package}/{version}", timeout=15) as response:
        metadata = parse(response.read(LIMIT + 1))
    if metadata.get("name") != package or metadata.get("version") != version:
        raise ValueError("Public registry did not confirm the exact package version")


@lru_cache(maxsize=256)
def evidence(base, source):
    revision, name = re.fullmatch(SOURCE, source).groups()
    subprocess.run(["git", "merge-base", "--is-ancestor", revision, base], check=True, timeout=20)
    return blob(revision, name, 12_000).decode("utf-8")


def verify_rows(base, rows):
    for row in rows:
        text = evidence(base, row["source"])
        for version in (row["from"], row["to"]):
            npm_version(row["package"], version)
            if version not in text:
                raise ValueError("Expected package version is absent from pinned fixture")
        if row["package"] not in text:
            raise ValueError("Package absent from source-exact fixture")
        _, name = re.fullmatch(SOURCE, row["source"]).groups()
        receipt = parse(blob(base, name.removesuffix("check.cjs") + "evidence.json", 64_000))
        digest = hashlib.sha256(text.encode("utf-8")).hexdigest()
        claim = {k: v for k, v in row.items() if k not in {"schema", "source"}}
        if receipt.get("fixtureSha256") != digest or claim not in receipt.get("claims", []):
            raise ValueError("No matching reviewed fixture claim")


def snapshot(base):
    if not re.fullmatch(r"[a-f0-9]{40}", base):
        raise ValueError("Missing exact trusted main commit")
    raw = {"schema": 1, "revision": int(git("rev-list", "--first-parent", "--count", base))}
    for path, kind in FILES.items():
        raw[kind] = validate(kind, parse(blob(base, path, LIMIT)))
        verify_rows(base, raw[kind])
    output = (json.dumps(raw, sort_keys=True, separators=(",", ":")) + "\n").encode()
    if len(output) > LIMIT:
        raise ValueError("Legacy fallback exceeds limit")
    return output


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("main_sha", help="Exact trusted main revision, never a contributor head")
    parser.add_argument("destination", type=Path)
    args = parser.parse_args()
    args.destination.write_bytes(snapshot(args.main_sha))


if __name__ == "__main__":
    main()
