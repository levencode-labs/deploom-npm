'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { createServer } = require('node:net');

const legacy = require('./before/node_modules/redis');
const modern = require('./after/node_modules/redis');
assert.equal(require('./before/node_modules/redis/package.json').version, '3.1.2');
assert.equal(require('./after/node_modules/redis/package.json').version, '4.7.1');

const info = '# Server\r\nredis_version:7.2.0\r\n# Persistence\r\nloading:0\r\n';
const replies = new Map([
  ['INFO', '$' + Buffer.byteLength(info) + '\r\n' + info + '\r\n'],
  ['PING', '+PONG\r\n'],
  ['QUIT', '+OK\r\n'],
  ['CLIENT', '+OK\r\n'],
]);

// Only the startup and ping commands of the pinned clients are exercised.
async function main() {
  const server = createServer((socket) => {
    socket.setEncoding('utf8');
    socket.setTimeout(5000, () => socket.destroy());
    let pending = '';
    socket.on('data', (data) => {
      pending += data;
      const parts = pending.split('\r\n');
      let consumed = 0;
      while (parts[consumed]?.startsWith('*')) {
        const end = consumed + 1 + 2 * Number(parts[consumed].slice(1));
        if (end >= parts.length) break;
        const command = parts[consumed + 2].toUpperCase();
        const reply = replies.get(command);
        assert.ok(reply, 'Unexpected Redis command: ' + command);
        socket.write(reply);
        consumed = end;
      }
      pending = parts.slice(consumed).join('\r\n');
    });
  });
  const host = '127.0.0.1';
  server.listen(0, host);
  await once(server, 'listening');
  const { port } = server.address();
  try {
    const oldClient = legacy.createClient({ host, port, retry_strategy: () => false });
    try {
      const reply = await new Promise((resolve, reject) => {
        oldClient.ping((error, value) => error ? reject(error) : resolve(value));
      });
      assert.equal(reply, 'PONG');
    } finally {
      oldClient.end(true);
    }

    const client = modern.createClient({ socket: { host, port, reconnectStrategy: false } });
    try {
      assert.equal(client.isOpen, false);
      await assert.rejects(client.ping(), { name: 'Error', message: 'The client is closed' });
      await client.connect();
      assert.equal(client.isReady, true);
      assert.equal(await client.ping(), 'PONG');
    } finally {
      if (client.isOpen) await client.quit();
    }
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }

  console.log('Redis 4 restores PONG after awaiting the explicit connection.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
