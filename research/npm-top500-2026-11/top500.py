#!/usr/bin/env python3
"""Read-only, bounded top-500 public npm research. No v2 admission or signing."""
from __future__ import annotations

import argparse
import csv
import hashlib
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INDEX = ROOT / "index.json"
SOURCE_COMMIT = "54cf58bc9bafa35fef1c4acf6435d667b4af47c1"
CSV_SHA256 = "8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82"
CSV_BLOB_SHA1 = "0d45bc4b8bdd2a8016e582af7fef6f3d0f310272"
CSV_BYTES = 6_972_515
CSV_ROWS = 9_999
SOURCE_URL = (
    "https://raw.githubusercontent.com/curran/npm-top-packages-dataset/"
    + SOURCE_COMMIT + "/npm-top-10000.csv"
)
MAX_CSV_DOWNLOAD = 8_000_000
MAX_REGISTRY_RESPONSE = 500_000
PKG = re.compile(r"(?:@[a-z0-9][a-z0-9._~-]{0,79}/)?[a-z0-9][a-z0-9._~-]{0,99}\Z")
FIELDS = [
    "name", "downloads_last_month", "latest", "description", "license",
    "homepage", "repository", "keywords", "maintainers", "created",
    "modified", "versions_count", "dependencies", "devDependencies",
    "peerDependencies",
]


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def direct_opener():
    """Explicitly ignore ambient proxies and never attach credentials or cookies."""
    return urllib.request.build_opener(urllib.request.ProxyHandler({}), NoRedirect())


def source_bytes(raw):
    if len(raw) != CSV_BYTES or hashlib.sha256(raw).hexdigest() != CSV_SHA256:
        raise ValueError("Pinned CSV SHA-256 or size mismatch")
    oid = hashlib.sha1(b"blob " + str(len(raw)).encode() + b"\x00" + raw).hexdigest()
    if oid != CSV_BLOB_SHA1:
        raise ValueError("Pinned CSV Git blob SHA-1 mismatch")
    return raw


def download_source():
    req = urllib.request.Request(
        SOURCE_URL, headers={"Accept": "text/csv", "User-Agent": "DepLoom-public-research/1"}
    )
    with direct_opener().open(req, timeout=30) as response:
        if response.status != 200 or response.geturl() != SOURCE_URL:
            raise ValueError("Unexpected source status or redirect")
        data = response.read(MAX_CSV_DOWNLOAD + 1)
    if len(data) > MAX_CSV_DOWNLOAD:
        raise ValueError("Pinned source exceeds download bound")
    return source_bytes(data)


def manifest():
    obj = json.loads(INDEX.read_text(encoding="utf-8"))
    source = obj.get("source", {})
    if obj.get("schema") != "deploom.research.npm-top500.v1":
        raise ValueError("Unknown inventory schema")
    if obj.get("authority") != "RESEARCH_ONLY_NOT_V2_ADMISSION":
        raise ValueError("Inventory authority must be research only")
    for k, expected in (
        ("commit", SOURCE_COMMIT), ("sha256", CSV_SHA256),
        ("gitBlobSha1", CSV_BLOB_SHA1), ("bytes", CSV_BYTES),
        ("rows", CSV_ROWS), ("uniqueNames", CSV_ROWS), ("rawUrl", SOURCE_URL)
    ):
        if source.get(k) != expected:
            raise ValueError("Unpinned source field: " + k)
    items = obj.get("items")
    selection = obj.get("selection", {})
    counts = obj.get("counts", {})
    if (
        not isinstance(items, list) or len(items) != 500
        or selection.get("algorithm") != "CSV_PHYSICAL_ORDER_FIRST_UNIQUE"
        or selection.get("startRank") != 1
        or selection.get("endRank") != 500
        or selection.get("subbatchSize") != 100
        or selection.get("subbatches") != 5
        or selection.get("continuationStartRank") != 501
        or counts.get("selected") != 500
        or counts.get("officialRegistryVerifiedInCommittedManifest") != 0
        or counts.get("fixtureReceiptsAdmitted") != 0
        or counts.get("productionV2Adds") != 0
    ):
        raise ValueError("Invalid batch boundaries or false admission count")
    seen = set()
    for i, item in enumerate(items):
        if (
            type(item.get("rank")) is not int or item["rank"] != i + 1
            or item.get("csvLine") != i + 2
            or item.get("subbatch") != i // 100
            or not isinstance(item.get("name"), str)
            or not PKG.fullmatch(item["name"])
            or item["name"] in seen
            or item.get("exactRegistryMetadataStatus") != "PENDING"
            or item.get("productionAdmission") != "NOT_REQUESTED"
            or item.get("provenance") != "PINNED_CSV_ONLY"
        ):
            raise ValueError("Invalid, duplicated or falsely admitted row " + str(i + 1))
        seen.add(item["name"])
    return obj


