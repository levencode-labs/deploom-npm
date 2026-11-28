"""Run under the separately pinned 0.2.33 source to prove v2 compatibility."""
import argparse
import hashlib
import json
import tempfile
from pathlib import Path

from deploom_mcp import __version__, shared_records, shared_records_v2


def check_v2_queries(site, cache, *, intermediate=False):
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
    # Both files are produced with the same test key by the real v2 signer.
    resources[shared_records_v2.BASE + "index.json"] = (site / "equal-revision.json").read_bytes()
    resources[shared_records_v2.BASE + "index.sig"] = (site / "equal-revision.sig").read_bytes()
    replacement = shared_records_v2.verified_index(resources[shared_records_v2.BASE + "index.json"],
                                                  resources[shared_records_v2.BASE + "index.sig"])
    assert replacement["revision"] == index["revision"] and replacement != index
    assert not shared_records_v2.refresh(cache, fetch=fetch)
    assert shared_records.lookup(cache, "react-dom", "18.2.0", "18.3.1")["status"] == "found"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("site", type=Path)
    parser.add_argument("pin", type=Path)
    parser.add_argument("corpus", type=Path)
    args = parser.parse_args()
    assert __version__ == "0.2.33", __version__
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
        check_v2_queries(site, Path(cache))
    try:
        shared_records_v2.verified_index((args.site / "v3/index.json").read_bytes(),
                                         (args.site / "v3/index.sig").read_bytes())
    except shared_records_v2.ERRORS:
        pass
    else:
        raise AssertionError("Legacy v2 reader accepted a v3 signature domain")
    print(json.dumps({"legacyConsumer": __version__, "schema": 2, "records": len(actual),
                      "exactRecordParity": True, "crossDomainRejected": True,
                      "lookupSemantics": True, "equalRevisionRejected": True}, sort_keys=True))


if __name__ == "__main__":
    main()
