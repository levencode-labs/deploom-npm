#!/usr/bin/env python3
"""Offline-only verification of original Batch 10 receipts; no HTTP or npm requests."""
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
RUN=45232399468
INDEX_BLOB="b122e1457e636473aca5d6eb354d7f5aa926a904"
EXPECTED=[
 (14846708781,"8856cb7af46985e72f1d81b1a372539108b7ca45679389a8fef334dc2913ab97","7e999acdffd9b7479eb7504fd3ee7bd6f84001c5b3ca62f9cc23d7555edc8074",56701,8633),
 (14845968756,"502722116e17ab7b6a95b28b36bcc4238f3291366bdcf52635218f5dc7e3aa6d","41e16319c25abf38d263627062a23a955b771a9931ab3639489667e0899b3966",57297,8791),
 (14846133726,"01964d6b056665901da3599e9742deda9c9a8e3af6c606c7826d5b0a3e3f632f","5488c021c14b6f5299e216bd76c3b83d1a84192f95111e33a704fca241c755cd",58884,9000),
 (14847962059,"e3dacf44844cf86ab8b4610cda0b671835568071f2dae0de9916cf9aa2c56f53","f0f28b77a604c9a6b312dc3144fca8c0434eac85df006cfe3cbee6c2edb354b0",58600,9087),
 (14845593791,"c52de8a9bdf97c932bdb926cd2928adfb0a8890257c5c56017cf6cc09016e804","32e9fe574478b7767ab8b5309b09088b890eb4912b3771088e2335b658e69023",57731,8951)
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
    require(ledger.get("schema")=="deploom.research.npm-ranks-4501-5000-coverage.v1","schema")
    require(ledger.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","authority")
    require(index.get("schema")=="deploom.research.npm-ranks-4501-5000.v1","index schema")
    require(ledger.get("originalIndexGitBlobSha1")==INDEX_BLOB and git_blob((ROOT/"index.json").read_bytes())==INDEX_BLOB,"index blob")
    require(ledger.get("sourceCsvSha256")==index["source"]["sha256"]==CSV_SHA,"source SHA")
    require(ledger.get("sourceCommit")==index["source"]["commit"]=="54cf58bc9bafa35fef1c4acf6435d667b4af47c1","source commit")
    require(ledger.get("sourceCsvGitBlobSha1")==index["source"]["gitBlobSha1"]=="0d45bc4b8bdd2a8016e582af7fef6f3d0f310272","source git blob")
    require(ledger.get("selection")=={"startRank":4501,"endRank":5000,"subbatchSize":100,"continuationStartRank":5001},"selection")
    require(ledger.get("workflowRun")==RUN and ledger.get("workflowResult")=="SUCCESS_ALL_6_JOBS","original run")
    require(ledger.get("testedCodeCommit")=="1753efe9c6058fa56c30b99ab94a2874bca7c2e8","original code HEAD")
    require(ledger.get("recordCount")==500 and ledger.get("verifiedMetadataCount")==499 and ledger.get("unknownCount")==1,"counts")
    require(ledger.get("statusCounts")=={"PUBLIC_EXACT_VERSION_OBSERVED":499,"UNKNOWN_HTTP_404":1},"status counts")
    require(ledger.get("unknowns")==[{"rank":4749,"package":"@zeniai/client-epic-state","version":"5.1.29","status":"UNKNOWN_HTTP_404"}],"historical UNKNOWN")
    require(ledger.get("productionV2Adds")==0 and ledger.get("newTrustedFixtureCount")==0 and ledger.get("signingPerformed") is False,"no admission")
    require(ledger.get("cumulative")=={"exactMetadata":4993,"unknowns":7,"nextRank":5001},"cumulative")
    rows=ledger.get("items")
    items=index.get("items")
    require(isinstance(rows,list) and isinstance(items,list) and len(rows)==len(items)==500,"items")
    require([x.get("rank") for x in rows]==list(range(4501,5001)),"ordered ranks")
    require(len({x.get("package") for x in rows})==500,"duplicate names")
    for row,item in zip(rows,items):
        rank=row["rank"]
        expected_status="UNKNOWN_HTTP_404" if rank==4749 else "PUBLIC_EXACT_VERSION_OBSERVED"
        require(row.get("package")==item.get("name") and row.get("version")==item.get("datasetLatestVersion"),"identity")
        require(row.get("subbatch")==item.get("subbatch")==((rank-4501)//100),"subbatch")
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
        require(a.get("fromRank")==4501+i*100 and a.get("toRank")==4600+i*100,"artifact scope")
        require(a.get("resultFile")==f"part-{i}.json","JSON member")
        require(a.get("artifactURL")==f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}","artifact URL")
        require(a.get("counts")==({"PUBLIC_EXACT_VERSION_OBSERVED":99,"UNKNOWN_HTTP_404":1} if i==2 else {"PUBLIC_EXACT_VERSION_OBSERVED":100}),"artifact counts")
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
        archive=directory/f"npm-ranks-4501-5000-part-{part}.zip"
        if not archive.is_file():
            archive=directory/f"batch10-original-part-{part}.zip"
        raw=archive.read_bytes()
        require(len(raw)==a["zipBytes"] and sha256(raw)==a["zipSha256"],"original ZIP byte hash")
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            require(z.namelist()==[f"part-{part}.json"],"ZIP member list")
            js=z.read(f"part-{part}.json")
        require(len(js)==a["jsonBytes"] and sha256(js)==a["sha256"],"original JSON byte hash")
        obj=json.loads(js)
        require(obj.get("schema")=="deploom.research.registry-receipts.v1" and obj.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","JSON schema")
        require(obj.get("datasetCsvSha256")==CSV_SHA and obj.get("datasetCommit")==ledger["sourceCommit"],"JSON pinned source")
        require((obj.get("subbatch"),obj.get("firstRank"),obj.get("lastRank"),obj.get("itemCount"))==(part,4501+part*100,4600+part*100,100),"JSON scope")
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
                require(expected["rank"]==4749 and status=="UNKNOWN_HTTP_404" and rec.get("sourceSha256") is None,"explicit UNKNOWN")
            count+=1
    require(count==500,"complete original ZIP audit")
    return {"status":"PASS_ORIGINAL_5_ZIP_AND_JSON_BYTES","records":count,"exact":499,"unknown":1,"originalRun":RUN}

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--part",type=int,choices=range(5),default=None)
    p.add_argument("--artifact-dir",type=Path,default=None)
    a=p.parse_args()
    print(json.dumps(validate_original_zip_archives(a.artifact_dir) if a.artifact_dir else validate(part=a.part),sort_keys=True))
