'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const root = __dirname;
const spec = require('./spec.json');
const transitions = { prettier: ['2.8.8', '3.0.0'], zod: ['3.25.76', '4.6.7'] };
const controls = ['PRETTIER_OLD_SYNC_CONSUMER_FAILS', 'ZOD_ERRORS_ALIAS_FAILS',
  'MANAGER_ARM_ISOLATION', 'FORMAT_INVALID_SOURCE_REJECTED', 'VALIDATION_INVALID_INPUT_REJECTED'];
assert.equal(process.versions.node, spec.node, 'Use pinned Node 24.18.0');
for (const [name, [from, to]] of Object.entries(transitions)) {
  assert.equal(spec.arms.before[name], from);
  assert.equal(spec.arms.after[name], to);
}
const options = {};
for (let index = 2; index < process.argv.length; index += 2) {
  const key = process.argv[index];
  assert.ok(['--manager', '--output'].includes(key) && process.argv[index + 1]
    && !Object.hasOwn(options, key), 'Usage: check.cjs [--manager npm|yarn|pnpm] [--output file]');
  options[key] = process.argv[index + 1];
}
const managers = options['--manager'] ? [options['--manager']] : Object.keys(spec.managers);
assert.ok(managers.every(name => Object.hasOwn(spec.managers, name)), 'Unknown manager');
const output = options['--output'] ? path.resolve(options['--output'])
  : path.join(root, 'generated', `${options['--manager'] || 'all'}.json`);
const env = { ...process.env, NODE_PATH: '', CI: '1' };
delete env.NODE_OPTIONS;

function hash(file) {
  const bytes = fs.readFileSync(file);
  return { sha256: createHash('sha256').update(bytes).digest('hex'), bytes: bytes.length };
}
function inputManifest() {
  const files = ['.gitignore', 'README.md', 'spec.json', 'install.cjs', 'check.cjs', 'runner.cjs',
    'tools/package.json', 'tools/package-lock.json'];
  for (const [manager, policy] of Object.entries(spec.managers)) {
    for (const arm of Object.keys(spec.arms)) {
      const dir = `arms/${manager}-${arm}`;
      files.push(`${dir}/package.json`, `${dir}/${policy.lock}`);
      if (manager === 'yarn') files.push(`${dir}/.yarnrc.yml`);
      if (manager === 'pnpm') files.push(`${dir}/.npmrc`);
    }
  }
  return files.sort().map(file => ({ path: file, ...hash(path.join(root, file)) }));
}
function node(args, cwd) {
  const result = spawnSync(process.execPath, args, {
    cwd, env, encoding: 'utf8', timeout: 45000, maxBuffer: 1000000, windowsHide: true,
  });
  if (result.error) throw result.error;
  return result;
}
function runArm(manager, arm, loadPnP = true) {
  const dir = path.join(root, 'arms', `${manager}-${arm}`);
  const runner = [path.join(root, 'runner.cjs'), manager, arm];
  if (manager === 'yarn' && loadPnP) {
    // Yarn installs both CommonJS and ESM PnP loaders; Prettier 3 imports ESM plugins.
    const policy = spec.managers.yarn;
    return node([path.join(root, 'tools', 'node_modules', policy.package, policy.cli),
      'node', ...runner], dir);
  }
  return node(runner, dir);
}

