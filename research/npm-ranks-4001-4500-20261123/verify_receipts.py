#!/usr/bin/env python3
"""Offline-only verification of original Batch 09 receipts; no HTTP or npm requests."""
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
RUN=45230313707
INDEX_BLOB="666089be640122fa6aafb870081b87a7381c2b71"
EXPECTED=[
 (14846207207,"fc94e6aa7e69e98314e20df36bc47b4535ba2b26d6802f6a6421950a5e7a3f77","b623d9e6dd22866ba4519a34662c307b9d004e7fa7f8e1b56714838ff0cd7bcf",59883,8870),
 (14846157153,"511f11238441f6ad3c567f8433f865cca90046dc99e1ecf14fb99596a5f13385","9b896ccf38c5086f71f3b323aa83934c677a29f31493dfa796f82306d464b1d6",58100,8882),
 (14847207790,"eb9759f3e1f31130ea6999ac9fa908aa12917056368450c6cff544e7e4e49a0b","5d7eb4db51b3a91a0f5f3fd17ef91755f31158a97cc3ea2dfd4b8a45c55c2608",56693,8504),
 (14845344445,"f84bec179b53718399213aeeeddb1591eab37cd2fd6a53d036e27d1580996a02","8b21b7ebb56f2c94e9b5b9ada7233bfc71094d31e04ff69697abebb0c9ed60f1",57304,8497),
 (14846202299,"cce8bc8f74f4954a72dfaac6aefac463a3385cde96f4034eb34195ce4a1bc92e","fceb54cfa43c82a06ed509a35751deec2d9c8f61d220bac07ec6f01a695fea57",57468,8544)
]
CSV_SHA="8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"

def require(ok,message):
    if not ok:
        raise ValueError(message)

def sha256(x):
    return hashlib.sha256(x).hexdigest()

def git_blob(raw):
    return hashlib.sha1(b"blob "+str(len(raw)).encode("ascii")+b"\\x00"+raw).hexdigest()

