"""Run under the separately pinned 0.2.33 source to prove v2 compatibility."""
import argparse
import hashlib
import json
import tempfile
import importlib.metadata
import os
from functools import partial
from pathlib import Path

from deploom_mcp import __version__, shared_records, shared_records_v2


def check_stage_b_queries(lookup, schema):
    """Find the new advisory cards through a refreshed edition's real reader."""
    assert schema in (2, 3), schema
    cases = (
        ("prettier", "2.8.8", "3.0.0", "stageb-prettier3-async-package-managers", ("npm", "yarn", "pnpm")),
        ("zod", "3.25.76", "4.6.7", "stageb-zod4-issues-package-managers", ("npm", "yarn", "pnpm")),
        ("typescript", "5.9.2", "6.0.3", "stageb-typescript6-composite-workspace", ("npm",)),
        ("react-dom", "18.3.1", "19.3.0", "stageb-react-dom19-coupled-browser-transition", ("npm",)),
        ("react-router-dom", "6.30.3", "7.18.4", "stageb-react-router7-coupled-browser-splat", ("npm",)),
    )
    exact_queries = unsupported_queries = 0
    for package, before, after, identity, supported in cases:
        for manager in ("npm", "yarn", "pnpm"):
            query = (schema, package, before, after, manager, identity)
            hit = lookup(package, before, after, manager=manager)
            assert hit is not None and hit["ok"] is True, (query, hit)
            assert hit["snapshotSource"] == "verified-pages" and hit["snapshotSchema"] == schema, (query, hit)
            assert hit["authority"] == "ADVISORY_ONLY" and hit["recipes"] == [], (query, hit)
            selected = [row for row in hit["knowledge"] if row["id"] == identity]
            if manager not in supported:
                # Other admitted cards may legitimately match this query.
                assert hit["status"] in {"found", "no-matching-record"}, (query, hit)
                assert not selected, (query, selected)
                unsupported_queries += 1
                continue
            assert hit["status"] == "found" and len(selected) == 1, (query, hit)
            card = selected[0]
            assert card["package"] == package and card["matchStrength"] == "verified-exact-transition", (query, card)
            assert card["authority"] == "ADVISORY_ONLY" and card["requiresProjectVerification"] is True, (query, card)
            # The released reader predates testedTransition; its evidence claim
            # still carries the exact tested endpoints without executable recipes.
            claim = card["evidence"]["claim"]
            assert (claim["package"], claim["from"], claim["to"]) == (package, before, after), (query, claim)
            if schema == 3:
                scope = card["evidenceScope"]
                assert scope["level"] == "fixture-behavior", (query, scope)
                assert (scope["archiveStatus"], scope["projectStatus"]) == ("UNKNOWN", "UNKNOWN"), (query, scope)
                assert scope["conditionsRequired"] is True, (query, scope)
            exact_queries += 1
    assert (exact_queries, unsupported_queries) == (9, 6)
    return {"schema": schema, "records": len(cases), "exactQueries": exact_queries,
            "unsupportedManagerQueries": unsupported_queries}


