"""Rebuild or verify a manifest and shipped-source receipt."""
from pathlib import Path
import base64
import hashlib
import json
import re
import sys
import tarfile

FIELDS=("engines","type","exports","main","dependencies","peerDependencies","peerDependenciesMeta")

def published_file(archive, suffix):
    matches=[name for name in archive.getnames() if name.endswith(suffix)]
    if not matches:
        return ""
    name=min(matches,key=len)
    member=archive.getmember(name)
    assert member.isfile() and member.size<1_000_000, name
    return archive.extractfile(member).read().decode('utf-8')

def observe(archive, package):
    if package!="nx":
        return {}
    project_api=published_file(archive,"/project-graph/plugins/public-api.d.ts")
    migrations=json.loads(published_file(archive,"/migrations.json") or "{}").get("generators",{})
    selected={}
    for name in ("19-2-0-move-graph-cache-directory","remove-legacy-cache","remove-custom-tasks-runner","24-0-0-enable-legacy-affected"):
        if name in migrations:
            migration=migrations[name]
            impl=published_file(archive,"/"+migration["implementation"].lstrip("./")+".js")
            selected[name]={"version":migration["version"],"description":migration["description"],
                            "implementation":bool(impl),
                            "writesAffectedLegacy":bool(re.search(r"legacy:\s*true",impl))}
    return {
        "createNodesV1": bool(re.search(r"export type CreateNodes[< ]",project_api)),
        "createNodesV2": bool(re.search(r"export type CreateNodesV2[< ]",project_api)),
        "migrations":selected,
    }

def capture(file, package, version):
    with file.open("rb") as stream:
        digest="sha512-"+base64.b64encode(hashlib.file_digest(stream,"sha512").digest()).decode()
    with tarfile.open(file) as archive:
        member=archive.getmember("package/package.json")
        assert member.isfile() and member.size<1_000_000
        manifest=json.load(archive.extractfile(member))
        assert (manifest["name"], manifest["version"]) == (package, version)
        case={"integrity":digest,**{k:manifest[k] for k in FIELDS if k in manifest}}
        if details := observe(archive,package):
            case["artifacts"]=details
    return case

if __name__=="__main__":
    directory=Path(sys.argv[1])
    path=Path(__file__).parent/"facts.json"
    current=json.loads(path.read_bytes())
    for package,versions in current.items():
        for version,record in versions.items():
            filename=package.removeprefix("@").replace("/","-")+"-"+version+".tgz"
            assert capture(directory/filename,package,version)==record,(package,version)
    print("Verified",sum(map(len,current.values())),"published package receipts")
