const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, unlinkSync, rmdirSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const typescript5 = require('typescript-before');
const typescript6 = require('typescript-after');

assert.equal(typescript5.version, '5.9.2');
assert.equal(typescript6.version, '6.0.3');

const pinned = {
  strict: true,
  target: 'ES2022',
  module: 'ES2022',
  moduleResolution: 'bundler',
  baseUrl: '.',
  paths: { '~/*': ['./app/*'] },
};
const root = mkdtempSync(join(tmpdir(), 'deploom-ts6-baseurl-'));
const app = join(root, 'app');
mkdirSync(app);
const value = join(app, 'dep.ts');
const source = join(root, 'entry.ts');
writeFileSync(value, 'export const value = 42 as const;\n');

function diagnostics(ts, rawOptions, specifier) {
  writeFileSync(source, "import { value } from '" + specifier + "';\nexport const actual: 42 = value;\n");
  const { options, errors } = ts.parseJsonConfigFileContent({ compilerOptions: { ...rawOptions, noEmit: true, types: [] }, files: ["entry.ts"] }, ts.sys, root);
  assert.deepEqual(errors, []);
  return ts.getPreEmitDiagnostics(ts.createProgram([source], options)).map(d => d.code);
}

try {
  assert.deepEqual(diagnostics(typescript5, pinned, '~/dep'), []);
  assert.deepEqual(diagnostics(typescript5, pinned, 'app/dep'), []);
  assert.deepEqual(diagnostics(typescript6, pinned, '~/dep'), [5101]);
  const { baseUrl, ...updated } = pinned;
  assert.deepEqual(diagnostics(typescript6, updated, '~/dep'), []);
  assert.deepEqual(diagnostics(typescript6, updated, 'app/dep'), [2307]);
  assert.deepEqual(diagnostics(typescript6, updated, './app/dep'), []);
  console.log('Removing baseUrl keeps the explicit alias. A bare local import needs its own fix.');
} finally {
  unlinkSync(source);
  unlinkSync(value);
  rmdirSync(app);
  rmdirSync(root);
}
