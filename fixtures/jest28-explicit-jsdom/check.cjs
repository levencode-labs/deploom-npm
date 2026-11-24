'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');

function loadArm(arm) {
  return createRequire(join(__dirname, arm, 'package.json'));
}

assert.equal(loadArm('before')('jest/package.json').version, '27.5.1');
assert.equal(loadArm('held')('jest/package.json').version, '28.1.3');
assert.equal(loadArm('after')('jest/package.json').version, '28.1.3');
assert.equal(loadArm('after')('jest-environment-jsdom/package.json').version, '28.1.3');
assert.throws(() => loadArm('held').resolve('jest-environment-jsdom'), { code: 'MODULE_NOT_FOUND' });

function run(arm) {
  const root = join(__dirname, arm);
  const cwd = mkdtempSync(join(root, 'test-'));
  try {
    const test = join(cwd, 'dom.test.js');
    writeFileSync(test, [
      "test('updates the label after a click', () => {",
      "  document.body.innerHTML = '<button>Save</button>';",
      "  const button = document.querySelector('button');",
      "  button.addEventListener('click', () => { button.textContent = 'Saved'; });",
      "  button.click();",
      "  expect(button.textContent).toBe('Saved');",
      '});',
    ].join('\n'));
    const config = JSON.stringify({ rootDir: root, roots: [cwd], testEnvironment: 'jsdom' });
    const jest = join(root, 'node_modules', 'jest', 'bin', 'jest.js');
    const result = spawnSync(process.execPath, [
      jest, '--config', config, '--runInBand', '--no-cache', '--runTestsByPath', test,
    ], { cwd: root, encoding: 'utf8', timeout: 30000 });
    if (result.error) throw result.error;
    return { status: result.status, output: result.stdout + result.stderr };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const before = run('before');
assert.equal(before.status, 0, before.output);
assert.match(before.output, /1 passed/);

const held = run('held');
assert.notEqual(held.status, 0, held.output);
assert.match(held.output, /Test environment jest-environment-jsdom cannot be found/);

const after = run('after');
assert.equal(after.status, 0, after.output);
assert.match(after.output, /1 passed/);
console.log('Jest 28 runs the same DOM test after installing the explicit matching jsdom environment.');
