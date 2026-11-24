'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');

const older = require('./before/node_modules/express');
const newer = require('./after/node_modules/express');

assert.equal(require('./before/node_modules/express/package.json').version, '4.18.1');
assert.equal(require('./after/node_modules/express/package.json').version, '5.2.1');

function createApp(express, wildcard) {
  const app = express();
  app.get('/health', (_req, res) => res.send('healthy'));
  app.all(wildcard, (_req, res) => res.status(404).send('app fallback'));
  return app;
}

async function capture(app) {
  const server = app.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const base = 'http://127.0.0.1:' + server.address().port;
    const requests = [
      { route: '/', method: 'GET' },
      { route: '/unknown/page', method: 'GET' },
      { route: '/unknown/page', method: 'POST' },
      { route: '/health', method: 'GET' },
    ];
    const results = [];
    for (const { route, method } of requests) {
      const response = await fetch(base + route, { method });
      results.push([response.status, await response.text()]);
    }
    return results;
  } finally {
    await new Promise((resolve, reject) => {
      server.close(error => error ? reject(error) : resolve());
    });
  }
}

async function main() {
  const fallback = [404, 'app fallback'];
  const expected = [fallback, fallback, fallback, [200, 'healthy']];
  assert.deepEqual(await capture(createApp(older, '*')), expected);
  assert.throws(() => createApp(newer, '*'), /Missing parameter name/i);

  const narrower = await capture(createApp(newer, '/*splat'));
  assert.equal(narrower[0][0], 404);
  assert.notEqual(narrower[0][1], 'app fallback');
  assert.deepEqual(narrower.slice(1), expected.slice(1));

  assert.deepEqual(await capture(createApp(newer, '/{*splat}')), expected);
  console.log('The Express 5 optional named wildcard restores the root and nested fallback.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
