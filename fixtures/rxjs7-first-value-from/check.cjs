'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const before = require('./before/node_modules/rxjs');
const after = require('./after/node_modules/rxjs');
assert.equal(require('./before/node_modules/rxjs/package.json').version, '6.6.7');
assert.equal(require('./after/node_modules/rxjs/package.json').version, '7.8.2');

const original = [
  "import { of } from 'rxjs';",
  'export function request(): Promise<string> {',
  "  return of('ready').toPromise();",
  '}',
].join('\n');
const migrated = [
  "import { firstValueFrom, of } from 'rxjs';",
  'export function request(): Promise<string> {',
  "  return firstValueFrom(of('ready'));",
  '}',
].join('\n');

function compile(arm, source) {
  const root = join(__dirname, arm);
  assert.equal(require(join(root, 'node_modules', 'typescript', 'package.json')).version, '5.5.4');
  const tsc = join(root, 'node_modules', 'typescript', 'bin', 'tsc');
  const cwd = mkdtempSync(join(root, 'test-'));
  try {
    writeFileSync(join(cwd, 'request.ts'), source);
    const result = spawnSync(process.execPath, [
      tsc, '--strict', '--noEmit', '--target', 'ES2020', '--module', 'node16', 'request.ts',
    ], { cwd, encoding: 'utf8', timeout: 30000 });
    if (result.error) throw result.error;
    return { status: result.status, diagnostics: result.stdout + result.stderr };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

async function main() {
  const baseline = compile('before', original);
  assert.equal(baseline.status, 0, baseline.diagnostics);
  const held = compile('after', original);
  assert.equal(held.status, 2, held.diagnostics);
  assert.match(held.diagnostics, /TS2322: Type 'Promise<string \| undefined>'/);
  const fixed = compile('after', migrated);
  assert.equal(fixed.status, 0, fixed.diagnostics);

  assert.equal(await before.of('ready').toPromise(), 'ready');
  assert.equal(await after.firstValueFrom(after.of('ready')), 'ready');

  assert.equal(await before.of('first', 'last').toPromise(), 'last');
  assert.equal(await after.firstValueFrom(after.of('first', 'last')), 'first');
  assert.equal(await after.lastValueFrom(after.of('first', 'last')), 'last');

  assert.equal(await before.EMPTY.toPromise(), undefined);
  await assert.rejects(after.firstValueFrom(after.EMPTY), { name: 'EmptyError' });
  await assert.rejects(after.lastValueFrom(after.EMPTY), { name: 'EmptyError' });
  console.log('RxJS 7 firstValueFrom preserves one value and exposes empty and multiple emission differences.');
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
