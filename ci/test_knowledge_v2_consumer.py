"""Source-exact producer -> actual Ed25519 signature -> pinned MCP native client."""
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
corpus = (root / "knowledge/v2/records.json").read_bytes()
# The PR tree is untrusted. The source-of-truth fixture must already exist
# in the trusted upstream main reference, not merely in this PR's head.
trusted_main = subprocess.check_output(
    ["git", "rev-parse", "--verify", "refs/remotes/origin/main"],
    text=True).strip()
head_sha = subprocess.check_output(["git", "rev-parse", "HEAD"], text=True).strip()
subprocess.run(["git", "merge-base", "--is-ancestor", trusted_main, head_sha],
               check=True, timeout=30)
revision = 42

with tempfile.TemporaryDirectory() as tmp:
    scratch = Path(tmp)
    site = scratch / "site"
    result = write_shards(corpus, site, revision=revision, trusted_commit=trusted_main)
    assert result["schema"] == 2 and result["recordCount"] >= 1
    key = Ed25519PrivateKey.generate()
    pkcs8 = key.private_bytes(serialization.Encoding.DER, serialization.PrivateFormat.PKCS8,
                              serialization.NoEncryption())
    pub = key.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    pin = scratch / "publisher.hex"
    pin.write_text(pub.hex())
    env = dict(os.environ, DEPLOOM_RECORDS_SIGNING_KEY=base64.b64encode(pkcs8).decode("ascii"))
    subprocess.run(["node", str(root / "cache/sign-shards-v2.cjs"), str(site / "index.json"),
                    str(site / "index.sig"), str(pin)], check=True, timeout=30, env=env)
    original = shared_records_v2.public_key_file
    shared_records_v2.public_key_file = pin
    try:
        signed_index = (site / "index.json").read_bytes()
        sig = (site / "index.sig").read_bytes()
        parsed = shared_records_v2.verified_index(signed_index, sig)
        requests = []
        resources = {shared_records_v2.BASE + "index.json": signed_index,
                     shared_records_v2.BASE + "index.sig": sig}
        for descs in parsed["buckets"].values():
            for desc in descs:
                resources[shared_records_v2.BASE + desc["path"]] = (site / desc["path"]).read_bytes()
        def fetch(url, limit, etag=None):
            assert url in resources, "Unexpected outbound URL: " + url
            requests.append(url)
            raw = resources[url]
            if len(raw) > limit:
                raise ValueError("Oversized response")
            return raw, None
        local = scratch / "client"
        assert shared_records_v2.refresh(local, fetch=fetch)
        hit = shared_records.lookup(local, "react-dom", "18.2.0", "18.3.1")
        assert hit["snapshotSource"] == "verified-pages", hit
        assert hit["snapshotSchema"] == 2 and hit["status"] == "found"
        assert hit["recipes"] == [], hit
        assert any(x["id"] == "align-react-renderers" and x["kind"] == "incompatibility"
                   and x["matchStrength"] == "verified-exact-transition"
                   for x in hit["knowledge"]), hit
        trial = shared_records.lookup(local, "react-dom", "18.1.0", "18.3.2")
        assert trial["knowledge"][0]["matchStrength"] == "major-line-candidate"
        assert trial["knowledge"][0]["requiresProjectVerification"] is True
        outside = shared_records.lookup(local, "react-dom", "17.0.0", "18.3.1")
        assert outside["snapshotSource"] == "verified-pages", outside
        assert outside["status"] in {"found", "no-matching-record"}, outside
        assert all(x["id"] != "align-react-renderers" for x in outside["knowledge"]), outside
        assert len(requests) == 2 + sum(len(x) for x in parsed["buckets"].values())
        # Signed equal-revision replacement must be rejected even if signature is valid.
        mutated = json.loads(signed_index)
        mutated["sourceSha256"] = "e" * 64
        replacement = (json.dumps(mutated, sort_keys=True, separators=(",", ":")) + "\n").encode()
        resources[shared_records_v2.BASE + "index.json"] = replacement
        resources[shared_records_v2.BASE + "index.sig"] = key.sign(
            shared_records_v2.DOMAIN + hashlib.sha256(replacement).digest())
        assert not shared_records_v2.refresh(local, fetch=fetch)
        assert shared_records.lookup(local, "react-dom", "18.2.0", "18.3.1")["status"] == "found"
    finally:
        shared_records_v2.public_key_file = original
print("knowledge-v2 native producer / Ed25519 / MCP consumer PASS; no microrecipes")
