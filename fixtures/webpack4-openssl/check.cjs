const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const bundle = String.raw`
  const assert = require('node:assert/strict');
  const { mkdtempSync, rmSync, rmdirSync, writeFileSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const webpack = require('webpack');

  assert.equal(webpack.version, process.argv[1]);
  const work = mkdtempSync(join(tmpdir(), 'deploom-webpack-hash-'));
  const entry = join(work, 'entry.cjs');
  const output = join(work, 'bundle.cjs');
  writeFileSync(entry, "module.exports = 'vuepress-webpack-hash-control';\n");

  process.on('exit', () => {
    rmSync(entry, { force: true });
    rmSync(output, { force: true });
    rmdirSync(work);
  });

  const hashFunction = process.argv[2] || undefined;
  webpack({
    mode: 'none',
    target: 'node',
    entry,
    output: { path: work, filename: 'bundle.cjs', libraryTarget: 'commonjs2', hashFunction },
  }, (error, stats) => {
    if (error) throw error;
    assert.equal(stats.hasErrors(), false, stats.toString());
    assert.equal(require(output), 'vuepress-webpack-hash-control');
    console.log('bundle executed');
  });
`;

function build(stage, version, hashFunction = '') {
  const result = spawnSync(process.execPath, ['-e', bundle, version, hashFunction], {
    cwd: require('node:path').join(__dirname, stage),
    env: { ...process.env, NODE_OPTIONS: '' },
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.error) throw result.error;
  return result;
}

const held = build('before', '4.46.0');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /ERR_OSSL_EVP_UNSUPPORTED/);
assert.match(held.stderr, /webpack[\\/]lib[\\/]util[\\/]createHash\.js/);
const baseline = build('before', '4.46.0', 'sha256');
assert.equal(baseline.status, 0, baseline.stderr);
assert.match(baseline.stdout, /bundle executed/);
const repaired = build('after', '4.47.0');
assert.equal(repaired.status, 0, repaired.stderr);
assert.match(repaired.stdout, /bundle executed/);
const native = build('after', '4.47.0', 'native-md4');
assert.equal(native.status, 1, native.stderr);
assert.match(native.stderr, /ERR_OSSL_EVP_UNSUPPORTED/);
console.log('Webpack 4.46.0 fails under OpenSSL 3; 4.47.0 bundles and executes unless native MD4 is forced.');
