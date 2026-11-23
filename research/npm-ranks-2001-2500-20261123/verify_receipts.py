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
RUN = 45217619875
EXPECTED = [
    (14838378538, "e8db54e2f9fa51d4cf98b28ecabbf5d138175213b0be558620517ea9fec073ad", "64552b09bb3f03099f7835b85dd066bb5343a86c1d8cd4399bd5a11e287a12fa"),
    (14838972591, "516d12d4ec30a278dbe7aefe6d7727f1c0573776a002207407b964e212bd32c0", "175ee5097a0cace17548b15df059fd151bc817758816b75cf0053ebc4f8d39f3"),
    (14838628295, "eebd34021a1ce456844a4e823ed7ff476c6e85535d086bc6d7568a0aebf00110", "52c30ca5e81cf4362faedd58068f637bb4cfae6cc6bb41bf33fe56f271677bf0"),
    (14839576549, "a926b49ae2725dfa8c033048f963d71cd48497f06930b907b064a675138b82dd", "3e3d67de12c4641121b713b1271b700f4a0b88fa423b397e329ff421ab8972a4"),
    (14838483598, "5132cd4eb18618bd6b5b6cc12feb0d65a0d668e3b2970a37b5f10a16863bc84c", "bea3b146c735d495665940db6d962b20ea6dedb5d00c9ee79bb9cf3873ff874e"),
]
DATASET = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
IDENTITY_SHA256 = "35b939522c9e1a55d6a02960d87955a46545a90f132e02e8baf92dd3ed833293"
IDENTITY_BLOB_SHA1 = "014f964247be3b0c9bf4bcad4b13b64e02dab886"

def require(ok, why):
    if not ok:
        raise ValueError(why)

def validate(ledger=None, index=None, *, part=None):
    if ledger is None:
        ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema") == "deploom.research.npm-ranks-2001-2500-coverage.v1", "Schema")
    require(ledger.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION", "Authority")
    require(ledger.get("sourceCsvSha256") == DATASET == index["source"]["sha256"], "Source digest")
    require(ledger.get("sourceCommit") == index["source"]["commit"], "Source revision")
    require(ledger.get("sourceCsvGitBlobSha1") == index["source"]["gitBlobSha1"], "Source git blob")
    require(ledger.get("selection") == {"startRank":2001,"endRank":2500,"subbatchSize":100,"continuationStartRank":2501}, "Scope")
    require(ledger.get("testedCodeCommit") == "8998bdd1459f23eceb82bee6de8c960a83aecb5c", "Original exact code")
    require(ledger.get("workflowRun") == RUN and ledger.get("workflowResult") == "SUCCESS_ALL_6_JOBS", "Original run")
    require(ledger.get("recordCount") == ledger.get("verifiedMetadataCount") == 500, "500 exact")
    require(ledger.get("unknownCount") == 0 and ledger.get("statusCounts") == {"PUBLIC_EXACT_VERSION_OBSERVED":500} and ledger.get("unknowns") == [], "No UNKNOWN")
    require(ledger.get("productionV2Adds") == 0 and ledger.get("newTrustedFixtureCount") == 0 and ledger.get("signingPerformed") is False, "No admission")
    require(ledger.get("cumulative",{}).get("exactMetadata") == 2496 and ledger.get("cumulative",{}).get("unknowns") == 4 and ledger.get("cumulative",{}).get("nextRank") == 2501, "Prior + new total")
    rows, items = ledger.get("items"), index.get("items")
    require(isinstance(rows, list) and isinstance(items, list) and len(rows)==len(items)==500, "Item count")
    require([r.get("rank") for r in rows] == list(range(2001,2501)), "Rank coverage")
    require(len({r.get("package") for r in rows}) == 500, "Duplicate package")
    require(all(
        r.get("package") == i.get("name") and
        r.get("version") == i.get("datasetLatestVersion") and
        r.get("subbatch") == (r["rank"] - 2001)//100 and
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
        require(a.get("fromRank") == 2001+k*100 and a.get("toRank") == 2100+k*100, "Part range")
        require(a.get("counts") == {"PUBLIC_EXACT_VERSION_OBSERVED":100}, "Part counts")
        require(a.get("resultFile") == f"part-{k}.json", "Artifact filename")
        require(a.get("artifactURL") == f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}", "Artifact URL")
        require(type(a.get("jsonBytes")) is int and a["jsonBytes"]>0 and type(a.get("zipBytes")) is int and a["zipBytes"]>0, "Artifact sizes")
    require(part is None or (type(part) is int and 0<=part<5), "Part bounds")
    return {"status":"PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE","run":RUN,"part":part,"rankStart":2001 if part is None else 2001+part*100,"rankEnd":2500 if part is None else 2100+part*100}


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
        archive = directory / f"npm-ranks-2001-2500-part-{part}.zip"
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
                (part, 2001 + part * 100, 2100 + part * 100, 100), "Artifact partition")
        require(data.get("statusCounts") == {"PUBLIC_EXACT_VERSION_OBSERVED": 100}, "Artifact status")
        rows = data.get("records")
        require(isinstance(rows, list) and len(rows) == 100, "Artifact record count")
        for j, record in enumerate(rows):
            expected = index["items"][100 * part + j]
            require(record.get("rank") == expected["rank"] and
                    record.get("package") == expected["name"] and
                    record.get("version") == expected["datasetLatestVersion"], "Artifact identity")
            require(record.get("status") == "PUBLIC_EXACT_VERSION_OBSERVED" and
                    record.get("admission") == "RESEARCH_ONLY", "Artifact authority")
            require(re.fullmatch(r"[0-9a-f]{64}", record.get("sourceSha256", "")) is not None, "HTTP body digest")
            url = "https://registry.npmjs.org/" + urllib.parse.quote(expected["name"], safe="") + "/" + urllib.parse.quote(expected["datasetLatestVersion"], safe="")
            require(record.get("url") == url, "Artifact exact public URL")
            require(all(isinstance(record.get(k), dict) for k in ("peerDependencies", "peerDependenciesMeta", "engines")), "Metadata shape")
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
