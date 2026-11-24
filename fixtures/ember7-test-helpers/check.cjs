'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { basename, dirname, join, resolve } = require('node:path');

const input = resolve(process.argv[2] ?? __dirname);
const temp = resolve(tmpdir());
const work = mkdtempSync(join(temp, 'deploom-ember7-'));

function unpack(name, version, digest, folder) {
  const file = join(input, name.replace(/^@/, '').replace('/', '-') + '-' + version + '.tgz');
  assert.equal(createHash('sha512').update(readFileSync(file)).digest('base64'), digest, basename(file));
  mkdirSync(folder, { recursive: true });
  const result = spawnSync('tar', ['-xf', file, '--strip-components', '1', '-C', folder], {
    encoding: 'utf8', timeout: 30000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  const manifest = JSON.parse(readFileSync(join(folder, 'package.json'), 'utf8'));
  assert.equal(manifest.name, name);
  assert.equal(manifest.version, version);
}

function checkSetup(arm, source) {
  const cwd = join(work, arm);
  const file = join(cwd, 'setup.mts');
  writeFileSync(file, source);
  const result = spawnSync(process.execPath, [
    join(work, 'compiler', 'lib', 'tsc.js'), '--strict', '--noEmit', '--skipLibCheck',
    '--module', 'NodeNext', '--pretty', 'false', file,
  ], { cwd, encoding: 'utf8', timeout: 30000 });
  if (result.error) throw result.error;
  return { status: result.status, output: result.stdout + result.stderr };
}

const legacy = [
  "import 'ember-source/types';",
  "import type { TestableApp } from 'ember-testing/lib/ext/application';",
  "import { pauseTest, setApplication } from '@ember/test-helpers';",
  'export function setup(app: TestableApp) {',
  '  app.injectTestHelpers({});',
  '  setApplication(app);',
  '  return pauseTest;',
  '}',
].join('\n');

const explicit = [
  "import 'ember-source/types';",
  "import type Application from '@ember/application';",
  "import { pauseTest, setApplication } from '@ember/test-helpers';",
  'export function setup(app: Application) {',
  '  setApplication(app);',
  '  return pauseTest;',
  '}',
].join('\n');

try {
  const before = join(work, 'before', 'node_modules', 'ember-source');
  const after = join(work, 'after', 'node_modules', 'ember-source');
  unpack('ember-source', '6.10.1', '23tmGxW4Q58nGlz2HxqVeOoMKlT6z9L0f2ELsoLReynybZHE3uPh6NAZ6uGivYOH3K8QCACUItfumut6eCy4qA==', before);
  unpack('ember-source', '7.2.0', 'pWjYFeM76vAgiFvqrBacAsQh94vTIy8SC1X2S3goULJHJ5/tVWAZ2NtaLFx9oZd3/Lk0gGRdsCMla9rQY58vyw==', after);
  unpack('typescript', '6.0.3', 'y2TvuxSZPDyQakkFRPZHKFm+KKVqIisdg9/CZwm9ftvKXLP8NRWj38/ODjNbr43SsoXqNuAisEf1GdCxqWcdBw==', join(work, 'compiler'));
  unpack('@ember/test-helpers', '5.4.3', 'WeNABJsXBidEXP87AH5gaI/KAyb0zEUYJxWa31A/Us5lqg85E3tPlHjBwCrlReOrJbSgvvArMnrdCwt7TRpjPQ==', join(work, 'node_modules', '@ember', 'test-helpers'));

  const extension = join('ember-testing', 'lib', 'ext', 'application.js');
  assert.match(readFileSync(join(before, 'dist', 'packages', extension), 'utf8'), /injectTestHelpers\(helperContainer\)/);
  for (const build of ['dev', 'prod']) {
    assert.ok(!existsSync(join(after, 'dist', build, 'packages', extension)));
  }

  const original = checkSetup('before', legacy);
  assert.equal(original.status, 0, original.output);
  const held = checkSetup('after', legacy);
  assert.notEqual(held.status, 0);
  assert.match(held.output, /TS2307: Cannot find module 'ember-testing\/lib\/ext\/application'/);
  for (const arm of ['before', 'after']) {
    const fixed = checkSetup(arm, explicit);
    assert.equal(fixed.status, 0, fixed.output);
  }
  console.log('Legacy setup compiles on Ember 6.10.1 and rejects on 7.2.0; explicit helpers compile in both.');
} finally {
  assert.equal(dirname(resolve(work)), temp);
  rmSync(work, { recursive: true, force: true });
}
