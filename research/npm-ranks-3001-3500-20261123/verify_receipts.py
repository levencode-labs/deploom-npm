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
RUN = 45223949277
EXPECTED = [
    (14840933104, "596278eccfc4c6cd5bcf06fa5cf5689c505285fff8ddd7df71a21d26bdb1d2ff", "92a9df6d68175a8bf6d730aba705c286b1e53904d436e42318fba495b6955589"),
    (14842291564, "9bc9abe9a97212cc10c885c8ac3c2d41a6ae3fc03ce0cfeb6e5f44a0687c06c1", "7706625fcdf5b19ab3a1b19742b22ae5e65a41847ae417fdbb692fdd72441afc"),
    (14840713246, "ad28aa736718a29d69a9f62397fedd86db9d8c0b634c40b6c95747fd15f96498", "d08216ccd11e2477329a2bed6ce967eaa935f9a03aab4ff259b10c6eae1450d3"),
    (14842003875, "48edfa31a4bfac9d468a8c4ba05c14439269246abfa32954cc7a95ba6edddc55", "f49334268f0c06db295b24b17ff63fd184ad5f9296835ed088611d457d032137"),
    (14840558786, "9d23d0b22f3af18ed1b05dc14f4b2c662a62db3d4004823eeda4f7245ed72fa6", "a7121e5174ee1e630dadd77a2640126f158580562abf155c76dfb262cb0d9549"),
]
DATASET = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
IDENTITY_SHA256 = "c441dca9a74ce28baee3f7b9dcc868471c8a83c25225554b2bcccdbb8d144f50"
IDENTITY_BLOB_SHA1 = "5e404d27b372c58eddd2e2cc49cdba5d8fe939c7"

def require(ok, why):
    if not ok:
        raise ValueError(why)

def validate(ledger=None, index=None, *, part=None):
    if ledger is None:
        ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema") == "deploom.research.npm-ranks-3001-3500-coverage.v1", "Schema")
    require(ledger.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION", "Authority")
    require(ledger.get("sourceCsvSha256") == DATASET == index["source"]["sha256"], "Source digest")
    require(ledger.get("sourceCommit") == index["source"]["commit"], "Source revision")
    require(ledger.get("sourceCsvGitBlobSha1") == index["source"]["gitBlobSha1"], "Source git blob")
    require(ledger.get("selection") == {"startRank":3001,"endRank":3500,"subbatchSize":100,"continuationStartRank":3501}, "Scope")
    require(ledger.get("testedCodeCommit") == "7cb9d271b3f61f4ce758cc45e5f3ecad7b78fdaa", "Original exact code")
    require(ledger.get("workflowRun") == RUN and ledger.get("workflowResult") == "SUCCESS_ALL_6_JOBS", "Original run")
    require(ledger.get("recordCount") == 500 and ledger.get("verifiedMetadataCount") == 500, "500 audited ranks / 500 exact")
    require(ledger.get("unknownCount") == 0 and ledger.get("statusCounts") == {"PUBLIC_EXACT_VERSION_OBSERVED":500} and ledger.get("unknowns") == [], "All exact; zero UNKNOWNs")
    require(ledger.get("productionV2Adds") == 0 and ledger.get("newTrustedFixtureCount") == 0 and ledger.get("signingPerformed") is False, "No admission")
    require(ledger.get("cumulative",{}).get("exactMetadata") == 3495 and ledger.get("cumulative",{}).get("unknowns") == 5 and ledger.get("cumulative",{}).get("nextRank") == 3501, "Prior + new total")
    rows, items = ledger.get("items"), index.get("items")
    require(isinstance(rows, list) and isinstance(items, list) and len(rows)==len(items)==500, "Item count")
    require([r.get("rank") for r in rows] == list(range(3001,3501)), "Rank coverage")
    require(len({r.get("package") for r in rows}) == 500, "Duplicate package")
    require(all(
        r.get("package") == i.get("name") and
        r.get("version") == i.get("datasetLatestVersion") and
        r.get("subbatch") == (r["rank"] - 3001)//100 and
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
        require(a.get("fromRank") == 3001+k*100 and a.get("toRank") == 3100+k*100, "Part range")
        require(a.get("counts") == {"PUBLIC_EXACT_VERSION_OBSERVED":100}, "Part counts")
        require(a.get("resultFile") == f"part-{k}.json", "Artifact filename")
        require(a.get("artifactURL") == f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}", "Artifact URL")
        require(type(a.get("jsonBytes")) is int and a["jsonBytes"]>0 and type(a.get("zipBytes")) is int and a["zipBytes"]>0, "Artifact sizes")
    require(part is None or (type(part) is int and 0<=part<5), "Part bounds")
    return {"status":"PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE","run":RUN,"part":part,"rankStart":3001 if part is None else 3001+part*100,"rankEnd":3500 if part is None else 3100+part*100}


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
        archive = directory / f"npm-ranks-3001-3500-part-{part}.zip"
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
                (part, 3001 + part * 100, 3100 + part * 100, 100), "Artifact partition")
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
