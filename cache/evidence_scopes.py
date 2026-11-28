"""Attach reviewed evidence levels to exact records and retained Git inputs.

This is an offline verifier, not a classifier. Levels are explicit review data;
test names, card titles and a successful module import never infer a level.
Archive bytes and recipient project outcomes remain UNKNOWN in this edition.
"""
import hashlib
import json
import re
import subprocess
from pathlib import PurePosixPath

from deploom_mcp.knowledge_contract_v2 import EVIDENCE_LEVELS, SOURCE, validate_corpus

MAX_LEDGER_BYTES = 8_000_000
MAX_INPUT_BYTES = 2_000_000
MAX_SOURCE_BYTES = 64_000_000
COMMIT = re.compile(r"[a-f0-9]{40}\Z")
ROOT = re.compile(r"fixtures/[a-z0-9_-]{1,64}\Z")


def canonical(value):
    return (json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True) + "\n").encode("ascii")


def record_digest(record):
    return hashlib.sha256(canonical(record)).hexdigest()


def _expect(condition, reason):
    if not condition:
        raise ValueError("Invalid reviewed evidence scopes: " + reason)


def _fields(value, names):
    _expect(isinstance(value, dict) and set(value) == set(names), "unexpected or missing fields")


def _parse(raw):
    _expect(isinstance(raw, bytes) and 0 < len(raw) <= MAX_LEDGER_BYTES, "ledger byte bound")
    def unique(pairs):
        result = dict(pairs)
        _expect(len(result) == len(pairs), "duplicate JSON key")
        return result
    return json.loads(raw.decode("utf-8"), object_pairs_hook=unique)


def _git(*args, input=None):
    return subprocess.check_output(["git", *args], input=input, timeout=60)


def _input_snapshot(commit, roots):
    _expect(isinstance(commit, str) and COMMIT.fullmatch(commit), "exact input commit")
    _expect(isinstance(roots, list) and 1 <= len(roots) <= 4
            and all(isinstance(root, str) and ROOT.fullmatch(root) for root in roots)
            and roots == sorted(set(roots)), "canonical fixture input roots")
    entries = _git("ls-tree", "-rz", "--long", commit, "--", *roots).split(b"\0")
    objects = []
    total = 0
    for entry in entries:
        if not entry:
            continue
        header, name = entry.split(b"\t", 1)
        mode, kind, oid, size = header.split()
        path = name.decode("utf-8")
        count = int(size)
        _expect(mode in {b"100644", b"100755"} and kind == b"blob", "regular retained input")
        _expect(0 <= count <= MAX_INPUT_BYTES and not any(ord(c) < 32 for c in path)
                and ".." not in PurePosixPath(path).parts
                and any(path.startswith(root + "/") for root in roots), "retained input path or size")
        objects.append((path, oid.decode("ascii"), count))
        total += count
    _expect(objects and len(objects) <= 4096 and total <= MAX_SOURCE_BYTES, "retained source input bound")
    _expect(all(any(path.startswith(root + "/") for path, _, _ in objects) for root in roots),
            "missing retained input root")
    # One bounded Git process per source also retains helper/facts/lock bytes;
    # checking only check.cjs would miss the inputs used by mixed fixtures.
    stream = _git("cat-file", "--batch", input=("\n".join(oid for _, oid, _ in objects) + "\n").encode())
    offset, manifest, payloads = 0, [], {}
    for path, expected_oid, expected_size in objects:
        end = stream.index(b"\n", offset)
        oid, kind, size = stream[offset:end].split()
        size = int(size)
        _expect(oid.decode() == expected_oid and kind == b"blob" and size == expected_size,
                "retained Git object identity")
        content = stream[end + 1:end + 1 + size]
        _expect(stream[end + 1 + size:end + 2 + size] == b"\n", "retained Git object boundary")
        offset = end + 2 + size
        manifest.append({"path": path, "bytes": size, "sha256": hashlib.sha256(content).hexdigest()})
        payloads[path] = content
    _expect(offset == len(stream), "unexpected retained Git bytes")
    return sorted(manifest, key=lambda item: item["path"]), payloads


