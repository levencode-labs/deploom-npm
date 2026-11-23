#!/usr/bin/env python3
"""Source-only pin for npm dataset ranks 5501-6000; never queries npm."""
import argparse
import csv
import hashlib
import io
import json
import urllib.request

URL = "https://raw.githubusercontent.com/curran/npm-top-packages-dataset/54cf58bc9bafa35fef1c4acf6435d667b4af47c1/npm-top-10000.csv"
SHA256 = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
BLOB = "0d45bc4b8bdd2a8016e582af7fef6f3d0f310272"
SIZE = 6972515
CSV_ROWS = 9999
START = 5501
END = 6000
PART_SIZE = 100
HEADERS = ["name","downloads_last_month","latest","description","license","homepage","repository","keywords","maintainers","created","modified","versions_count","dependencies","devDependencies","peerDependencies"]


def source_bytes(raw):
    if len(raw) != SIZE or hashlib.sha256(raw).hexdigest() != SHA256:
        raise ValueError("pinned source SHA-256/size mismatch")
    oid = hashlib.sha1(b"blob " + str(len(raw)).encode("ascii") + b"\x00" + raw).hexdigest()
    if oid != BLOB:
        raise ValueError("pinned source Git blob mismatch")
    return raw


def part_for_rank(rank):
    if type(rank) is not int or not START <= rank <= END:
        raise ValueError("rank outside pinned range")
    return (rank - START) // PART_SIZE


def make_record(rank, row):
    return {
        "rank": rank,
        "csvLine": rank + 1,
        "subbatch": part_for_rank(rank),
        "name": row["name"],
        "datasetDownloadsLastMonth": int(row["downloads_last_month"]),
        "datasetLatestVersion": row["latest"],
        "datasetRepository": row["repository"] or None,
        "datasetHomepage": row["homepage"] or None,
        "datasetPeerDependencies": json.loads(row["peerDependencies"]),
        "datasetDependencyNames": sorted(json.loads(row["dependencies"])),
        "datasetDevDependencyCount": len(json.loads(row["devDependencies"])),
        "exactRegistryMetadataStatus": "PENDING",
        "firstPartyFixtureReceipt": "NONE_ADDED",
        "migrationAnalysisStatus": "PENDING",
        "productionAdmission": "NOT_REQUESTED",
        "provenance": "PINNED_CSV_ONLY",
        "upstreamIdentityStatus": "UNVERIFIED",
    }


def select_part(raw, part):
    if type(part) is not int or part not in range(5):
        raise ValueError("part must be 0..4")
    source_bytes(raw)
    reader = csv.DictReader(io.StringIO(raw.decode("utf-8"), newline=""))
    if reader.fieldnames != HEADERS:
        raise ValueError("unexpected CSV schema")
    names = set()
    previous_downloads = None
    selected = []
    count = 0
    for row in reader:
        count += 1
        name = row["name"]
        downloads = int(row["downloads_last_month"])
        if not name or name in names or (previous_downloads is not None and downloads > previous_downloads):
            raise ValueError("duplicate name or unexpected rank order")
        names.add(name)
        previous_downloads = downloads
        if START + part * PART_SIZE <= count <= START + (part + 1) * PART_SIZE - 1:
            selected.append(make_record(count, row))
    if count != CSV_ROWS or len(names) != CSV_ROWS or len(selected) != PART_SIZE:
        raise ValueError("source row count or selected part mismatch")
    first = START + part * PART_SIZE
    if [x["rank"] for x in selected] != list(range(first, first + PART_SIZE)):
        raise ValueError("rank gap or overlap")
    return selected


def download_source():
    req = urllib.request.Request(URL, headers={"User-Agent": "DepLoom-source-only/1"})
    opener = urllib.request.build_opener(urllib.request.ProxyHandler({}))
    with opener.open(req, timeout=30) as response:
        if response.status != 200 or response.geturl() != URL:
            raise ValueError("source status or redirect mismatch")
        raw = response.read(8_000_001)
    return source_bytes(raw)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--part", type=int, required=True, choices=range(5))
    args = parser.parse_args()
    records = select_part(download_source(), args.part)
    print("BATCH12_SOURCE_PART=" + str(args.part) + " JSON=" + json.dumps(
        {"part": args.part, "records": records}, sort_keys=True, separators=(",", ":")
    ))


if __name__ == "__main__":
    main()
