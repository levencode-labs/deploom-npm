# Preserve TypeScript aliases when removing baseUrl

The pinned Platformatic React Router fixture has baseUrl set to . and an explicit ~/* path mapped to ./app/*. TypeScript 5.9.2 accepts both the explicit alias and a bare local lookup. TypeScript 6.0.3 reports TS5101 with baseUrl present. Removing it preserves the explicit alias. The bare local lookup then reports TS2307. An explicit relative import restores that resolution.

Inspect the effective inherited configuration and the affected imports before removing baseUrl. Keep explicit mappings relative to the tsconfig that declares them. Replace bare local lookups with explicit aliases or relative imports. Run the owning workspace's typecheck and build, and verify that the runtime bundler resolves any alias you keep.

The fixture replays the relevant pinned compiler options and representative imports on Node 24.18.0 and npm 11.16.0. It checks TypeScript source resolution. The full Platformatic workspace and runtime bundler remain separate checks.

```sh
npm ci --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Platformatic tsconfig at 34658bc2](https://github.com/platformatic/platformatic/blob/34658bc2545841844db0e48673c19c3f6667342b/packages/react-router/test/fixtures/composer-autodetect-prefix/services/frontend/tsconfig.vite.json)
- [TypeScript 6 baseUrl migration](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#deprecated---baseurl)
