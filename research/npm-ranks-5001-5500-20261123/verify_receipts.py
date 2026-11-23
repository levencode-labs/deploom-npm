#!/usr/bin/env python3
"""Offline-only verification of original Batch 11 receipts; no HTTP or npm requests."""
from __future__ import annotations
import argparse
import hashlib
import io
import json
import re
import urllib.parse
import zipfile
from collections import Counter
from pathlib import Path

ROOT=Path(__file__).resolve().parent
RUN=45236591264
INDEX_BLOB="ca9f7d2e2f659b0af0f289de341475acefdf8fb1"
EXPECTED=[
 (14850531230,"78987b6d0099ff7caceb8c2d8fa76816fc1f72235bcca100054010fc439fdfb5","9d15d30a812f1eca2e9a92c2f58ec8c4babaf687f1d446dc4e45e76d6c0a5bf8",57439,8776),
 (14849092090,"2b9a90d6353d2d67535e2d361fbb622bceaae71976982ae2c66770b241e241d4","c250981ec87d047c95d91ddc814b036a6dcdad069e3c8bf0422a462fcd383fcc",57527,8910),
 (14849901498,"2b05c84a3e8ae28558f1bd710eafe5a9e3878c05f5fc22e31dba39a5d5d27baa","868c322c430858aa8d192f7771e532900ecc9a6c2089867b58dc316137fdc28f",57623,8752),
 (14848508821,"037326c32c3cf83b42064d5b9afa7987fbbe7d7102ad410f8c4cef7663751bd7","772fea3da46718212ea8f9ce449ac0676031398af1e6e83ec75a9d721a2f65e9",58798,9117),
 (14848364106,"dbe739975c131dfb48f9b4ee58838bbeb2a95cf2514cdcfd82abb9ed319890f4","db6e65e1ce35937dcd326641775dbf00906c0f6734c1650930ec6dc79098182e",57567,8788)
]
CSV_SHA="8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"

def require(ok,message):
    if not ok:
        raise ValueError(message)

def sha256(x):
    return hashlib.sha256(x).hexdigest()

def git_blob(raw):
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\x00"+raw).hexdigest()

