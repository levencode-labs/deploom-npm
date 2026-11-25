# Second batch of exact npm API and configuration cases

These fixtures pin the exact source and target npm versions and include an unchanged-use control. They cover API, configuration and loader behavior on Node.js 24.18.0. Install each arm using its lockfile with lifecycle scripts disabled, then run `node check.cjs`.

The loader cases exercise the default Node entrypoint with `require(esm)` disabled. Check the receiving loader and the specific named or default export when migrating.

## Upstream references

- [Babel 8 migration](https://babeljs.io/docs/v8-migration/) and [Next.js 16 ESLint Flat Config](https://nextjs.org/docs/app/guides/upgrading/version-16#eslint-flat-config)
- [i18next migration guide](https://www.i18next.com/misc/migration-guide), [webpack-node-externals allowlist](https://github.com/liady/webpack-node-externals#optionsallowlist), and [webpack-merge](https://github.com/survivejs/webpack-merge)
- [jwt-decode v4](https://github.com/auth0/jwt-decode/releases/tag/v4.0.0), [Sentry migration](https://docs.sentry.io/platforms/javascript/migration/v8-to-v9/), [Shiki migration](https://shiki.style/guide/migrate), and [SVGR migration](https://react-svgr.com/docs/migrate/)
- [History v5](https://github.com/remix-run/history/blob/main/docs/installation.md), [JS Cookie](https://github.com/js-cookie/js-cookie), [QR Code React](https://github.com/zpao/qrcode.react), and [lint-staged migration](https://github.com/lint-staged/lint-staged/blob/main/MIGRATION.md)

Each check exercises a representative input. Use the receiving project's own lint, builds and tests to confirm its behavior.
