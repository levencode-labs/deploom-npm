"""Verify the recorded manifest fields against the exact npm tarballs."""
from pathlib import Path
import base64
import hashlib
import json
import sys
import tarfile

root = Path(sys.argv[1])
facts = json.loads((Path(__file__).parent / "facts.json").read_bytes())
for package, releases in facts.items():
    for version, recorded in releases.items():
        filename = package.removeprefix("@").replace("/", "-") + "-" + version + ".tgz"
        file = root / filename
        with file.open("rb") as stream:
            integrity = "sha512-" + base64.b64encode(hashlib.file_digest(stream, "sha512").digest()).decode()
        assert recorded["integrity"] == integrity, (package, version)
        with tarfile.open(file) as archive:
            member = archive.getmember("package/package.json")
            assert member.isfile() and member.size < 1000000
            manifest = json.load(archive.extractfile(member))
        assert (manifest["name"], manifest["version"]) == (package, version)
        for field, value in recorded.items():
            if field != "integrity":
                assert manifest[field] == value, (package, version, field)
print("Verified", sum(len(releases) for releases in facts.values()), "published package manifests")