def validate(ledger=None,index=None,*,part=None):
    if ledger is None:
        ledger=json.loads((ROOT/"registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index=json.loads((ROOT/"index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema")=="deploom.research.npm-ranks-5001-5500-coverage.v1","schema")
    require(ledger.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","authority")
    require(index.get("schema")=="deploom.research.npm-ranks-5001-5500.v1","index schema")
    require(ledger.get("originalIndexGitBlobSha1")==INDEX_BLOB and git_blob((ROOT/"index.json").read_bytes())==INDEX_BLOB,"index blob")
    require(ledger.get("sourceCsvSha256")==index["source"]["sha256"]==CSV_SHA,"source SHA")
    require(ledger.get("sourceCommit")==index["source"]["commit"]=="54cf58bc9bafa35fef1c4acf6435d667b4af47c1","source commit")
    require(ledger.get("sourceCsvGitBlobSha1")==index["source"]["gitBlobSha1"]=="0d45bc4b8bdd2a8016e582af7fef6f3d0f310272","source git blob")
    require(ledger.get("selection")=={"startRank":5001,"endRank":5500,"subbatchSize":100,"continuationStartRank":5501},"selection")
    require(ledger.get("workflowRun")==RUN and ledger.get("workflowResult")=="SUCCESS_ALL_6_JOBS","original run")
    require(ledger.get("testedCodeCommit")=="41f7882f4c75c67b6c287506b3bf77be631995b9","original code HEAD")
    require(ledger.get("recordCount")==500 and ledger.get("verifiedMetadataCount")==499 and ledger.get("unknownCount")==1,"counts")
    require(ledger.get("statusCounts")=={"PUBLIC_EXACT_VERSION_OBSERVED":499,"UNKNOWN_HTTP_404":1},"status counts")
    require(ledger.get("unknowns")==[{"rank":5484,"package":"@voyantjs/core","version":"0.109.0","status":"UNKNOWN_HTTP_404"}],"historical UNKNOWN")
    require(ledger.get("productionV2Adds")==0 and ledger.get("newTrustedFixtureCount")==0 and ledger.get("signingPerformed") is False,"no admission")
    require(ledger.get("cumulative")=={"exactMetadata":5492,"unknowns":8,"nextRank":5501},"cumulative")
    rows=ledger.get("items")
    items=index.get("items")
    require(isinstance(rows,list) and isinstance(items,list) and len(rows)==len(items)==500,"items")
    require([x.get("rank") for x in rows]==list(range(5001,5501)),"ordered ranks")
    require(len({x.get("package") for x in rows})==500,"duplicate names")
    for row,item in zip(rows,items):
        rank=row["rank"]
        expected_status="UNKNOWN_HTTP_404" if rank==5484 else "PUBLIC_EXACT_VERSION_OBSERVED"
        require(row.get("package")==item.get("name") and row.get("version")==item.get("datasetLatestVersion"),"identity")
        require(row.get("subbatch")==item.get("subbatch")==((rank-5001)//100),"subbatch")
        require(row.get("status")==expected_status,"status")
        require(row.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","item authority")
        require(row.get("sourceReceipt")==f"GITHUB_ACTIONS_{RUN}_PART_{row['subbatch']}","receipt pointer")
    require(dict(Counter(x["status"] for x in rows))==ledger["statusCounts"],"cross-count")
    artifacts=ledger.get("artifactData")
    require(isinstance(artifacts,list) and len(artifacts)==5,"five artifacts")
    for i,a in enumerate(artifacts):
        aid,js,zipsha,jsbytes,zipbytes=EXPECTED[i]
        require(a.get("part")==i and a.get("id")==aid,"artifact ID")
        require(a.get("sha256")==js and a.get("zipSha256")==zipsha,"original digest")
        require(a.get("jsonBytes")==jsbytes and a.get("zipBytes")==zipbytes,"original bytes")
        require(a.get("fromRank")==5001+i*100 and a.get("toRank")==5100+i*100,"artifact scope")
        require(a.get("resultFile")==f"part-{i}.json","JSON member")
        require(a.get("artifactURL")==f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}","artifact URL")
        require(a.get("counts")==({"PUBLIC_EXACT_VERSION_OBSERVED":99,"UNKNOWN_HTTP_404":1} if i==4 else {"PUBLIC_EXACT_VERSION_OBSERVED":100}),"artifact counts")
    require(part is None or (type(part) is int and 0<=part<5),"part")
    return {"status":"PASS_OFFLINE_MANIFEST","originalRun":RUN,"part":part,"ranks":500,"exact":499,"unknown":1}

def validate_original_zip_archives(directory,ledger=None,index=None):
    """Replay original ZIP/JSON hashes and EVERY rank/name/version/status without network."""
    validate(ledger=ledger,index=index)
    if ledger is None:
        ledger=json.loads((ROOT/"registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index=json.loads((ROOT/"index.json").read_text(encoding="utf-8"))
    directory=Path(directory)
    count=0
    for part,a in enumerate(ledger["artifactData"]):
        # Accept the canonical saved name, or the local independent verifier name.
        archive=directory/f"npm-ranks-5001-5500-part-{part}.zip"
        if not archive.is_file():
            archive=directory/f"batch11-original-part-{part}.zip"
        raw=archive.read_bytes()
        require(len(raw)==a["zipBytes"] and sha256(raw)==a["zipSha256"],"original ZIP byte hash")
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            require(z.namelist()==[f"part-{part}.json"],"ZIP member list")
            js=z.read(f"part-{part}.json")
        require(len(js)==a["jsonBytes"] and sha256(js)==a["sha256"],"original JSON byte hash")
        obj=json.loads(js)
        require(obj.get("schema")=="deploom.research.registry-receipts.v1" and obj.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","JSON schema")
        require(obj.get("datasetCsvSha256")==CSV_SHA and obj.get("datasetCommit")==ledger["sourceCommit"],"JSON pinned source")
        require((obj.get("subbatch"),obj.get("firstRank"),obj.get("lastRank"),obj.get("itemCount"))==(part,5001+part*100,5100+part*100,100),"JSON scope")
        require(obj.get("statusCounts")==a["counts"],"JSON counts")
        records=obj.get("records")
        require(isinstance(records,list) and len(records)==100,"JSON records count")
        for j,rec in enumerate(records):
            expected=index["items"][part*100+j]
            status=ledger["items"][part*100+j]["status"]
            require((rec.get("rank"),rec.get("package"),rec.get("version"))==(expected["rank"],expected["name"],expected["datasetLatestVersion"]),"original identity")
            require(rec.get("status")==status and rec.get("admission")=="RESEARCH_ONLY","original record status")
            require(rec.get("url")=="https://registry.npmjs.org/"+urllib.parse.quote(expected["name"],safe="")+"/"+urllib.parse.quote(expected["datasetLatestVersion"],safe=""),"exact URL")
            if status=="PUBLIC_EXACT_VERSION_OBSERVED":
                require(re.fullmatch(r"[a-f0-9]{64}",rec.get("sourceSha256","")) is not None,"source body hash")
                require(all(isinstance(rec.get(k),dict) for k in ("engines","peerDependencies","peerDependenciesMeta")),"metadata shape")
            else:
                require(expected["rank"]==5484 and status=="UNKNOWN_HTTP_404" and rec.get("sourceSha256") is None,"explicit UNKNOWN")
            count+=1
    require(count==500,"complete original ZIP audit")
    return {"status":"PASS_ORIGINAL_5_ZIP_AND_JSON_BYTES","records":count,"exact":499,"unknown":1,"originalRun":RUN}

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--part",type=int,choices=range(5),default=None)
    p.add_argument("--artifact-dir",type=Path,default=None)
    a=p.parse_args()
    print(json.dumps(validate_original_zip_archives(a.artifact_dir) if a.artifact_dir else validate(part=a.part),sort_keys=True))
