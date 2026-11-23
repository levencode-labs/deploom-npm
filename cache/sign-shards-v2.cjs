'use strict';
// Only the protected cache-signing environment may access the Ed25519 key.
const {createHash, createPrivateKey, createPublicKey, sign, verify} = require('node:crypto');
const fs = require('node:fs');
const [indexFile, sigFile, publicPin] = process.argv.slice(2);
if (!indexFile || !sigFile || !publicPin || process.argv.length !== 5) {
  throw Error('Expected index.json index.sig pinned-public-hex');
}
const raw = fs.readFileSync(indexFile);
if (raw.length > 2_000_000) throw Error('v2 index exceeds limit');
const manifest = JSON.parse(raw.toString('utf8'));
if (manifest.schema !== 2 || !Number.isSafeInteger(manifest.revision) ||
    !manifest.buckets || typeof manifest.buckets !== 'object') {
  throw Error('Invalid unsigned v2 index');
}
const secret = process.env.DEPLOOM_RECORDS_SIGNING_KEY;
delete process.env.DEPLOOM_RECORDS_SIGNING_KEY;
if (!secret) throw Error('Missing protected signing key');
const key = createPrivateKey({format:'der', type:'pkcs8', key: Buffer.from(secret, 'base64')});
const publicKey = createPublicKey(key);
const actual = Buffer.from(publicKey.export({format:'jwk'}).x, 'base64url').toString('hex');
if (key.asymmetricKeyType !== 'ed25519' || actual !== fs.readFileSync(publicPin, 'ascii').trim()) {
  throw Error('Signing key does not match pinned consumer key');
}
const message = Buffer.concat([Buffer.from('DepLoom public migration records v2\0'),
  createHash('sha256').update(raw).digest()]);
const signature = sign(null, message, key);
if (!verify(null, message, publicKey, signature) || signature.length !== 64) {
  throw Error('Signature verification failed');
}
fs.writeFileSync(sigFile, signature, {flag: 'wx'});
