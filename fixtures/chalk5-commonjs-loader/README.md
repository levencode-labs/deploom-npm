# Load Chalk 5 with dynamic import from a CommonJS CLI

The pinned Strapi SDK change keeps its CommonJS CLI and introduces a dynamic Chalk loader. Its pnpm lock pins Chalk 4.1.2 before the change and 5.6.2 after it. The isolated npm fixture uses the same package releases.

The old CommonJS require() returns a callable cyan helper. With synchronous require(ESM) disabled on the test runtime, the retained v5 require fails with ERR_REQUIRE_ESM. With it enabled, require() returns a module namespace and the old direct cyan access still fails. Dynamic import followed by its default export preserves both plain output and the exact ANSI-colored output in both modes.

Apply when the CLI must remain CommonJS and calls color helpers on the value returned by require('chalk'). Load the default export with native dynamic import before using the helpers. Check the emitted build if the CLI is transpiled, because some CommonJS builds turn an import expression into require(). Run a colored and a no-color command smoke check on the supported runtime.

The reproduction pins Node 24.18.0 and npm 11.16.0. The synchronous interoperability modes are selected with Node flags on the same runtime. Different Node versions, build-tool transforms and the full Strapi CLI need their own verification.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Strapi SDK Chalk migration](https://github.com/strapi/sdk-plugin/commit/938189b99d313bc93b131a66c0cc745f7a87944a)
- [Chalk 5 ESM release notes](https://github.com/chalk/chalk/releases/tag/v5.0.0)
