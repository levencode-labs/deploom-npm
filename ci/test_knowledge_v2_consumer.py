"""Independent producer -> signer -> exact MCP consumer compatibility smoke."""
import base64
import hashlib
import json
import os
import subprocess
import tempfile
from pathlib import Path

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PrivateKey

from deploom_mcp import shared_records, shared_records_v2
from shards_v2 import write_shards

root = Path(__file__).resolve().parents[1]
input_data = {"schema": 1, "revision": 29}
for kind in ("history", "knowledge"):
    input_data[kind] = json.loads((root / "docs/v1" / (kind + ".json")).read_bytes())
raw = (json.dumps(input_data, sort_keys=True) + "\n").encode()

with tempfile.TemporaryDirectory() as temp:
    folder = Path(temp)
    site = folder / "site"
    index = write_shards(raw, site)
    assert index["schema"] == 2 and index["recordCount"] == 3
    key = Ed25519PrivateKey.generate()
    private_der = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
                                    serialization.NoEncryption())
    pub = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    pin = folder / "public.hex"
    pin.write_text(pub.hex(), encoding="ascii")
    env = dict(os.environ, DEPLOOM_RECORDS_SIGNING_KEY=base64.b64encode(private_der).decode("ascii"))
    subprocess.run(["node", str(root / "cache/sign-shards-v2.cjs"), str(site / "index.json"),
                    str(site / "index.sig"), str(pin)],
                   cwd=root, env=env, check=True, timeout=30)
    old_key = shared_records_v2.public_key_file
    shared_records_v2.public_key_file = pin
    try:
        index_bytes = (site / "index.json").read_bytes()
        sig_bytes = (site / "index.sig").read_bytes()
        confirmed = shared_records_v2.verified_index(index_bytes, sig_bytes)
        assert confirmed["recordCount"] == 3
        resources = {shared_records_v2.BASE + "index.json": index_bytes,
                     shared_records_v2.BASE + "index.sig": sig_bytes}
        for descs in confirmed["buckets"].values():
            for desc in descs:
                resources[shared_records_v2.BASE + desc["path"]] = (site / desc["path"]).read_bytes()
        observed = []
        def fetch(url, limit, etag=None):
            assert url in resources, "Unexpected outbound URL " + url
            observed.append(url)
            payload = resources[url]
            if len(payload) > limit:
                raise ValueError("Unexpected size")
            return payload, None
        records = folder / "local-records"
        assert shared_records_v2.refresh(records, fetch=fetch)
        hit = shared_records.lookup(records, "react-dom", "18.2.0", "18.3.1")
        assert hit["snapshotSource"] == "verified-pages" and hit["snapshotSchema"] == 2
        assert hit["status"] == "found"
        assert any(r["id"] == "align-react-renderers" for r in hit["recipes"])
        miss = shared_records.lookup(records, "react-dom", "18.2.0", "19.0.0")
        assert miss["status"] == "no-matching-record"
        assert len(observed) == 2 + sum(len(v) for v in confirmed["buckets"].values())
        # New signed edition with the same revision must not substitute a prior digest.
        changed = json.loads(index_bytes)
        changed["sourceSha256"] = "e" * 64
        changed_bytes = (json.dumps(changed, sort_keys=True, separators=(",", ":")) + "\n").encode()
        resources[shared_records_v2.BASE + "index.json"] = changed_bytes
        resources[shared_records_v2.BASE + "index.sig"] = key.sign(
            shared_records_v2.DOMAIN + hashlib.sha256(changed_bytes).digest())
        assert not shared_records_v2.refresh(records, fetch=fetch)
        assert shared_records.lookup(records, "react-dom", "18.2.0", "18.3.1")["status"] == "found"
    finally:
        shared_records_v2.public_key_file = old_key
print("knowledge-v2 producer/signer/consumer PASS; verified-pages schema=2")