def input_manifest(commit, roots):
    """Reproduce the manifest when preparing a separate, explicit source review."""
    return _input_snapshot(commit, roots)[0]


def annotate_corpus(raw, ledger_raw, *, trusted_commit):
    _expect(isinstance(trusted_commit, str) and COMMIT.fullmatch(trusted_commit), "trusted main commit")
    data = validate_corpus(raw)
    _expect(all("evidenceScope" not in row for row in data["records"]), "legacy corpus must remain unannotated")
    records = {row["id"]: row for row in data["records"]}
    ledger = _parse(ledger_raw)
    _fields(ledger, {"schema", "sources"})
    _expect(type(ledger["schema"]) is int and ledger["schema"] == 1, "ledger schema")
    sources = ledger["sources"]
    _expect(isinstance(sources, list) and 1 <= len(sources) <= 2048, "source count")
    annotated, seen_sources = {}, set()
    for entry in sources:
        _fields(entry, {"source", "fixtureSha256", "inputRoots", "inputs", "records"})
        source = entry["source"]
        match = SOURCE.fullmatch(source) if isinstance(source, str) else None
        _expect(match is not None and source not in seen_sources, "immutable unique source")
        seen_sources.add(source)
        commit, check_path = match.groups()
        subprocess.run(["git", "merge-base", "--is-ancestor", commit, trusted_commit],
                       stdout=subprocess.DEVNULL, check=True, timeout=30)
        inputs, payloads = _input_snapshot(commit, entry["inputRoots"])
        _expect(str(PurePosixPath(check_path).parent) in entry["inputRoots"], "source root not retained")
        _expect(inputs == entry["inputs"], "retained input manifest differs from Git")
        fixture_sha = hashlib.sha256(payloads[check_path]).hexdigest()
        _expect(fixture_sha == entry["fixtureSha256"], "fixture digest differs from Git")
        decisions = entry["records"]
        _expect(isinstance(decisions, list) and 1 <= len(decisions) <= 50_000, "review decision count")
        for decision in decisions:
            _fields(decision, {"id", "recordSha256", "level", "basis"})
            identity = decision["id"]
            _expect(isinstance(identity, str) and identity in records and identity not in annotated,
                    "missing, duplicate or unknown reviewed record")
            row = records[identity]
            _expect(row["evidence"]["source"] == source and row["evidence"]["fixtureSha256"] == fixture_sha,
                    "record points to another reviewed fixture")
            _expect(record_digest(row) == decision["recordSha256"], "reviewed record content changed")
            _expect(isinstance(decision["level"], str) and decision["level"] in EVIDENCE_LEVELS,
                    "unreviewed evidence level")
            basis = decision["basis"]
            _fields(basis, {"path", "contains"})
            _expect(isinstance(basis["path"], str) and basis["path"] in payloads
                    and isinstance(basis["contains"], str) and 1 <= len(basis["contains"]) <= 300
                    and basis["contains"].encode("utf-8") in payloads[basis["path"]], "review anchor absent from input")
            retained = {"schema": 1, "source": source, "fixtureSha256": fixture_sha,
                        "inputs": inputs, "review": decision}
            annotated[identity] = dict(row, evidenceScope={
                "schema": 1, "level": decision["level"],
                "retainedInputSha256": hashlib.sha256(canonical(retained)).hexdigest(),
                "archiveStatus": "UNKNOWN", "archiveReason": "MISSING_ARCHIVE_EVIDENCE",
                "projectStatus": "UNKNOWN", "conditionsRequired": True,
            })
    _expect(set(annotated) == set(records), "records missing an explicit evidence review")
    result = canonical({"schema": 2, "records": [annotated[row["id"]] for row in data["records"]]})
    validate_corpus(result)
    return result