def validate(ledger=None,index=None,*,part=None):
    if ledger is None:
        ledger=json.loads((ROOT/"registry-receipts-manifest.json").read_text(encoding="utf-8"))
    if index is None:
        index=json.loads((ROOT/"index.json").read_text(encoding="utf-8"))
    require(ledger.get("schema")=="deploom.research.npm-ranks-4001-4500-coverage.v1","schema")
    require(ledger.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","authority")
    require(index.get("schema")=="deploom.research.npm-ranks-4001-4500.v1","index schema")
    require(ledger.get("originalIndexGitBlobSha1")==INDEX_BLOB and git_blob((ROOT/"index.json").read_bytes())==INDEX_BLOB,"index blob")
    require(ledger.get("sourceCsvSha256")==index["source"]["sha256"]==CSV_SHA,"source SHA")
    require(ledger.get("sourceCommit")==index["source"]["commit"]=="54cf58bc9bafa35fef1c4acf6435d667b4af47c1","source commit")
    require(ledger.get("sourceCsvGitBlobSha1")==index["source"]["gitBlobSha1"]=="0d45bc4b8bdd2a8016e582af7fef6f3d0f310272","source git blob")
    require(ledger.get("selection")=={"startRank":4001,"endRank":4500,"subbatchSize":100,"continuationStartRank":4501},"selection")
    require(ledger.get("workflowRun")==RUN and ledger.get("workflowResult")=="SUCCESS_ALL_6_JOBS","original run")
    require(ledger.get("testedCodeCommit")=="2e64891b7a717e687b795b8a1e32d9418e4346e6","original code HEAD")
    incident=ledger.get("duplicateRun",{})
    require(incident.get("id")==45230379231 and incident.get("disposition")=="DISCLOSED_NONAUTHORITATIVE_DO_NOT_REPLAY","duplicate run disclosure")
    require(ledger.get("recordCount")==500 and ledger.get("verifiedMetadataCount")==499 and ledger.get("unknownCount")==1,"counts")
    require(ledger.get("statusCounts")=={"PUBLIC_EXACT_VERSION_OBSERVED":499,"UNKNOWN_INVALID_METADATA":1},"status counts")
    require(ledger.get("unknowns")==[{"rank":4187,"package":"levenshtein","version":"1.0.5","status":"UNKNOWN_INVALID_METADATA"}],"historical UNKNOWN")
    require(ledger.get("productionV2Adds")==0 and ledger.get("newTrustedFixtureCount")==0 and ledger.get("signingPerformed") is False,"no admission")
    require(ledger.get("cumulative")=={"exactMetadata":4494,"unknowns":6,"nextRank":4501},"cumulative")
    rows=ledger.get("items")
    items=index.get("items")
    require(isinstance(rows,list) and isinstance(items,list) and len(rows)==len(items)==500,"items")
    require([x.get("rank") for x in rows]==list(range(4001,4501)),"ordered ranks")
    require(len({x.get("package") for x in rows})==500,"duplicate names")
    for row,item in zip(rows,items):
        rank=row["rank"]
        expected_status="UNKNOWN_INVALID_METADATA" if rank==4187 else "PUBLIC_EXACT_VERSION_OBSERVED"
        require(row.get("package")==item.get("name") and row.get("version")==item.get("datasetLatestVersion"),"identity")
        require(row.get("subbatch")==item.get("subbatch")==((rank-4001)//100),"subbatch")
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
        require(a.get("fromRank")==4001+i*100 and a.get("toRank")==4100+i*100,"artifact scope")
        require(a.get("resultFile")==f"part-{i}.json","JSON member")
        require(a.get("artifactURL")==f"https://github.com/levencode-labs/deploom-npm/actions/runs/{RUN}/artifacts/{aid}","artifact URL")
        require(a.get("counts")==({"PUBLIC_EXACT_VERSION_OBSERVED":99,"UNKNOWN_INVALID_METADATA":1} if i==1 else {"PUBLIC_EXACT_VERSION_OBSERVED":100}),"artifact counts")
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
        archive=directory/f"npm-ranks-4001-4500-part-{part}.zip"
        if not archive.is_file():
            archive=directory/f"batch09-original-part-{part}.zip"
        raw=archive.read_bytes()
        require(len(raw)==a["zipBytes"] and sha256(raw)==a["zipSha256"],"original ZIP byte hash")
        with zipfile.ZipFile(io.BytesIO(raw)) as z:
            require(z.namelist()==[f"part-{part}.json"],"ZIP member list")
            js=z.read(f"part-{part}.json")
        require(len(js)==a["jsonBytes"] and sha256(js)==a["sha256"],"original JSON byte hash")
        obj=json.loads(js)
        require(obj.get("schema")=="deploom.research.registry-receipts.v1" and obj.get("authority")=="RESEARCH_ONLY_NOT_V2_ADMISSION","JSON schema")
        require(obj.get("datasetCsvSha256")==CSV_SHA and obj.get("datasetCommit")==ledger["sourceCommit"],"JSON pinned source")
        require((obj.get("subbatch"),obj.get("firstRank"),obj.get("lastRank"),obj.get("itemCount"))==(part,4001+part*100,4100+part*100,100),"JSON scope")
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
                require(expected["rank"]==4187 and status=="UNKNOWN_INVALID_METADATA" and rec.get("sourceSha256") is None,"explicit UNKNOWN")
            count+=1
    require(count==500,"complete original ZIP audit")
    return {"status":"PASS_ORIGINAL_5_ZIP_AND_JSON_BYTES","records":count,"exact":499,"unknown":1,"originalRun":RUN}

if __name__=="__main__":
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument("--part",type=int,choices=range(5),default=None)
    p.add_argument("--artifact-dir",type=Path,default=None)
    a=p.parse_args()
    print(json.dumps(validate_original_zip_archives(a.artifact_dir) if a.artifact_dir else validate(part=a.part),sort_keys=True))
