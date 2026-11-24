const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { Writable } = require('node:stream');

const baseline = createRequire(join(__dirname, 'before', 'package.json'));
const target = createRequire(join(__dirname, 'after', 'package.json'));
assert.equal(baseline('fastify/package.json').version, '4.29.1');
assert.equal(target('fastify/package.json').version, '5.12.5');

function capture() {
  const messages = [];
  const stream = new Writable({
    write(chunk, encoding, callback) {
      messages.push(JSON.parse(chunk.toString()));
      callback();
    },
  });
  return { stream, messages };
}

async function serve(app, messages) {
  try {
    app.get('/health', request => {
      request.log.info({ verified: true }, 'fixture-request');
      return { ok: true };
    });
    const response = await app.inject({ method: 'GET', url: '/health' });
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.json(), { ok: true });
    assert.ok(messages.some(entry => entry.msg === 'fixture-request' && entry.verified === true));
  } finally {
    await app.close();
  }
}

async function check() {
  const before = capture();
  await serve(baseline('fastify')({ logger: baseline('pino')(before.stream) }), before.messages);

  const after = capture();
  const instance = target('pino')(after.stream);
  assert.throws(() => target('fastify')({ logger: instance }), { code: 'FST_ERR_LOG_INVALID_LOGGER_CONFIG' });
  await serve(target('fastify')({ loggerInstance: instance }), after.messages);

  const options = capture();
  await serve(target('fastify')({ logger: { level: 'info', stream: options.stream } }), options.messages);
  console.log('Fastify 5 accepts logger options and preserves a supplied logger via loggerInstance.');
}

check().catch(error => { console.error(error); process.exitCode = 1; });