def verify_inventory(raw, obj):
    source_bytes(raw)
    stream = io.StringIO(raw.decode("utf-8"), newline="")
    reader = csv.DictReader(stream)
    if reader.fieldnames != FIELDS:
        raise ValueError("Unexpected source CSV schema")
    first = []
    seen = set()
    count = 0
    prev_downloads = None
    for row in reader:
        count += 1
        name = row["name"]
        downloads = int(row["downloads_last_month"])
        if not name or name in seen or (prev_downloads is not None and downloads > prev_downloads):
            raise ValueError("Bad CSV name, duplicate or unexpected source rank")
        prev_downloads = downloads
        seen.add(name)
        if len(first) >= 500:
            continue
        expected = obj["items"][len(first)]
        tests = {
            "rank": count,
            "csvLine": count + 1,
            "subbatch": (count - 1) // 100,
            "name": name,
            "datasetDownloadsLastMonth": downloads,
            "datasetLatestVersion": row["latest"],
            "datasetRepository": row["repository"] or None,
            "datasetHomepage": row["homepage"] or None,
            "datasetPeerDependencies": json.loads(row["peerDependencies"]),
            "datasetDependencyNames": sorted(json.loads(row["dependencies"])),
            "datasetDevDependencyCount": len(json.loads(row["devDependencies"])),
        }
        for k, v in tests.items():
            if expected[k] != v:
                raise ValueError("Source-exact selection mismatch at " + str(count) + ": " + k)
        first.append(name)
    if count != CSV_ROWS or len(seen) != CSV_ROWS or len(first) != 500:
        raise ValueError("CSV row/unique count or batch completeness mismatch")
    return {"sourceRows": count, "uniqueNames": len(seen), "batch": len(first),
            "subbatches": 5, "nextStartRank": 501, "status": "PINNED_DISCOVERY_VERIFIED"}


def _unknown(row, url, reason):
    return {
        "rank": row["rank"], "package": row["name"],
        "version": row["datasetLatestVersion"], "url": url,
        "status": reason, "admission": "RESEARCH_ONLY", "engines": None,
        "peerDependencies": None, "peerDependenciesMeta": None, "sourceSha256": None,
    }


