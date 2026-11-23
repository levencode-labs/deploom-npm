"""Bind the tested tarball to the released Core, MCP, Skill and data contracts."""
import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import tarfile


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("archive", type=Path)
    parser.add_argument("wheel_lock", type=Path)
    parser.add_argument("output", type=Path)
    parser.add_argument("native", type=Path)
    args = parser.parse_args()
    upstream = json.loads(args.wheel_lock.read_bytes())
    with tarfile.open(args.archive) as archive:
        pkg = json.load(archive.extractfile("package/package.json"))
        runtime = json.load(archive.extractfile("package/runtime-manifest.json"))
    if (pkg["name"] != "@levencode/deploom" or pkg["version"] != runtime["cliVersion"]
            or runtime["mcpWheelSha256"] != upstream["sha256"] or runtime["mcpVersion"] != upstream["version"]
            or runtime["coreRevision"] != upstream["coreRevision"]
            or os.environ["GITHUB_REF_NAME"] != "npm-v" + pkg["version"]):
        raise ValueError("Package identity does not match reviewed release inputs and tag")
    with args.archive.open("rb") as stream:
        integrity = hashlib.file_digest(stream, "sha512").digest()
    result = dict(schema=1, name=pkg["name"], version=pkg["version"], tarball=args.archive.name,
                  integrity="sha512-" + base64.b64encode(integrity).decode(), bytes=args.archive.stat().st_size,
                  repository="levencode-labs/deploom-npm", commit=os.environ["GITHUB_SHA"],
                  platform="win32-x64", python=runtime["python"], coreRevision=runtime["coreRevision"],
                  coreVersion=runtime["coreVersion"], mcp=upstream, skill=runtime["skill"],
                  solverSha256=runtime["solverSha256"],
                  dataSchemas={"osv": 1, "history": 1, "knowledge": 2}, blueprintSchema=runtime["blueprintSchemaVersion"])
    platform_archives = []
    for target in ("linux-x64", "linux-arm64", "darwin-arm64"):
        filename = f"deploom-{target}-{pkg['version']}.tgz"
        file = args.native / filename
        with tarfile.open(file) as tar:
            package = json.load(tar.extractfile("package/package.json"))
            receipt = json.load(tar.extractfile("package/posix-offline.json"))
            if (package["name"] != pkg["name"] or package["version"] != pkg["version"]
                    or package["os"] != [target.split("-")[0]] or package["cpu"] != [target.split("-")[1]]
                    or receipt["target"] != target or receipt["version"] != pkg["version"]
                    or hashlib.file_digest(tar.extractfile("package/portable-runtime.tar.gz"), "sha256").hexdigest() != receipt["sha256"]):
                raise ValueError(f"Native package identity or runtime hash mismatch: {filename}")
        with file.open("rb") as stream:
            digest = base64.b64encode(hashlib.file_digest(stream, "sha512").digest()).decode()
        platform_archives.append(dict(platform=target, tarball=filename, bytes=file.stat().st_size, integrity="sha512-" + digest))
    if set(args.native.glob("*.tgz")) != {args.native / entry["tarball"] for entry in platform_archives}:
        raise ValueError("Unexpected native archive in release inputs")
    result["platformArchives"] = platform_archives
    args.output.write_text(json.dumps(result, sort_keys=True, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
