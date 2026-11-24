# Preserve an Express catch-all that includes the root

The pinned chasi-ts upgrade replaces a bare wildcard in an app-level catch-all with an optional named wildcard. The fixture pins the two dependency versions named in the upstream manifest ranges, Express 4.18.1 and 5.2.1. It uses a local HTTP server and checks actual responses.

The Express 4 fallback handles both the root and a nested miss. Keeping the bare wildcard on Express 5 throws during route registration. The named pattern `/*splat` handles nested misses but leaves the root to Express's default response. The optional named pattern `/{*splat}` preserves the fallback for both paths. The explicit health route and the nested POST fallback keep their behavior.

Use `/{*splat}` when the original fallback included the root. Use `/*splat` for a fallback intended to cover only non-root paths. Test the app's actual fallback responses alongside a more specific route. Review any code that reads wildcard captures separately because the representation changes in Express 5.

The reproduction uses Node 24.18.0 and npm 11.16.0. Its handler does not consume captures. The complete framework, optional routes and other Express 5 changes are outside the fixture.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned chasi-ts Express 5 migration](https://github.com/rocketbean/chasi-ts/commit/191ed9852042155f0f697ebbae77be33d65e9162)
- [Express 5 path syntax migration](https://expressjs.com/en/guide/migrating-5/#path-syntax)
