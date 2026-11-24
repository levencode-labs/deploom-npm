# npm migration controls, batch 004

This fixture checks 100 exact source and target pairs from a dependency transition list. Cache v2 claims are limited to the exact versions and the scenario described by each control.

Manifest controls verify archive integrity and exact package identity, then evaluate the published Node and peer ranges against concrete retained versions. Declaration and runtime controls use exact archived exports or npm-locked dependencies. Runtime controls invoke public package APIs on fixture-only inputs. The Axios control uses an in-process response adapter.

Run on Node.js 24.18.0 with npm 11.16.0. In each of the following directories run `npm ci --ignore-scripts --no-audit --no-fund`, then return to this directory and run `node check.cjs`.

```
p00 p02 p04 p05 p10 p12 p13 p16 p17 p18 p19 p20
p32 p35 p37 p38 p39 p42 p47
react-18.2.0 react-18.3.0 react-18.3.1 react-19.0.0
```

To independently verify the published receipts, place the archives for the exact identities in `facts.json` in a directory named `archives`. Archive names follow npm pack (scope prefix without the at sign, slashes replaced with hyphens). Run `python verify_facts.py archives` on Python 3.11 or later.

## Upstream migration material

- [TypeScript breaking changes](https://github.com/microsoft/TypeScript/wiki/Breaking-Changes)
- [TypeScript 6.0](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
- [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- [Babel 8 migration](https://babeljs.io/docs/v8-migration)
- [ESLint 9 migration](https://eslint.org/docs/latest/use/migrate-to-9.0.0)
- [Jest 30 upgrade guide](https://jestjs.io/docs/upgrading-to-jest30)
- [Prettier 3.0](https://prettier.io/blog/2023/07/05/3.0.0.html) and [3.5](https://prettier.io/blog/2025/02/09/3.5.0.html)
- [Redux Toolkit 2.0 migration](https://redux.js.org/usage/migrations/migrating-rtk-2)
- [Axios upgrade guide](https://github.com/axios/axios/blob/v1.x/docs/pages/getting-started/upgrade-guide.md)
- [Sentry 7 migration](https://github.com/getsentry/sentry-javascript/blob/develop/docs/migration/v6-to-v7.md)
