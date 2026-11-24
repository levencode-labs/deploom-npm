const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function arm(name, nextVersion, eslintVersion) {
  const root = path.join(__dirname, name);
  const modules = path.join(root, 'node_modules');
  assert.equal(require(path.join(modules, 'next/package.json')).version, nextVersion);
  assert.equal(require(path.join(modules, 'eslint/package.json')).version, eslintVersion);
  const project = fs.mkdtempSync(path.join(root, 'project-'));
  return { modules, root, project };
}

function createSample(project) {
  const app = path.join(project, 'app');
  fs.mkdirSync(app);
  const sample = path.join(app, 'sample.js');
  fs.writeFileSync(sample, 'module.exports = 1;\n');
  fs.writeFileSync(path.join(project, '.eslintrc.json'), JSON.stringify({
    root: true, env: { node: true }, rules: { 'no-debugger': 'error' },
  }));
  return sample;
}

function run(variant, bin, ...args) {
  const result = spawnSync(process.execPath, [path.join(variant.modules, bin), ...args], {
    cwd: variant.project, encoding: 'utf8', timeout: 15000,
    env: { ...process.env, NEXT_TELEMETRY_DISABLED: '1',
      ESLINT_USE_FLAT_CONFIG: String(bin.startsWith('eslint')) },
  });
  if (result.error) throw result.error;
  return { code: result.status, output: (result.stdout || '') + (result.stderr || '') };
}

const variants = [];
try {
  const before = arm('before', '15.2.8', '8.45.0');
  variants.push(before);
  const after = arm('after', '16.4.5', '9.0.0');
  variants.push(after);
  createSample(before.project);
  const sample = createSample(after.project);

  const baseline = run(before, 'next/dist/bin/next', 'lint');
  assert.equal(baseline.code, 0, baseline.output);
  const held = run(after, 'next/dist/bin/next', 'lint');
  assert.equal(held.code, 1, held.output);
  assert.match(held.output, /Invalid project directory/);
  assert.match(held.output, /[\\/]lint/);

  fs.writeFileSync(path.join(after.project, 'eslint.config.cjs'),
    "module.exports = [{ files: ['**/*.js'], rules: { 'no-debugger': 'error' } }];\n");
  const lint = () => run(after, 'eslint/bin/eslint.js', 'app');
  const repaired = lint();
  assert.equal(repaired.code, 0, repaired.output);
  fs.writeFileSync(sample, 'debugger;\n');
  const control = lint();
  assert.equal(control.code, 1, control.output);
  assert.match(control.output, /no-debugger/);
  console.log('Next.js 15.2.8 lint passed; 16.4.5 rejected the old command; ESLint found the injected violation.');
} finally {
  for (const { project, root } of variants) {
    const resolved = fs.realpathSync(project);
    assert.equal(path.dirname(resolved), fs.realpathSync(root));
    assert.match(path.basename(resolved), /^project-[A-Za-z0-9]+$/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}