def check_v2_queries(site, cache, *, intermediate=False, replacement_control=True):
    """Preserve the original cross-repository v2 gates for either reader."""
    raw_index = (site / "index.json").read_bytes()
    signature = (site / "index.sig").read_bytes()
    index = shared_records_v2.verified_index(raw_index, signature)
    resources = {shared_records_v2.BASE + "index.json": raw_index,
                 shared_records_v2.BASE + "index.sig": signature}
    for descriptors in index["buckets"].values():
        for desc in descriptors:
            resources[shared_records_v2.BASE + desc["path"]] = (site / desc["path"]).read_bytes()
    requests = []
    def fetch(url, limit, etag=None):
        assert url in resources, "Unexpected outbound URL: " + url
        requests.append(url)
        raw = resources[url]
        assert len(raw) <= limit
        return raw, None
    assert shared_records_v2.refresh(cache, fetch=fetch)
    hit = shared_records.lookup(cache, "react-dom", "18.2.0", "18.3.1")
    assert hit["snapshotSource"] == "verified-pages", hit
    assert hit["snapshotSchema"] == 2 and hit["status"] == "found", hit
    assert hit["recipes"] == [], hit
    assert any(row["id"] == "align-react-renderers" and row["kind"] == "incompatibility"
               and row["matchStrength"] == "verified-exact-transition" for row in hit["knowledge"]), hit
    trial = shared_records.lookup(cache, "react-dom", "18.1.0", "18.3.2")
    assert any(row["id"] == "align-react-renderers" and row["matchStrength"] == "major-line-candidate"
               and row["requiresProjectVerification"] is True for row in trial["knowledge"]), trial
    outside = shared_records.lookup(cache, "react-dom", "17.0.0", "18.3.1")
    assert outside["snapshotSource"] == "verified-pages", outside
    assert outside["status"] in {"found", "no-matching-record"}, outside
    if intermediate:
        # The reviewed new matcher composes distinct crossed transitions. Its
        # target-boundary guard must still exclude guidance not yet reached.
        assert any(row["id"] == "align-react-renderers"
                   and row["matchStrength"] == "intermediate-transition-candidate"
                   and row["requiresProjectVerification"] is True for row in outside["knowledge"]), outside
        outside = shared_records.lookup(cache, "react-dom", "17.0.0", "18.3.0")
    assert all(row["id"] != "align-react-renderers" for row in outside["knowledge"]), outside
    assert len(requests) == 2 + sum(map(len, index["buckets"].values()))
    stage_b = check_stage_b_queries(partial(shared_records_v2.lookup, cache), 2)
    if not replacement_control:
        return stage_b
    # Both files are produced with the same test key by the real v2 signer.
    resources[shared_records_v2.BASE + "index.json"] = (site / "equal-revision.json").read_bytes()
    resources[shared_records_v2.BASE + "index.sig"] = (site / "equal-revision.sig").read_bytes()
    replacement = shared_records_v2.verified_index(resources[shared_records_v2.BASE + "index.json"],
                                                  resources[shared_records_v2.BASE + "index.sig"])
    assert replacement["revision"] == index["revision"] and replacement != index
    assert not shared_records_v2.refresh(cache, fetch=fetch)
    assert shared_records.lookup(cache, "react-dom", "18.2.0", "18.3.1")["status"] == "found"
    return stage_b


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    parser.add_argument("pin", type=Path)
    parser.add_argument("corpus", type=Path)
    parser.add_argument("--signed-candidate", action="store_true",
                        help="Read actual signed deployment bytes; replacement negatives run in full parity separately")
    parser.add_argument("--installed", action="store_true")
    args = parser.parse_args()
    assert __version__ == "0.2.33", __version__
    if args.installed:
        import deploom_mcp
        assert not os.environ.get("PYTHONPATH"), "Legacy installed gate forbids source PYTHONPATH"
        dist = importlib.metadata.distribution("deploom-mcp")
        root = Path(deploom_mcp.__file__).resolve().parent
        assert root == Path(dist.locate_file("deploom_mcp")).resolve()
        assert root.parent.name in {"site-packages", "dist-packages"} and dist.version == "0.2.33"
        direct = json.loads(dist.read_text("direct_url.json"))
        from installed_release_guard import verify_direct_url
        verify_direct_url(direct, {
            "url": "https://github.com/levencode-labs/deploom-mcp/releases/download/v0.2.33/deploom_mcp-0.2.33-py3-none-any.whl",
            "sha256": "6b500635388342d959b4013947dec99a4fbfaaea53e75aa27f9bbf6ef1404167",
        })
    shared_records_v2.public_key_file = args.pin
    expected = json.loads(args.corpus.read_bytes())["records"]
    site = args.site / "v2"
    index = shared_records_v2.verified_index((site / "index.json").read_bytes(), (site / "index.sig").read_bytes())
    assert index["sourceSha256"] == hashlib.sha256(args.corpus.read_bytes()).hexdigest()
    actual = []
    for bucket, descriptors in index["buckets"].items():
        for desc in descriptors:
            actual.extend(shared_records_v2.verified_shard((site / desc["path"]).read_bytes(), desc, bucket))
    assert sorted(actual, key=lambda row: row["id"]) == sorted(expected, key=lambda row: row["id"])
    assert not any("evidenceScope" in row for row in actual)
    with tempfile.TemporaryDirectory() as cache:
        stage_b = check_v2_queries(site, Path(cache), replacement_control=not args.signed_candidate)
    try:
        shared_records_v2.verified_index((args.site / "v3/index.json").read_bytes(),
                                         (args.site / "v3/index.sig").read_bytes())
    except shared_records_v2.ERRORS:
        pass
    else:
        raise AssertionError("Legacy v2 reader accepted a v3 signature domain")
    print(json.dumps({"legacyConsumer": __version__, "schema": 2, "records": len(actual),
                      "exactRecordParity": True, "crossDomainRejected": True,
                      "lookupSemantics": True,
                      "equalRevisionRejected": "covered-by-separate-full-parity" if args.signed_candidate else True,
                      "installedLegacyWheel": args.installed,
                      "stageBLookups": stage_b}, sort_keys=True))


if __name__ == "__main__":
    main()
