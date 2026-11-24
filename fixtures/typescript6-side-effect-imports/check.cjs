const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, rmdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const baseline = require('typescript-before');
const upgraded = require('typescript-after');
assert.equal(baseline.version, '5.9.2');
assert.equal(upgraded.version, '6.0.3');

const root = mkdtempSync(join(tmpdir(), 'deploom-side-effects-'));
const assets = join(root, 'styles');
mkdirSync(assets);
const css = join(assets, 'global.css');
const declaration = join(assets, 'global.d.css.ts');
const source = join(root, 'entry.ts');
writeFileSync(css, 'body { margin: 0; }');

function diagnostics(ts, name) {
  writeFileSync(source, "import './styles/" + name + ".css';");
  const config = ts.parseJsonConfigFileContent({
    compilerOptions: {
      module: 'ESNext', moduleResolution: 'bundler', target: 'ES2022',
      allowArbitraryExtensions: true, types: [], noEmit: true,
    },
    files: ['entry.ts'],
  }, ts.sys, root);
  assert.deepEqual(config.errors, []);
  return ts.getPreEmitDiagnostics(ts.createProgram(config.fileNames, config.options)).map(diag => diag.code);
}

try {
  assert.deepEqual(diagnostics(baseline, 'global'), []);
  assert.deepEqual(diagnostics(upgraded, 'global'), [2882]);
  writeFileSync(declaration, 'export {};\n');
  assert.deepEqual(diagnostics(upgraded, 'global'), []);
  assert.deepEqual(diagnostics(upgraded, 'gloabl'), [2882]);
  console.log('The asset declaration fixes the intended import and preserves rejection of a typo.');
} finally {
  for (const artifact of [source, css, declaration]) {
    try { unlinkSync(artifact); } catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  rmdirSync(assets);
  rmdirSync(root);
}
