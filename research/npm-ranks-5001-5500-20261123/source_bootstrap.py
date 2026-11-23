#!/usr/bin/env python3
"""Source-only bootstrap of ranks 5001-5500; never probes npm registry."""
import csv
import hashlib
import io
import json
import urllib.request

URL="https://raw.githubusercontent.com/curran/npm-top-packages-dataset/54cf58bc9bafa35fef1c4acf6435d667b4af47c1/npm-top-10000.csv"
SHA256="8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
BLOB="0d45bc4b8bdd2a8016e582af7fef6f3d0f310272"
SIZE=6972515
HEADERS=["name","downloads_last_month","latest","description","license","homepage","repository","keywords","maintainers","created","modified","versions_count","dependencies","devDependencies","peerDependencies"]
def main():
    import argparse
    p=argparse.ArgumentParser()
    p.add_argument("--part",type=int,required=True,choices=range(5))
    part=p.parse_args().part
    opener=urllib.request.build_opener(urllib.request.ProxyHandler({}))
    req=urllib.request.Request(URL,headers={"User-Agent":"DepLoom-source-only/1"})
    with opener.open(req,timeout=30) as r:
        if r.status != 200 or r.geturl()!=URL: raise ValueError("source status/redirect")
        raw=r.read(8000001)
    if len(raw)!=SIZE or hashlib.sha256(raw).hexdigest()!=SHA256: raise ValueError("source sha/size")
    if hashlib.sha1(b"blob "+str(len(raw)).encode()+b"\x00"+raw).hexdigest()!=BLOB: raise ValueError("source blob")
    csvreader=csv.DictReader(io.StringIO(raw.decode("utf-8"),newline=""))
    if csvreader.fieldnames!=HEADERS: raise ValueError("schema")
    names=set()
    prior=None
    rows=0
    selected=0
    for row in csvreader:
        rows+=1
        name=row["name"]
        downloads=int(row["downloads_last_month"])
        if not name or name in names or (prior is not None and downloads>prior): raise ValueError("rank/order")
        names.add(name)
        prior=downloads
        if not (5001+part*100<=rows<=5100+part*100): continue
        item={
          "rank":rows,"csvLine":rows+1,"subbatch":part,
          "name":name,
          "datasetDownloadsLastMonth":downloads,
          "datasetLatestVersion":row["latest"],
          "datasetRepository":row["repository"] or None,
          "datasetHomepage":row["homepage"] or None,
          "datasetPeerDependencies":json.loads(row["peerDependencies"]),
          "datasetDependencyNames":sorted(json.loads(row["dependencies"])),
          "datasetDevDependencyCount":len(json.loads(row["devDependencies"])),
          "upstreamIdentityStatus":"UNVERIFIED",
          "exactRegistryMetadataStatus":"PENDING",
          "migrationAnalysisStatus":"PENDING",
          "firstPartyFixtureReceipt":"NONE_ADDED",
          "productionAdmission":"NOT_REQUESTED",
          "provenance":"PINNED_CSV_ONLY",
        }
        selected+=1
        print("DEPLOOM_SOURCE_ROW="+json.dumps(item,sort_keys=True,separators=(",",":"),ensure_ascii=True),flush=True)
    if rows!=9999 or len(names)!=9999 or selected!=100: raise ValueError("source rows/part count")
    print(f"DEPLOOM_SOURCE_FINISHED part={part} rows={rows} selected={selected}")
if __name__=="__main__":main()
