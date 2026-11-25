# npm CommonJS-to-ESM migration fixtures

For each exact pair, the old package loads with `require`, the target rejects that path with synchronous ESM loading disabled, and a dynamic `import()` resolves and evaluates the target module. This models CJS-only runners. Node versions with `require(esm)` enabled and individual default or named imports may behave differently.

Use Node.js 24.18.0. Run `npm ci --ignore-scripts --omit=optional --strict-peer-deps --no-audit --no-fund` in each arm and in `../npm-github-api-contracts/api` for the shared Nano ID installation. Then run `node check.cjs`.

- [Babel 8 ESM migration](https://babeljs.io/docs/v8-migration#esm-only)
- [Node.js CommonJS module loading](https://nodejs.org/api/modules.html#loading-ecmascript-modules-using-require)
- [Nano ID changelog](https://github.com/ai/nanoid/blob/main/CHANGELOG.md#40)
- [D3 changes](https://github.com/d3/d3/blob/main/CHANGES.md)
- [AI SDK migration guides](https://ai-sdk.dev/docs/migration-guides)

The lockfiles pin the default Node entry probe for the remaining packages. Read upstream release notes and check the symbols used by the receiving code before changing imports.
