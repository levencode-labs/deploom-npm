'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/chalk/package.json').version, '4.1.2');
assert.equal(require('./after/node_modules/chalk/package.json').version, '5.6.2');

const scenario = `
  async function main() {
    const chalk = process.argv[1] === 'dynamic'
      ? (await import('chalk')).default
      : require('chalk');
    process.stdout.write(JSON.stringify(chalk.cyan('fixture output')));
  }
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
`;

function run(arm, form, flag, forceColor) {
  const result = spawnSync(process.execPath, [flag, '-e', scenario, form], {
    cwd: join(__dirname, arm),
    env: { ...process.env, FORCE_COLOR: forceColor },
    encoding: 'utf8',
    timeout: 12000,
  });
  if (result.error) throw result.error;
  return result;
}

const disabled = '--no-experimental-require-module';
const enabled = '--experimental-require-module';

for (const color of ['0', '1']) {
  const baseline = run('before', 'require', disabled, color);
  assert.equal(baseline.status, 0, baseline.stderr);
  assert.equal(JSON.parse(baseline.stdout), color === '1'
    ? '\u001b[36mfixture output\u001b[39m'
    : 'fixture output');
  for (const flag of [disabled, enabled]) {
    const migrated = run('after', 'dynamic', flag, color);
    assert.equal(migrated.status, 0, migrated.stderr);
    assert.equal(migrated.stdout, baseline.stdout);
  }
}

const held = run('after', 'require', disabled, '1');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /ERR_REQUIRE_ESM/);

const namespace = run('after', 'require', enabled, '1');
assert.equal(namespace.status, 1, namespace.stderr);
assert.match(namespace.stderr, /chalk.cyan is not a function/);
console.log('Chalk 5 dynamic import preserves plain and ANSI-colored output from CommonJS.');
