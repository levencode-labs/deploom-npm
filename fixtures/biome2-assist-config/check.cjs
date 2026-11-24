'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/@biomejs/biome/package.json').version, '1.9.4');
assert.equal(require('./after/node_modules/@biomejs/biome/package.json').version, '2.0.4');

function biome(arm, cwd, ...args) {
  const cli = join(__dirname, arm, 'node_modules', '@biomejs', 'biome', 'bin', 'biome');
  const result = spawnSync(process.execPath, [cli, ...args], { cwd, encoding: 'utf8', timeout: 20000 });
  if (result.error) throw result.error;
  return { status: result.status, diagnostics: result.stdout + result.stderr };
}

const cwd = mkdtempSync(join(tmpdir(), 'deploom-biome-'));
try {
  const config = join(cwd, 'biome.json');
  const src = join(cwd, 'src');
  const generated = join(src, 'generated');
  mkdirSync(generated, { recursive: true });
  writeFileSync(config, JSON.stringify({
    $schema: 'https://biomejs.dev/schemas/1.9.4/schema.json',
    files: { ignore: ['**/generated/**'] },
    organizeImports: { enabled: true },
    formatter: { enabled: false },
    linter: { enabled: false },
  }, null, 2));

  const entry = join(src, 'entry.ts');
  const excluded = join(generated, 'entry.ts');
  const first = "import { a } from './a.js';";
  const last = "import { z } from './z.js';";
  const outOfOrder = [last, first, 'console.log(a, z);', ''].join('\n');
  writeFileSync(join(src, 'a.ts'), 'export const a = 1;\n');
  writeFileSync(join(src, 'z.ts'), 'export const z = 2;\n');
  writeFileSync(entry, outOfOrder);
  writeFileSync(excluded, outOfOrder);

  const previous = biome('before', cwd, 'check', '--write', '.');
  assert.equal(previous.status, 0, previous.diagnostics);
  assert.deepEqual(readFileSync(entry, 'utf8').split(/\r?\n/).slice(0, 2), [first, last]);
  assert.equal(readFileSync(excluded, 'utf8'), outOfOrder);
  writeFileSync(entry, outOfOrder);

  const held = biome('after', cwd, 'check', '.');
  assert.notEqual(held.status, 0, held.diagnostics);
  assert.match(held.diagnostics, /unknown key.*(?:organizeImports|ignore)/i);
  assert.equal(readFileSync(entry, 'utf8'), outOfOrder);

  const migration = biome('after', cwd, 'migrate', '--write');
  assert.equal(migration.status, 0, migration.diagnostics);
  const migrated = JSON.parse(readFileSync(config, 'utf8'));
  assert.equal(migrated.assist.actions.source.organizeImports, 'on');
  assert.ok(migrated.files.includes.some((pattern) => pattern.startsWith('!') && pattern.includes('generated')));

  const updated = biome('after', cwd, 'check', '--write', '.');
  assert.equal(updated.status, 0, updated.diagnostics);
  assert.deepEqual(readFileSync(entry, 'utf8').split(/\r?\n/).slice(0, 2), [first, last]);
  assert.equal(readFileSync(excluded, 'utf8'), outOfOrder);
  console.log('Biome 2 migrate keeps import sorting and leaves the excluded source unchanged.');
} finally {
  rmSync(cwd, { recursive: true, force: true });
}
