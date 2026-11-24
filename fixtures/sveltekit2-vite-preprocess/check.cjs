'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/@sveltejs/kit/package.json').version, '1.30.4');
assert.equal(require('./after/node_modules/@sveltejs/kit/package.json').version, '2.70.0');
assert.equal(require('./after/node_modules/@sveltejs/vite-plugin-svelte/package.json').version, '4.0.4');

function compile(arm, importer) {
  const script = [
    "import assert from 'node:assert/strict';",
    "import { preprocess, compile } from 'svelte/compiler';",
    "import { vitePreprocess } from " + JSON.stringify(importer) + ";",
    "const source = '<script lang=\"ts\">const count: number = 2;</script><p>fixture status {count}</p>';",
    "const transformed = await preprocess(source, vitePreprocess({ script: true }), { filename: 'Fixture.svelte' });",
    "assert.doesNotMatch(transformed.code, /:\\s*number/);",
    "const result = compile(transformed.code, { filename: 'Fixture.svelte' });",
    "assert.match(result.js.code, /fixture status/);",
    "process.stdout.write('preprocessed and compiled');",
  ].join('\n');
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', script], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15000,
  });
  if (result.error) throw result.error;
  return result;
}

const legacyImporter = '@sveltejs/kit/vite';
const currentImporter = '@sveltejs/vite-plugin-svelte';

const baseline = compile('before', legacyImporter);
assert.equal(baseline.status, 0, baseline.stderr);
assert.equal(baseline.stdout, 'preprocessed and compiled');

const held = compile('after', legacyImporter);
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /does not provide an export named 'vitePreprocess'/);

const migrated = compile('after', currentImporter);
assert.equal(migrated.status, 0, migrated.stderr);
assert.equal(migrated.stdout, baseline.stdout);
console.log('SvelteKit 2 compiles the typed component with vitePreprocess imported from its Vite plugin.');