def probe_one(row, *, opener=None, sleeper=time.sleep, attempts=3):
    """An exact public-version identity receipt is NOT an upgrade or fixture check."""
    name, version = row["name"], row["datasetLatestVersion"]
    url = ("https://registry.npmjs.org/"
           + urllib.parse.quote(name, safe="")
           + "/" + urllib.parse.quote(version, safe=""))
    if not PKG.fullmatch(name) or not isinstance(version, str) or not version:
        return _unknown(row, url, "UNKNOWN_INVALID_SELECTION")
    req = urllib.request.Request(
        url, headers={"Accept": "application/json", "User-Agent": "DepLoom-public-research/1"}
    )
    opener = opener if opener is not None else direct_opener()
    for attempt in range(attempts):
        try:
            # Across two CI subbatches and two workers each, avoid npm request bursts.
            sleeper(0.5)
            with opener.open(req, timeout=15) as response:
                if response.status != 200 or response.geturl() != url:
                    return _unknown(row, url, "UNKNOWN_REDIRECT_OR_STATUS")
                body = response.read(MAX_REGISTRY_RESPONSE + 1)
            if len(body) > MAX_REGISTRY_RESPONSE:
                return _unknown(row, url, "UNKNOWN_OVERSIZE")
            obj = json.loads(body.decode("utf-8"))
            if not isinstance(obj, dict) or obj.get("name") != name or obj.get("version") != version:
                return _unknown(row, url, "UNKNOWN_IDENTITY_MISMATCH")
            peers = obj.get("peerDependencies", {})
            engines = obj.get("engines", {})
            meta = obj.get("peerDependenciesMeta", {})
            if any(not isinstance(x, dict) for x in (peers, engines, meta)):
                return _unknown(row, url, "UNKNOWN_INVALID_METADATA")
            return {
                "rank": row["rank"], "package": name, "version": version,
                "url": url, "status": "PUBLIC_EXACT_VERSION_OBSERVED",
                "admission": "RESEARCH_ONLY", "sourceSha256": hashlib.sha256(body).hexdigest(),
                "peerDependencies": peers, "peerDependenciesMeta": meta, "engines": engines,
                "deprecated": bool(obj.get("deprecated")),
                "note": "Exact version metadata only; no transition or project tests",
            }
        except urllib.error.HTTPError as e:
            if e.code in (429, 500, 502, 503, 504) and attempt + 1 < attempts:
                sleeper(min(2 ** attempt * 2, 8))
                continue
            return _unknown(row, url, "UNKNOWN_HTTP_" + str(e.code))
        except (urllib.error.URLError, TimeoutError, OSError) as e:
            if attempt + 1 < attempts:
                sleeper(min(2 ** attempt * 2, 8))
                continue
            return _unknown(row, url, "UNKNOWN_TRANSPORT_" + type(e).__name__)
        except (ValueError, UnicodeError, json.JSONDecodeError):
            return _unknown(row, url, "UNKNOWN_MALFORMED_RESPONSE")
    return _unknown(row, url, "UNKNOWN_EXHAUSTED_RETRIES")


def run_part(part, output, obj):
    if part not in range(5):
        raise ValueError("Subbatch must be 0..4")
    rows = obj["items"][part * 100:(part + 1) * 100]
    if len(rows) != 100 or any(r["subbatch"] != part for r in rows):
        raise ValueError("Subbatch coverage mismatch")
    with ThreadPoolExecutor(max_workers=2) as pool:
        results = list(pool.map(probe_one, rows))
    results.sort(key=lambda x: x["rank"])
    if [r["rank"] for r in results] != list(range(part * 100 + 1, part * 100 + 101)):
        raise ValueError("Subbatch overlap/gap")
    counts = dict(sorted(Counter(r["status"] for r in results).items()))
    receipt = {
        "schema": "deploom.research.registry-receipts.v1",
        "authority": "RESEARCH_ONLY_NOT_V2_ADMISSION",
        "datasetCsvSha256": CSV_SHA256,
        "datasetCommit": SOURCE_COMMIT,
        "subbatch": part, "firstRank": part * 100 + 1,
        "lastRank": (part + 1) * 100, "itemCount": 100,
        "statusCounts": counts, "records": results,
    }
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(receipt, indent=2, sort_keys=True, ensure_ascii=True) + "\n",
                      encoding="utf-8")
    print(json.dumps({"subbatch": part, "firstRank": receipt["firstRank"],
                      "lastRank": receipt["lastRank"], "count": 100,
                      "statuses": counts, "artifact": str(output)}, sort_keys=True))
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write("### Public npm metadata — subbatch " + str(part) + "\n\n")
            f.write("Ranks " + str(receipt["firstRank"]) + "–" + str(receipt["lastRank"])
                    + "; research only, **0 admitted to production**.\n\n")
            for k, v in counts.items():
                f.write("- " + k + ": " + str(v) + "\n")
    return receipt


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    sub = ap.add_subparsers(dest="command", required=True)
    inv = sub.add_parser("inventory", help="Verify pinned CSV bytes and full 500-row selection")
    src = inv.add_mutually_exclusive_group(required=True)
    src.add_argument("--download", action="store_true")
    src.add_argument("--csv", type=Path)
    probe = sub.add_parser("probe", help="Run one bounded, read-only registry subbatch")
    probe.add_argument("--part", type=int, required=True, choices=range(5))
    probe.add_argument("--output", type=Path, required=True)
    opts = ap.parse_args()
    obj = manifest()
    if opts.command == "inventory":
        raw = download_source() if opts.download else opts.csv.read_bytes()
        print(json.dumps(verify_inventory(raw, obj), sort_keys=True))
    else:
        run_part(opts.part, opts.output, obj)


if __name__ == "__main__":
    main()
