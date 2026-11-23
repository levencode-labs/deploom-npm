#!/usr/bin/env python3
"""Offline audit of independently pinned first-run GitHub artifact receipts; NO HTTP."""
import argparse
import hashlib
import json
import re
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent
RUN = 45212862392
EXPECTED = [
    (14838080277, "2f5ecd2a458a4e51163e475dbcecc801b92b7ed7d24478f7637493bb09941237", "7618c33e0dde2cf19bd6dc003a0b19c203515517821b8a61a1541c862f1bb3e7"),
    (14836822607, "f1bd923b72aa7a73b91ab08fb49f5aa7e3d511c53ed9b9fd5617b29560ab5b26", "6e49880f85278efc5e555288af6889231e0c00e272520745604c7fbb492aa5b8"),
    (14838145444, "b699f865c4005ca55a8b27827ecab31b0f46ca50f07698c445bc2f3e0ecc957f", "354d92b5fc3126606173bca4c58987c2f075ca0068c03c98eead65dc1aff1dff"),
    (14836223397, "2da31ef19fa297e4541ffb9cc2e9d748b2c65c3fed4a6d33d9a41da1be3d3d20", "7f5e514474d9e46364b70d6a95de0e2eacd2c6c33a5e01228702834a2a9b3bc6"),
    (14836078812, "36af2a701471f2975f96076d17be5783b38a0e7c444a5c51b45cc8cbb1de47e4", "31cffb97a2bcb8994122519061a1822b09a695e7a3a534d93a427ad702b744ee"),
]
DATASET = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
IDENTITY_SHA256 = "ac80fb151654a225205c2264e4a145ca42e2dd999d36669d61cb2d40121f5dd6"
IDENTITY_BLOB_SHA1 = "ca0b47d59d60214cea25a31121a8342294c0eae8"

def require(ok, why):
    if not ok:
        raise ValueError(why)

def validate(ledger=None, index=None, *, part=None):
    if ledger is None:
        ledger = json.loads((ROOT / "registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index = json.loads((ROOT / "index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema") == "deploom.research.npm-ranks-1501-2000-coverage.v1", "Schema")
    require(ledger.get("authority") == "RESEARCH_ONLY_NOT_V2_ADMISSION", "Authority")
    require(ledger.get("sourceCsvSha256") == DATASET == index["source"]["sha256"], "Source digest")
    require(ledger.get("sourceCommit") == index["source"]["commit"], "Source revision")
    require(ledger.get("sourceCsvGitBlobSha1") == index["source"]["gitBlobSha1"], "Source git blob")
    require(ledger.get("selection") == {"startRank":1501,"endRank":2000,"subbatchSize":100,"continuationStartRank":2001}, "Scope")
    require(ledger.get("testedCodeCommit") == "8935c4b4582e05e1039d55479b2390b978bb43bc", "Original exact code")
    require(ledger.get("workflowRun") == RUN and ledger.get("workflowResult") == "SUCCESS_ALL_6_JOBS", "Original run")
    require(ledger.get("recordCount") == ledger.get("verifiedMetadataCount") == 500, "500 exact")
    require(ledger.get("unknownCount") == 0 and ledger.get("statusCounts") == {"PUBLIC_EXACT_VERSION_OBSERVED":500} and ledger.get("unknowns") == [], "No UNKNOWN")
    require(ledger.get("productionV2Adds") == 0 and ledger.get("newTrustedFixtureCount") == 0 and ledger.get("signingPerformed") is False, "No admission")
    require(ledger.get("cumulative",{}).get("exactMetadata") == 1996 and ledger.get("cumulative",{}).get("unknowns") == 4 and ledger.get("cumulative",{}).get("nextRank") == 2001, "Prior + new total")
    rows, items = ledger.get("items"), index.get("items")
    require(isinstance(rows, list) and isinstance(items, list) and len(rows)==len(items)==500, "Item count")
    require([r.get("rank") for r in rows] == list(range(1501,2001)), "Rank coverage")
    require(len({r.get("package") for r in rows}) == 500, "Duplicate package")
    require(all(
        r.get("package") == i.get("name") and
        r.get("version") == i.get("datasetLatestVersion") and
        r.get("subbatch") == (r["rank"] - 1501)//100 and
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
        require(a.get("fromRank") == 1501+k*100 and a.get("toRank") == 1600+k*100, "Part range")
        require(a.get("counts") == {"PUBLIC_EXACT_VERSION_OBSERVED":100}, "Part counts")
        require(a.get("resultFile") == f"part-{k}.json", "Artifact filename")
        require(a.get("artifactURL") == f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}", "Artifact URL")
        require(type(a.get("jsonBytes")) is int and a["jsonBytes"]>0 and type(a.get("zipBytes")) is int and a["zipBytes"]>0, "Artifact sizes")
    require(part is None or (type(part) is int and 0<=part<5), "Part bounds")
    return {"status":"PASS_ORIGINAL_RECEIPTS_VERIFIED_OFFLINE","run":RUN,"part":part,"rankStart":1501 if part is None else 1501+part*100,"rankEnd":2000 if part is None else 1600+part*100}

if __name__ == "__main__":
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--part",type=int,choices=range(5),default=None)
    a=parser.parse_args()
    print(json.dumps(validate(part=a.part),sort_keys=True))
