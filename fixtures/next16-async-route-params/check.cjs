const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

function execute(cwd, args, awaited) {
  const result = spawnSync(process.execPath, args, {
    cwd,
    env: { ...process.env, NODE_ENV: 'production', CI: 'true', NEXT_TELEMETRY_DISABLED: '1', FIXTURE_AWAIT_PARAMS: awaited ? '1' : '0' },
    encoding: 'utf8',
    timeout: 90000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout;
}

const serve = `
  const { createServer } = require('node:http');
  const { once } = require('node:events');
  const next = require('next');
  async function run() {
    const app = next({ dev: false, hostname: '127.0.0.1' });
    await app.prepare();
    const server = createServer(app.getRequestHandler());
    try {
      server.listen(0, '127.0.0.1');
      await once(server, 'listening');
      const origin = 'http://127.0.0.1:' + server.address().port;
      const samples = [];
      for (const path of ['/contacts/42?edit=1', '/contacts/42', '/contacts/missing?edit=1']) {
        const response = await fetch(origin + path, { signal: AbortSignal.timeout(10000) });
        const html = await response.text();
        samples.push({ status: response.status, answer: html.match(/<main id="answer">([^<]*)/)?.[1] ?? null });
      }
      console.log('DEPLOOM_RESULT ' + JSON.stringify(samples));
    } finally {
      const closed = once(server, 'close');
      server.close();
      server.closeAllConnections();
      await closed;
      await app.close();
    }
  }
  run().catch(error => { console.error(error); process.exitCode = 1; });
`;

function build(stage, version) {
  const cwd = join(__dirname, stage);
  const next = join(cwd, 'node_modules', 'next');
  assert.equal(require(join(next, 'package.json')).version, version);
  execute(cwd, [join(next, 'dist', 'bin', 'next'), 'build'], false);
  return cwd;
}

function replay(cwd, awaited) {
  const stdout = execute(cwd, ['-e', serve], awaited);
  const result = stdout.split(/\r?\n/).find(line => line.startsWith('DEPLOOM_RESULT '));
  assert.ok(result, stdout);
  return JSON.parse(result.slice('DEPLOOM_RESULT '.length));
}

const baseline = build('before', '14.2.18');
const candidate = build('after', '16.4.2');
const expected = [{ status: 200, answer: '42 / edit' }, { status: 200, answer: '42 / view' }, { status: 404, answer: null }];
assert.deepEqual(replay(baseline, false), expected);
const held = replay(candidate, false);
assert.deepEqual(held, Array(3).fill({ status: 404, answer: null }));
assert.deepEqual(replay(candidate, true), expected);
console.log('Awaiting params and searchParams restores the deep link and query mode on Next.js 16.');
