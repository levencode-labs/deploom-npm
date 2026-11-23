#!/usr/bin/env python3
"""Offline audit of independently pinned first-run GitHub artifact receipts; NO HTTP."""
import argparse
import io
import zipfile
import urllib.parse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUN = 45227862705
EXPECTED = [
    (14846445337, "e64e27b63a4905718008c5fb6f74b930b21e1f7b80f8bd70797fa1361468a2a7", "eb300faceb5aef3dffe4d426627f6ecd53d38d3141949ff6d226d59986b2abd4"),
    (14846465420, "185602c120af450c06c66356acc37ca518e138e54e164d802efafeee0808e2ad", "46f694473a04b7b4a382c5b4c55eab1b66d411882c81aba9ef3256e31c4e709f"),
    (14847210273, "5d608c534b657b8799e469ad4fe5e7da55b140f5da653bd18a5659e72f399773", "2aa7cd2785bf42d316ba169d6885346f249684a04b2ff1150e27ddbe34a4cdd2"),
    (14847095317, "5ad7d2fa9eb0973f777709357ef0da8167b5f53a9c48682531b3a9d9168080d8", "563e3b0ae256f540b135e9e250e0e9f879322c1cf0840ca645d65b7b69f6c6ef"),
    (14846540610, "ca8ed771ec30637acb111aa3c2590245c0e02e08f84a695e5650bf9015348367", "6ea465251c4a605b3a40ee7178ba93f1fc8009aa079e3c68a6d4196579a8de74"),
]
DATASET = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
IDENTITY_SHA256 = "b2a80b39177d99230e1216c625879cbe7d11e571edecd5bdf50db1e2bd01ce64"
IDENTITY_BLOB_SHA1 = "00c30c20714e53589dca5b89f6abc06f2147fd3a"

def require(ok, why):
    if not ok:
        raise ValueError(why)

