# Keep Socket.IO v2 clients connected during the server upgrade

The pinned OpenVeo API migration enables allowEIO3 on its upgraded Socket.IO server. The npm lock resolves the server at 2.3.0 before the change and 4.1.2 after it. The old lock includes socket.io-client 2.3.0. The fixture also pins a 4.1.2 client to test the new path.

The real v2 client connects to the v2 server and round-trips an acknowledged event over HTTP polling. The default v4 server rejects the v2 handshake with Engine.IO code 5. allowEIO3: true restores the v2 handshake and event exchange. A v4 client exchanges the same event with both v4 configurations.

Use the compatibility setting for a staged rollout when deployed v2 clients still need to reach the upgraded server. Test the pinned old and new clients through the expected transport before removing the setting after client rollout. The fixture exercises polling on an ephemeral loopback listener. WebSocket upgrades, browser CORS, authentication and load-balancer routing require their own checks.

The replay pins Node 24.18.0 and npm 11.16.0.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned OpenVeo API upgrade](https://github.com/veo-labs/openveo-api/commit/b0e4738d0cf1b5369495e780422ffaf278413cd1)
- [Socket.IO rolling client migration](https://socket.io/docs/v4/migrating-from-2-x-to-3-0/#how-to-upgrade-an-existing-production-deployment)
