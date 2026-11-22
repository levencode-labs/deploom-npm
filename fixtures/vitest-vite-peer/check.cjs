const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

// Baseline dependency pair from CodingGarden/react-ts-starter at e268b83beeb99a6a761ef5ceb269dc2c1964753b.
const cases = [
  { name: 'baseline', vite: '5.4.8', vitest: '2.1.2', rejects: false },
  { name: 'held-vite', vite: '5.4.8', vitest: '5.0.0', rejects: true },
  { name: 'compatible-vite', vite: '6.4.0', vitest: '5.0.0', rejects: false },
];
const flags = [
  '--registry=https://registry.npmjs.org/',
  '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund',
];

function npm(cwd, command) {
  const windows = process.platform === 'win32';
  const executable = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = windows ? ['/d', '/c', 'npm.cmd', command, ...flags] : [command, ...flags];
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', timeout: 120000, windowsHide: true });
  if (result.error) throw result.error;
  return result;
}

const temporaryRoot = fs.realpathSync(os.tmpdir());
const directory = fs.mkdtempSync(path.join(temporaryRoot, 'deploom-vitest-peer-'));
try {
  for (const probe of cases) {
    const cwd = path.join(directory, probe.name);
    fs.mkdirSync(cwd);
    fs.writeFileSync(path.join(cwd, 'package.json'), JSON.stringify({
      name: 'public-vitest-vite-peer-fixture',
      version: '1.0.0',
      private: true,
      devDependencies: { vite: probe.vite, vitest: probe.vitest },
    }));
    const install = npm(cwd, 'install');
    if (probe.rejects) {
      assert.notEqual(install.status, 0);
      assert.match(install.stderr, /ERESOLVE/);
      assert.match(install.stderr, /peer vite/);
      continue;
    }
    assert.equal(install.status, 0, install.stderr);
    const lockPath = path.join(cwd, 'package-lock.json');
    const lock = fs.readFileSync(lockPath);
    const frozen = npm(cwd, 'ci');
    assert.equal(frozen.status, 0, frozen.stderr);
    assert.deepEqual(fs.readFileSync(lockPath), lock);
    for (const name of ['vite', 'vitest']) {
      const installed = JSON.parse(fs.readFileSync(path.join(cwd, 'node_modules', name, 'package.json'), 'utf8'));
      assert.equal(installed.version, probe[name]);
    }
  }
  console.log('Verified the baseline and compatible Vite installs; the held Vite 5 peer is rejected.');
} finally {
  assert.equal(path.dirname(fs.realpathSync(directory)), temporaryRoot);
  fs.rmSync(directory, { recursive: true, force: true });
}
