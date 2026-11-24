'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { dirname, join, sep } = require('node:path');

const oldGlob = require('./before/node_modules/glob');
const target = require('./after/node_modules/glob');
assert.equal(require('./before/node_modules/glob/package.json').version, '7.2.3');
assert.equal(require('./after/node_modules/glob/package.json').version, '10.5.0');

async function main() {
  const cwd = mkdtempSync(join(tmpdir(), 'deploom-glob-'));
  const pattern = 'workspaces/**/workspace.json';
  const expected = ['workspaces/alpha/workspace.json', 'workspaces/group/beta/workspace.json'];
  try {
    for (const name of [...expected, 'workspaces/alpha/package.json', 'other/workspace.json']) {
      const path = join(cwd, name);
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, '{}');
    }

    const legacy = await new Promise((resolve, reject) => {
      oldGlob(pattern, { cwd }, (error, files) => error ? reject(error) : resolve(files));
    });
    assert.deepEqual(legacy.sort(), expected);
    assert.throws(() => target(pattern, { cwd }, () => {}), /target is not a function/);

    const { glob } = target;
    let callbackCalled = false;
    const pending = glob(pattern, { cwd }, () => { callbackCalled = true; });
    assert.ok(pending instanceof Promise);
    const nativePaths = expected.map((name) => name.split('/').join(sep));
    assert.deepEqual((await pending).sort(), nativePaths);
    assert.equal(callbackCalled, false);
    assert.deepEqual((await glob(pattern, { cwd, posix: true })).sort(), legacy);
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
  console.log('glob 10 Promise API preserves the workspace descriptor matches.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
