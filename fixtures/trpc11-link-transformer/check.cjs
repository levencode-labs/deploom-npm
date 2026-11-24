'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/@trpc/client/package.json').version, '10.45.4');
assert.equal(require('./after/node_modules/@trpc/client/package.json').version, '11.19.0');
assert.equal(require('./before/node_modules/@trpc/server/package.json').version, '10.45.4');
assert.equal(require('./after/node_modules/@trpc/server/package.json').version, '11.19.0');
assert.equal(require('./before/node_modules/superjson/package.json').version, '1.13.3');
assert.equal(require('./after/node_modules/superjson/package.json').version, '2.2.6');

const scenario = `
  import { once } from 'node:events';
  import { createServer } from 'node:http';
  import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';
  import { initTRPC } from '@trpc/server';
  import { createHTTPHandler } from '@trpc/server/adapters/standalone';
  import superjson from 'superjson';

  const t = initTRPC.create({ transformer: superjson });
  const router = t.router({
    appointment: t.procedure.query(() => ({
      scheduledAt: new Date('2026-01-14T12:30:00.000Z'),
    })),
  });
  const server = createServer(createHTTPHandler({ router }));
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  try {
    const url = 'http://127.0.0.1:' + server.address().port;
    const client = process.argv[1] === 'link'
      ? createTRPCProxyClient({ links: [httpBatchLink({ url, transformer: superjson })] })
      : createTRPCProxyClient({ transformer: superjson, links: [httpBatchLink({ url })] });
    const response = await client.appointment.query();
    const isDate = response.scheduledAt instanceof Date;
    process.stdout.write(JSON.stringify({
      isDate,
      iso: isDate ? response.scheduledAt.toISOString() : undefined,
      encodedDate: response.json?.scheduledAt,
    }));
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
`;

function run(arm, form) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', scenario, form], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const baseline = run('before', 'root');
assert.deepEqual(baseline, { isDate: true, iso: '2026-01-14T12:30:00.000Z' });

const held = run('after', 'root');
assert.equal(held.isDate, false);
assert.equal(held.encodedDate, baseline.iso);

const migrated = run('after', 'link');
assert.deepEqual(migrated, baseline);
console.log('tRPC 11 restores the HTTP response Date with SuperJSON configured on httpBatchLink.');
