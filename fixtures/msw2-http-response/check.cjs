'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/msw/package.json').version, '1.3.0');
assert.equal(require('./after/node_modules/msw/package.json').version, '2.13.4');

const scenario = `
  import assert from 'node:assert/strict';
  import { setupServer } from 'msw/node';

  const { rest, http, HttpResponse } = await import('msw');
  const root = 'http://127.0.0.1:1';
  const route = root + '/api/entries/:id';

  function reply(id) {
    return id === '42'
      ? { status: 200, body: { data: { id } } }
      : { status: 403, body: { error: 'forbidden' } };
  }

  const headers = { 'x-fixture-route': 'entries' };
  const handler = process.argv[1] === 'legacy'
    ? rest.get(route, (req, res, ctx) => {
        const { status, body } = reply(req.params.id);
        return res(ctx.status(status), ctx.set(headers), ctx.json(body));
      })
    : http.get(route, ({ params }) => {
        const { status, body } = reply(params.id);
        return HttpResponse.json(body, { status, headers });
      });

  const server = setupServer(handler);
  let unhandled = 0;
  server.listen({ onUnhandledRequest: (_request, print) => {
    unhandled += 1;
    print.error();
  } });
  try {
    const results = [];
    for (const id of ['42', 'missing']) {
      const response = await fetch(root + '/api/entries/' + id, { signal: AbortSignal.timeout(4000) });
      results.push({ status: response.status, body: await response.json(),
        header: response.headers.get('x-fixture-route'),
        json: response.headers.get('content-type')?.startsWith('application/json') });
    }
    await assert.rejects(fetch(root + '/unexpected', { signal: AbortSignal.timeout(4000) }));
    assert.equal(unhandled, 1);
    console.log(JSON.stringify(results));
  } finally {
    server.close();
  }
`;

function run(arm, form) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', scenario, form], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15_000,
  });
  if (result.error) throw result.error;
  return result;
}

const expected = [
  { status: 200, body: { data: { id: '42' } }, header: 'entries', json: true },
  { status: 403, body: { error: 'forbidden' }, header: 'entries', json: true },
];

const baseline = run('before', 'legacy');
assert.equal(baseline.status, 0, baseline.stderr);
assert.deepEqual(JSON.parse(baseline.stdout), expected);

const held = run('after', 'legacy');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /Cannot read properties of undefined \(reading 'get'\)/);

const repaired = run('after', 'modern');
assert.equal(repaired.status, 0, repaired.stderr);
assert.deepEqual(JSON.parse(repaired.stdout), expected);
console.log('MSW 2 preserves the success and error responses, JSON types, headers and unmatched-request guard.');