const inputs = inputManifest();
const poisonRoot = path.join(root, 'node_modules');
assert.ok(!fs.existsSync(poisonRoot), 'The fixture-level node_modules must be absent before the isolation control');
const results = [];
try {
  fs.mkdirSync(poisonRoot);
  for (const manager of managers) {
    const policy = spec.managers[manager];
    const toolRoot = path.join(root, 'tools', 'node_modules', policy.package);
    assert.equal(JSON.parse(fs.readFileSync(path.join(toolRoot, 'package.json'))).version, policy.version);
    const version = node([path.join(toolRoot, policy.cli), '--version'], root);
    assert.equal(version.status, 0, version.stderr);
    assert.equal(version.stdout.trim(), policy.version, 'Executed manager must have its pinned version');
    const arms = {};
    const isolation = {};
    for (const arm of Object.keys(spec.arms)) {
      const dir = path.join(root, 'arms', `${manager}-${arm}`);
      for (const [name, installedVersion] of Object.entries(spec.arms[arm])) {
        const fake = path.join(poisonRoot, name);
        fs.mkdirSync(fake, { recursive: true });
        fs.writeFileSync(path.join(fake, 'package.json'), JSON.stringify({ name,
          version: installedVersion, main: 'index.cjs' }) + '\n');
        fs.writeFileSync(path.join(fake, 'index.cjs'), "throw new Error('FORBIDDEN_PARENT_PACKAGE');\n");
      }
      const good = runArm(manager, arm);
      assert.equal(good.status, 0, `${manager}-${arm}: ${good.stderr}`);
      const observed = JSON.parse(good.stdout.trim());
      assert.equal(observed.manager, manager);
      assert.equal(observed.arm, arm);
      assert.deepEqual(observed.versions, spec.arms[arm]);
      assert.equal(observed.checks.fixed, 'passed');
      assert.equal(observed.checks.invalidInputControls, 'passed');
      arms[arm] = observed;

      const installed = path.join(dir, 'node_modules');
      const held = path.join(dir, 'node_modules-stageb-held');
      if (manager !== 'yarn') {
        assert.ok(!fs.existsSync(held), 'Do not overwrite an existing held installation');
        fs.renameSync(installed, held);
      }
      try {
        // Prove that ordinary Node really can see a matching-version parent poison.
        const probe = node(['-e',
          "const r=require('node:module').createRequire(require('node:path').join(process.cwd(),'package.json'));console.log(JSON.stringify({file:r.resolve('prettier/package.json'),version:r('prettier/package.json').version}));"], dir);
        assert.equal(probe.status, 0, probe.stderr);
        const fallback = JSON.parse(probe.stdout.trim());
        assert.equal(path.resolve(fallback.file), path.join(poisonRoot, 'prettier', 'package.json'));
        assert.equal(fallback.version, spec.arms[arm].prettier);
        const bad = runArm(manager, arm, false);
        assert.notEqual(bad.status, 0, 'MANAGER_ARM_ISOLATION: missing installation must fail');
        assert.match(bad.stderr, /MANAGER_ARM_ISOLATION/,
          'Missing arm must be rejected before a parent package can execute');
        isolation[arm] = { status: 'passed', matchingVersionParentPoisonObserved: true,
          missingArmRejected: true, loaderOmitted: manager === 'yarn' };
      } finally {
        if (manager !== 'yarn') fs.renameSync(held, installed);
      }
    }
    assert.equal(arms.before.checks.baseline, 'passed');
    assert.deepEqual(arms.after.checks.upgradedOldCode,
      { prettier: 'expected-TypeError', zod: 'expected-TypeError' });
    assert.equal(arms.after.checks.revertedFixNegatives, 'passed');
    assert.deepEqual(arms.after.output, arms.before.output, 'Fixed outputs must preserve the baseline');
    results.push({ manager, managerVersion: policy.version, mode: policy.mode, status: 'passed',
      cases: Object.entries(transitions).map(([name, [from, to]]) => ({ package: name, from, to,
        baseline: 'passed', upgradedOldCode: arms.after.checks.upgradedOldCode[name],
        fixed: 'passed', revertedFixNegative: 'passed', invalidInputNegative: 'passed' })),
      arms, isolation, negativeControls: controls });
    console.log(`PASS ${manager}@${policy.version}: two real behavior transitions and isolated resolution`);
  }
} finally {
  fs.rmSync(poisonRoot, { recursive: true, force: true });
}
assert.deepEqual(inputManifest(), inputs, 'Fixture source, manifests, configs and frozen locks changed');
const report = { schemaVersion: 1, status: 'passed', observedAt: new Date().toISOString(),
  runtime: { node: process.versions.node, platform: process.platform, arch: process.arch },
  manager: options['--manager'] || 'all', inputs, results };
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
console.log(`Saved ${path.relative(process.cwd(), output)}`);
