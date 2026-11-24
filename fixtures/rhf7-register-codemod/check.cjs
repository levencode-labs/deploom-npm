'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

assert.equal(require('./before/node_modules/react-hook-form/package.json').version, '6.15.4');
assert.equal(require('./after/node_modules/react-hook-form/package.json').version, '7.4.0');

const ts = require('./after/node_modules/typescript');
const modRoot = path.join(__dirname, 'after', 'node_modules', '@hookform', 'codemod');
const loadCodemod = createRequire(path.join(modRoot, 'package.json'));
assert.equal(loadCodemod('./package.json').version, '1.0.0');
const jscodeshift = loadCodemod('jscodeshift').withParser('tsx');
const updateRegister = loadCodemod('./dist/transforms/v7/update-register.js').default;
const original = fs.readFileSync(path.join(__dirname, 'register.jsx'), 'utf8');

function transform(source) {
  return updateRegister({ path: 'register.jsx', source }, { jscodeshift }, {});
}

function run(arm, source) {
  const root = path.join(__dirname, arm);
  const folder = fs.mkdtempSync(path.join(root, 'form-case-'));
  try {
    const built = path.join(folder, 'form.cjs');
    const compiled = ts.transpileModule(source, {
      fileName: 'register.jsx',
      compilerOptions: {
        jsx: ts.JsxEmit.React,
        module: ts.ModuleKind.CommonJS,
        esModuleInterop: true,
      },
    });
    fs.writeFileSync(built, compiled.outputText);
    const result = spawnSync(process.execPath, [path.join(__dirname, 'render-form.cjs'), built], {
      cwd: folder, encoding: 'utf8', timeout: 20_000,
    });
    if (result.error) throw new Error(result.stderr || result.stdout, { cause: result.error });
    return result;
  } finally {
    const real = fs.realpathSync(folder);
    assert.equal(path.dirname(real), fs.realpathSync(root));
    assert.match(path.basename(real), /^form-case-[A-Za-z0-9]+$/);
    fs.rmSync(real, { recursive: true, force: true });
  }
}

const baseline = run('before', original);
assert.equal(baseline.status, 0, baseline.stderr);
assert.deepEqual(JSON.parse(baseline.stdout), { project: 'Orchard' });

const held = run('after', original);
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /TypeError: .*\.split is not a function/);

const migrated = transform(original);
assert.match(migrated, /\{\.\.\.register\(['"]project['"],\s*\{\s*required:\s*true/);
assert.doesNotMatch(migrated, /ref=\{register/);
assert.match(migrated, /name="unrelated" defaultValue="keep"/);

const spreadName = original.replace('name="project"', "{...{ name: 'project' }}");
assert.notEqual(spreadName, original);
const spreadResult = transform(spreadName);
assert.doesNotMatch(spreadResult, /\{\.\.\.register\(/);
assert.equal(run('after', spreadResult).status, 1);

const repaired = run('after', migrated);
assert.equal(repaired.status, 0, repaired.stderr);
assert.deepEqual(JSON.parse(repaired.stdout), JSON.parse(baseline.stdout));
console.log('The official update-register transform preserves required validation and submission for an explicitly named field.');
