const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const name = '@testing-library/jest-dom';

function arm(folder, version) {
  const root = join(__dirname, folder);
  const manifest = JSON.parse(readFileSync(join(root, 'node_modules', name, 'package.json'), 'utf8'));
  assert.equal(manifest.version, version);
  return createRequire(join(root, 'package.json'));
}

function registered(run) {
  const matchers = {};
  global.expect = { extend: entries => Object.assign(matchers, entries) };
  try {
    run();
    return matchers;
  } finally {
    delete global.expect;
  }
}

const before = arm('before', '5.17.0');
const after = arm('after', '6.1.5');
const legacy = registered(() => before(name + '/extend-expect'));
assert.equal(typeof legacy.toBeInTheDocument, 'function');
assert.throws(() => registered(() => after(name + '/extend-expect')),
  { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
const updated = registered(() => after(name));
assert.equal(typeof updated.toBeInTheDocument, 'function');
assert.equal(typeof updated.toHaveTextContent, 'function');
console.log('The v5 setup registers matchers. The v6 root entry restores registration when the removed subpath fails.');