def validate(ledger=None, index=None, *, part=None):
    if ledger is None:
        ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema") == "deploom.research.npm-ranks-3501-4000-coverage.v1", "Schema")
    require(ledger.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION", "Authority")
    raw_index = (ROOT / "index.json").read_bytes()
    git_blob = b"blob " + str(len(raw_index)).encode("ascii") + b"\x00"
    require(ledger.get("originalIndexGitBlobSha1") == "ef954a9cd0cd851b381494771058dd4c2f416161" and
            hashlib.sha1(git_blob + raw_index).hexdigest() == "ef954a9cd0cd851b381494771058dd4c2f416161", "Original index Git blob")
    require(ledger.get("sourceCsvSha256") == DATASET == index["source"]["sha256"], "Source digest")
    require(ledger.get("sourceCommit") == index["source"]["commit"], "Source revision")
    require(ledger.get("sourceCsvGitBlobSha1") == index["source"]["gitBlobSha1"], "Source git blob")
    require(ledger.get("selection") == {"startRank":3501,"endRank":4000,"subbatchSize":100,"continuationStartRank":4001}, "Scope")
    require(ledger.get("testedCodeCommit") == "bdf8be4607762f9b5357ffd01eb7941665f6a7db", "Original exact code")
    require(ledger.get("workflowRun") == RUN and ledger.get("workflowResult") == "SUCCESS_ALL_6_JOBS", "Original run")
    require(ledger.get("recordCount") == 500 and ledger.get("verifiedMetadataCount") == 500, "500 audited ranks / 500 exact")
    require(ledger.get("unknownCount") == 0 and ledger.get("statusCounts") == {"PUBLIC_EXACT_VERSION_OBSERVED":500} and ledger.get("unknowns") == [], "All exact; zero UNKNOWNs")
    require(ledger.get("productionV2Adds") == 0 and ledger.get("newTrustedFixtureCount") == 0 and ledger.get("signingPerformed") is False, "No admission")
    require(ledger.get("cumulative",{}).get("exactMetadata") == 3995 and ledger.get("cumulative",{}).get("unknowns") == 5 and ledger.get("cumulative",{}).get("nextRank") == 4001, "Prior + new total")
    rows, items = ledger.get("items"), index.get("items")
    require(isinstance(rows, list) and isinstance(items, list) and len(rows)==len(items)==500, "Item count")
    require([r.get("rank") for r in rows] == list(range(3501,4001)), "Rank coverage")
    require(len({r.get("package") for r in rows}) == 500, "Duplicate package")
    require(all(
        r.get("package") == i.get("name") and
        r.get("version") == i.get("datasetLatestVersion") and
        r.get("subbatch") == (r["rank"] - 3501)//100 and
        r.get("sourceReceipt") == f"GITHUB_ACTIONS_{RUN}_PART_{r['subbatch']}" and
        r.get("status") == "PUBLIC_EXACT_VERSION_OBSERVED" and
        r.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION"
        for r,i in zip(rows,items)
    ), "Receipt identity mismatch")
    blob = "".join(f"{r['rank']}\t{r['package']}\t{r['version']}\n" for r in rows).encode("utf-8")
    require(hashlib.sha256(blob).hexdigest() == IDENTITY_SHA256 == ledger.get("inventoryIdentitySha256"), "Canonical rank identity SHA256")
    head = b"blob " + str(len(blob)).encode("ascii") + b"\x00"
    require(hashlib.sha1(head+blob).hexdigest() == IDENTITY_BLOB_SHA1 == ledger.get("inventoryIdentityGitBlobSha1"), "Canonical git blob SHA1")
    artifacts = ledger.get("artifactData")
    require(isinstance(artifacts, list) and len(artifacts)==5, "All 5 artifacts")
    for k,a in enumerate(artifacts):
        aid, jsonhash, ziphash = EXPECTED[k]
        require(a.get("part") == k and a.get("id") == aid, "Artifact ID")
        require(a.get("sha256") == jsonhash and a.get("zipSha256") == ziphash, "Artifact hash")
        require(a.get("fromRank") == 3501+k*100 and a.get("toRank") == 3600+k*100, "Part range")
        require(a.get("counts") == {"PUBLIC_EXACT_VERSION_OBSERVED":100}, "Part counts")
        require(a.get("resultFile") == f"part-{k}.json", "Artifact filename")
        require(a.get("artifactURL") == f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}", "Artifact URL")
        require(type(a.get("jsonBytes")) is int and a["jsonBytes"]>0 and type(a.get("zipBytes")) is int and a["zipBytes"]>0, "Artifact sizes")
    require(part is None or (type(part) is int and 0<=part<5), "Part bounds")
    return {"status":"PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE","run":RUN,"part":part,"rankStart":3501 if part is None else 3501+part*100,"rankEnd":4000 if part is None else 3600+part*100}


def validate_original_zip_archives(directory, ledger=None, index=None):
    """Optional independent replay of the FIVE original ZIPs; no network allowed."""
    validate(ledger=ledger, index=index)
    if ledger is None:
        ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    directory = Path(directory)
    total = 0
    for part, receipt in enumerate(ledger["artifactData"]):
        archive = directory / f"npm-ranks-3501-4000-part-{part}.zip"
        payload = archive.read_bytes()
        require(len(payload) == receipt["zipBytes"], "Original ZIP byte count")
        require(hashlib.sha256(payload).hexdigest() == receipt["zipSha256"], "Original ZIP SHA256")
        with zipfile.ZipFile(io.BytesIO(payload)) as zf:
            require(zf.namelist() == [f"part-{part}.json"], "ZIP entries")
            raw = zf.read(f"part-{part}.json")
        require(len(raw) == receipt["jsonBytes"], "Original JSON byte count")
        require(hashlib.sha256(raw).hexdigest() == receipt["sha256"], "Original JSON SHA256")
        data = json.loads(raw.decode("utf-8"))
        require(data.get("schema") == "deploom.research.registry-receipts.v1" and
                data.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION", "Artifact schema")
        require(data.get("datasetCsvSha256") == DATASET and
                data.get("datasetCommit") == ledger["sourceCommit"], "Artifact source")
        require((data.get("subbatch"), data.get("firstRank"), data.get("lastRank"), data.get("itemCount")) ==
                (part, 3501 + part * 100, 3600 + part * 100, 100), "Artifact partition")
        require(data.get("statusCounts") == receipt["counts"], "Artifact status")
        rows = data.get("records")
        require(isinstance(rows, list) and len(rows) == 100, "Artifact record count")
        for j, record in enumerate(rows):
            expected = index["items"][100 * part + j]
            require(record.get("rank") == expected["rank"] and
                    record.get("package") == expected["name"] and
                    record.get("version") == expected["datasetLatestVersion"], "Artifact identity")
            require(record.get("status") == ledger["items"][100 * part + j]["status"] and
                    record.get("admission") == "RESEARCH_ONLY", "Artifact authority")
            if record["status"] == "PUBLIC_EXACT_VERSION_OBSERVED":
                require(re.fullmatch(r"[0-9a-f]{64}", record.get("sourceSha256", "")) is not None, "HTTP body digest")
                require(all(isinstance(record.get(k), dict) for k in ("peerDependencies", "peerDependenciesMeta", "engines")), "Metadata shape")
            else:
                require(False, "Unexpected UNKNOWN or unrecognized status in original ZIP")
            url = "https://registry.npmjs.org/" + urllib.parse.quote(expected["name"], safe="") + "/" + urllib.parse.quote(expected["datasetLatestVersion"], safe="")
            require(record.get("url") == url, "Artifact exact public URL")
        total += len(rows)
    require(total == 500, "Complete artifact verification")
    return {"status": "PASS_5_ORIGINAL_ZIPS_INDEPENDENTLY_VERIFIED", "recordCount": total}


if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--part",type=int,choices=range(5),default=None)
    parser.add_argument("--artifact-dir",type=Path,default=None,help="optional offline verification of original ZIPs")
    a=parser.parse_args()
    result = validate_original_zip_archives(a.artifact_dir) if a.artifact_dir else validate(part=a.part)
    print(json.dumps(result,sort_keys=True))
