# Connect the Redis 4 client before issuing commands

The pinned Hobbyfiles migration adds an awaited connection in the broker startup path. The preceding npm lockfile resolves redis 3.1.2. The new Yarn lockfile resolves redis 4.7.1. The isolated reproduction uses those releases through npm.

The actual v3 client connects implicitly and a callback PING returns PONG. The v4 client rejects the same command before connection. Awaiting connect() before the first Promise-based command restores PONG and the ready state. Both clients use a loopback protocol stub with just the startup and ping replies needed for the test.

Apply when startup relies on a client that connected during createClient(), and the upgrade uses the v4 Promise API. Configure the client, register error handling, and await connect() before serving code that uses it. Verify the application waits for Redis readiness and that its failure and shutdown paths behave as intended. A PING is the first targeted smoke check.

The fixture pins Node 24.18.0 and npm 11.16.0. A real Redis deployment, authentication, TLS, retry policy, Pub/Sub and failover need separate integration coverage.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Hobbyfiles Redis migration](https://github.com/apoapostolov/Hobbyfiles/commit/74381499c3627127ce31aa48b57d0daa9082a296)
- [Official node-redis v3 to v4 guide](https://github.com/redis/node-redis/blob/master/docs/v3-to-v4.md)
