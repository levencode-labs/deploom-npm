'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:http');

const legacyServer = require('./before/node_modules/socket.io');
const legacyClient = require('./before/node_modules/socket.io-client');
const { Server } = require('./after/node_modules/socket.io');
const { io: modernClient } = require('./after/node_modules/socket.io-client');

assert.equal(require('./before/node_modules/socket.io/package.json').version, '2.3.0');
assert.equal(require('./before/node_modules/socket.io-client/package.json').version, '2.3.0');
assert.equal(require('./after/node_modules/socket.io/package.json').version, '4.1.2');
assert.equal(require('./after/node_modules/socket.io-client/package.json').version, '4.1.2');

const sample = { name: 'fixture', sequence: 12 };

function exchange(connect, url) {
  const client = connect(url, {
    autoConnect: false,
    forceNew: true,
    reconnection: false,
    timeout: 2500,
    transports: ['polling'],
  });
  return new Promise((resolve, reject) => {
    const deadline = setTimeout(() => finish(new Error('Echo deadline exceeded')), 5000);
    function finish(error, response) {
      clearTimeout(deadline);
      client.disconnect();
      if (error) reject(error);
      else resolve(response);
    }
    client.once('connect_error', finish);
    client.once('connect', () => client.emit('fixture-echo', sample, (payload) => finish(null, payload)));
    client.connect();
  });
}

async function withServer(makeServer, run) {
  const server = createServer();
  const io = makeServer(server);
  io.on('connection', (client) => {
    client.on('fixture-echo', (payload, done) => done(payload));
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    return await run(io, 'http://127.0.0.1:' + server.address().port);
  } finally {
    await new Promise((resolve) => io.close(resolve));
  }
}

async function main() {
  await withServer(legacyServer, async (_io, url) => {
    assert.deepEqual(await exchange(legacyClient, url), sample);
  });

  await withServer((server) => new Server(server), async (io, url) => {
    const errors = [];
    io.engine.on('connection_error', (error) => errors.push(error.code));
    await assert.rejects(exchange(legacyClient, url), /xhr poll error/);
    assert.deepEqual(errors, [5]);
    assert.deepEqual(await exchange(modernClient, url), sample);
  });

  await withServer((server) => new Server(server, { allowEIO3: true }), async (_io, url) => {
    assert.deepEqual(await exchange(legacyClient, url), sample);
    assert.deepEqual(await exchange(modernClient, url), sample);
  });
  console.log('Socket.IO 4 preserves legacy polling with allowEIO3 and keeps modern clients working.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
