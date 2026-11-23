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
RUN = 45221211562
EXPECTED = [
    (14841126472, "9aef487f99af31f8d4ad2f6a78552d3f157c28617770345045a4f80a4f359f20", "84a08b8ec07458dcb4e5d6ced8602860b8a37b1c193a97836aa391cfd7274cf9"),
    (14842040602, "7c00c166632586e4ef6c15ca38d747e3234c9543b56144cdb30284c4cac6ba63", "a4f6fc9fc11eb67d19bd1231b674db7f9d681ff6200e01c664d9b66d5aef4ed9"),
    (14841561167, "4cfd0dc3f3a94320573862883c6142abdfee8474d31564256f664fe106c14e18", "548aeafba9556a93a00b8b06c747c8de1c8abe8c425dab653c908a8424dc73e4"),
    (14841171516, "38ff153cc8f822490572fb0714132eba41459f4ef4d7058047f9c8a75c545973", "8643b6e2ccc76bcdf5dfd0c66bad84db152d9fea3858558973c61dede48ee6d5"),
    (14839998246, "23890193ffbc8ac16985236152afb17cd2b992af006ad5d242c6253d73921167", "70d053bb7a722146f6ca5598cdf4f571910bb62d7f540020585395295c827548"),
]
DATASET = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
IDENTITY_SHA256 = "f7ae9923aa1f3130979d533f194ab8753052a91998ea66138399f4f10ca6e5fa"
IDENTITY_BLOB_SHA1 = "3d5117ca5a8b6f27646235b6abfab3b503824c46"

def require(ok, why):
    if not ok:
        raise ValueError(why)

def validate(ledger=None, index=None, *, part=None):
    if ledger is None:
        ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema") == "deploom.research.npm-ranks-2501-3000-coverage.v1", "Schema")
    require(ledger.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION", "Authority")
    require(ledger.get("sourceCsvSha256") == DATASET == index["source"]["sha256"], "Source digest")
    require(ledger.get("sourceCommit") == index["source"]["commit"], "Source revision")
    require(ledger.get("sourceCsvGitBlobSha1") == index["source"]["gitBlobSha1"], "Source git blob")
    require(ledger.get("selection") == {"startRank":2501,"endRank":3000,"subbatchSize":100,"continuationStartRank":3001}, "Scope")
    require(ledger.get("testedCodeCommit") == "0d86bb99b02fd40d5f1737bd7cc98b77b40b6230", "Original exact code")
    require(ledger.get("workflowRun") == RUN and ledger.get("workflowResult") == "SUCCESS_ALL_6_JOBS", "Original run")
    require(ledger.get("recordCount") == 500 and ledger.get("verifiedMetadataCount") == 499, "500 audited ranks / 499 exact")
    require(ledger.get("unknownCount") == 1 and ledger.get("statusCounts") == {"PUBLIC_EXACT_VERSION_OBSERVED":499, "UNKNOWN_HTTP_404":1} and len(ledger.get("unknowns", [])) == 1 and ledger["unknowns"][0].get("rank") == 2502 and ledger["unknowns"][0].get("status") == "UNKNOWN_HTTP_404", "Exactly one preserved UNKNOWN")
    require(ledger.get("productionV2Adds") == 0 and ledger.get("newTrustedFixtureCount") == 0 and ledger.get("signingPerformed") is False, "No admission")
    require(ledger.get("cumulative",{}).get("exactMetadata") == 2995 and ledger.get("cumulative",{}).get("unknowns") == 5 and ledger.get("cumulative",{}).get("nextRank") == 3001, "Prior + new total")
    rows, items = ledger.get("items"), index.get("items")
    require(isinstance(rows, list) and isinstance(items, list) and len(rows)==len(items)==500, "Item count")
    require([r.get("rank") for r in rows] == list(range(2501,3001)), "Rank coverage")
    require(len({r.get("package") for r in rows}) == 500, "Duplicate package")
    require(all(
        r.get("package") == i.get("name") and
        r.get("version") == i.get("datasetLatestVersion") and
        r.get("subbatch") == (r["rank"] - 2501)//100 and
        r.get("sourceReceipt") == f"GITHUB_ACTIONS_{RUN}_PART_{r['subbatch']}" and
        r.get("status") == ("UNKNOWN_HTTP_404" if r["rank"] == 2502 else "PUBLIC_EXACT_VERSION_OBSERVED") and
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
        require(a.get("fromRank") == 2501+k*100 and a.get("toRank") == 2600+k*100, "Part range")
        require(a.get("counts") == ({"PUBLIC_EXACT_VERSION_OBSERVED":99, "UNKNOWN_HTTP_404":1} if k==0 else {"PUBLIC_EXACT_VERSION_OBSERVED":100}), "Part counts")
        require(a.get("resultFile") == f"part-{k}.json", "Artifact filename")
        require(a.get("artifactURL") == f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}", "Artifact URL")
        require(type(a.get("jsonBytes")) is int and a["jsonBytes"]>0 and type(a.get("zipBytes")) is int and a["zipBytes"]>0, "Artifact sizes")
    require(part is None or (type(part) is int and 0<=part<5), "Part bounds")
    return {"status":"PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE","run":RUN,"part":part,"rankStart":2501 if part is None else 2501+part*100,"rankEnd":3000 if part is None else 2600+part*100}


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
        archive = directory / f"npm-ranks-2501-3000-part-{part}.zip"
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
                (part, 2501 + part * 100, 2600 + part * 100, 100), "Artifact partition")
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
                require(record["rank"] == 2502 and record["status"] == "UNKNOWN_HTTP_404" and record.get("sourceSha256") is None, "UNKNOWN status boundary")
                require(all(record.get(k) is None for k in ("peerDependencies", "peerDependenciesMeta", "engines")), "UNKNOWN metadata must be null")
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
