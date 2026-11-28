'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');

const root = __dirname;
const spec = require('./spec.json');
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--manager'),
  'Usage: node install.cjs [--manager npm|yarn|pnpm]');
const managers = args.length ? [args[1]] : Object.keys(spec.managers);
assert.ok(managers.every(name => Object.hasOwn(spec.managers, name)), 'Unknown manager');
assert.equal(process.versions.node, spec.node, 'Use the pinned Node runtime');

function sha(file) {
  return createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}

for (const manager of managers) {
  const policy = spec.managers[manager];
  const toolRoot = path.join(root, 'tools', 'node_modules', policy.package);
  assert.equal(JSON.parse(fs.readFileSync(path.join(toolRoot, 'package.json'))).version,
    policy.version, 'The package manager tool must match its lock');
  const cli = path.join(toolRoot, policy.cli);
  for (const arm of Object.keys(spec.arms)) {
    const dir = path.join(root, 'arms', `${manager}-${arm}`);
    const lock = path.join(dir, policy.lock);
    const before = sha(lock);
    const env = { ...process.env, NODE_PATH: '', CI: '1' };
    delete env.NODE_OPTIONS;
    let command;
    if (manager === 'npm') {
      command = ['ci', '--ignore-scripts', '--no-audit', '--no-fund', '--engine-strict',
        '--strict-peer-deps', '--cache', path.join(root, '.cache', 'npm')];
    } else if (manager === 'yarn') {
      env.YARN_ENABLE_GLOBAL_CACHE = 'false';
      env.YARN_ENABLE_SCRIPTS = 'false';
      command = ['install', '--immutable', '--mode=skip-build'];
    } else {
      command = ['install', '--frozen-lockfile', '--ignore-scripts',
        '--strict-peer-dependencies', '--store-dir', path.join(root, '.cache', 'pnpm-store')];
    }
    const result = spawnSync(process.execPath, [cli, ...command], {
      cwd: dir, env, stdio: 'inherit', timeout: 240000, windowsHide: true,
    });
    if (result.error) throw result.error;
    assert.equal(result.status, 0, `${manager}-${arm} frozen installation failed`);
    assert.equal(sha(lock), before, `${manager}-${arm} changed its frozen lock`);
    console.log(`INSTALLED ${manager}@${policy.version} ${arm}; lock unchanged`);
  }
}
