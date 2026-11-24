'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const { basename, dirname, join } = require('node:path');

assert.equal(require('./before/node_modules/pino/package.json').version, '6.14.0');
assert.equal(require('./after/node_modules/pino/package.json').version, '10.1.0');
assert.equal(require('./before/node_modules/pino-pretty/package.json').version, '7.6.1');
assert.equal(require('./after/node_modules/pino-pretty/package.json').version, '13.1.3');

const scenario = `
  const { once } = require('node:events');
  const pino = require('pino');

  async function main() {
    const base = { base: null, timestamp: false };
    const pretty = { colorize: false };
    const mode = process.argv[2];
    if (mode === 'transport') {
      const stream = pino.transport({ target: 'pino-pretty', options: pretty });
      stream.ref();
      await once(stream, 'ready');
      const log = pino(base, stream);
      log.info({ component: 'fixture' }, 'transport check');
      const closing = once(stream, 'close');
      stream.end();
      await closing;
    } else {
      const options = mode === 'legacy' ? { ...base, prettyPrint: pretty } : base;
      pino(options).info({ component: 'fixture' }, 'transport check');
    }
  }

  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
`;

function run(arm, mode) {
  const root = join(__dirname, arm);
  const folder = fs.mkdtempSync(join(root, 'logger-case-'));
  try {
    const entry = join(folder, 'logger.cjs');
    fs.writeFileSync(entry, scenario);
    const result = spawnSync(process.execPath, [entry, mode], {
      cwd: folder, encoding: 'utf8', timeout: 20000,
    });
    if (result.error) throw new Error(result.stderr || result.stdout, { cause: result.error });
    return result;
  } finally {
    const real = fs.realpathSync(folder);
    assert.equal(dirname(real), fs.realpathSync(root));
    assert.match(basename(real), /^logger-case-[A-Za-z0-9]+$/);
    fs.rmSync(real, { recursive: true, force: true });
  }
}

function verifyPretty(result) {
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /\bINFO\b.*transport check/);
  assert.match(result.stdout, /component: "fixture"/);
}

verifyPretty(run('before', 'legacy'));

const held = run('after', 'legacy');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /prettyPrint option is no longer supported/i);

verifyPretty(run('after', 'transport'));

const json = run('after', 'json');
assert.equal(json.status, 0, json.stderr);
assert.deepEqual(JSON.parse(json.stdout), {
  level: 30, component: 'fixture', msg: 'transport check',
});
console.log('The Pino transport preserves formatted severity, message and fields. The plain logger still returns JSON.');
