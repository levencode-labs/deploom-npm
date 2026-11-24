"""Capture exact archive identity and the published fields used by the fixture."""
from pathlib import Path, PurePosixPath
import base64,hashlib,json,re,sys,tarfile

FIELDS=("engines","type","exports","main","dependencies","peerDependencies","peerDependenciesMeta",
        "typeScriptVersion","typesVersions","types","typings")

def capture(file, package, version):
    with file.open("rb") as stream:
        digest="sha512-"+base64.b64encode(hashlib.file_digest(stream,"sha512").digest()).decode()
    with tarfile.open(file) as arc:
        charts=[f for f in arc.getnames() if len(PurePosixPath(f).parts)==2 and f.endswith('/package.json')]
        member=arc.getmember(charts[0])
        assert len(charts)==1 and member.isfile() and member.size<1_000_000
        manifest=json.load(arc.extractfile(member))
        assert (manifest["name"], manifest["version"]) == (package,version)
        result={"integrity":digest,**{k:manifest[k] for k in FIELDS if k in manifest}}
        if package in ('@types/jest','@types/react-dom'):
            path=member.name.rsplit('/',1)[0]+'/index.d.ts'
            source=arc.extractfile(path).read().decode('utf-8')
            result["artifacts"]={
                "fakeTimerString":bool(re.search(r'useFakeTimers\(implementation',source)),
                "fakeTimerConfig":bool(re.search(r'useFakeTimers\((?:config|fakeTimersConfig)',source)),
                "toBeCalled":bool(re.search(r'\btoBeCalled\(',source)),
                "toHaveBeenCalled":bool(re.search(r'\btoHaveBeenCalled\(',source)),
                "legacyRender":bool(re.search(r'export (?:function|const) render\b|export \{.*\brender\b',source)),
            }
        if package=='@sentry/browser':
            path=member.name.rsplit('/',1)[0]+'/'+manifest['types']
            source=arc.extractfile(path).read().decode('utf-8')
            result["artifacts"]={
                "sdkName":bool(re.search(r'\bSDK_NAME\b',source)),
                "sdkVersion":bool(re.search(r'\bSDK_VERSION\b',source)),
            }
    return result

if __name__=="__main__":
    directory=Path(sys.argv[1])
    path=Path(__file__).parent/"facts.json"
    current=json.loads(path.read_bytes())
    for package,releases in current.items():
        for version,record in releases.items():
            filename=package.removeprefix("@").replace("/","-")+"-"+version+".tgz"
            assert capture(directory/filename,package,version)==record,(package,version)
    print("Verified",sum(map(len,current.values())),"published package receipts")
