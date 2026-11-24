# npm migration review В· Batch 004

Reviewed 100 exact npm pairs and qualified 74 records on Node.js 24.18.0 with npm 11.16.0.
The proofs cover published engine and peer contracts, declaration changes, and controlled compiler, formatter, and API behavior.
The [fixture](../../fixtures/npm-migrations-batch-004/README.md) includes source links and reproduction commands.

| Package | Exact pairs reviewed | Recipes |
| --- | ---: | ---: |
| `@types/node` | 5 | 0 |
| `glob` | 4 | 3 |
| `@babel/types` | 1 | 1 |
| `typescript` | 9 | 9 |
| `globals` | 1 | 1 |
| `@babel/runtime` | 1 | 1 |
| `@babel/core` | 1 | 1 |
| `vite` | 7 | 5 |
| `react` | 4 | 1 |
| `rimraf` | 2 | 2 |
| `react-dom` | 3 | 1 |
| `eslint` | 3 | 2 |
| `@types/react` | 2 | 2 |
| `@typescript-eslint/eslint-plugin` | 2 | 2 |
| `@typescript-eslint/parser` | 2 | 2 |
| `prettier` | 2 | 2 |
| `@eslint/js` | 1 | 1 |
| `@types/react-dom` | 2 | 1 |
| `axios` | 1 | 1 |
| `chai` | 1 | 1 |
| `vitest` | 1 | 1 |
| `eslint-plugin-react-hooks` | 1 | 0 |
| `@vitejs/plugin-react` | 4 | 3 |
| `@types/chai` | 1 | 1 |
| `@babel/plugin-transform-modules-commonjs` | 1 | 1 |
| `@testing-library/dom` | 2 | 2 |
| `eslint-config-prettier` | 2 | 0 |
| `@testing-library/react` | 3 | 3 |
| `@babel/preset-typescript` | 1 | 1 |
| `react-router` | 2 | 1 |
| `@babel/preset-env` | 1 | 1 |
| `reselect` | 1 | 1 |
| `react-router-dom` | 2 | 1 |
| `postcss-import` | 2 | 2 |
| `redux` | 1 | 1 |
| `eslint-plugin-prettier` | 1 | 1 |
| `@types/jest` | 3 | 2 |
| `@types/eslint` | 1 | 1 |
| `big.js` | 1 | 1 |
| `react-redux` | 2 | 1 |
| `@babel/plugin-transform-runtime` | 1 | 1 |
| `react-markdown` | 3 | 2 |
| `@babel/preset-react` | 1 | 1 |
| `@sentry/browser` | 2 | 1 |
| `css-loader` | 1 | 1 |
| `@babel/plugin-proposal-decorators` | 1 | 1 |
| `@reduxjs/toolkit` | 2 | 1 |
| `babel-loader` | 2 | 2 |

## Reviewed pairs without an added recipe

- `@reduxjs/toolkit` `2.5.1 в†’ 2.6.0`. The release adds infinite queries. The old reducer probe only applies to the earlier 2.0 major boundary. [Source](https://github.com/reduxjs/redux-toolkit/releases/tag/v2.6.0)
- `@sentry/browser` `6.19.7 в†’ 7.0.0`. The official migration guide documents incompatible changes. The chosen archive checks did not establish an SDK_NAME removal on the exact pair. [Source](https://github.com/getsentry/sentry-javascript/blob/develop/docs/migration/v6-to-v7.md)
- `@types/jest` `28.1.8 в†’ 29.0.0`. The sampled timer and matcher declarations did not establish a change that would require edits on this exact pair. [Source](https://jestjs.io/docs/upgrading-to-jest29)
- `@types/node` `16.11.13 в†’ 17.0.0`. Published declarations track the Node release line. The exact pair did not establish a separate compiler-floor or API break. [Source](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/README.md)
- `@types/node` `16.11.41 в†’ 18.0.0`. Compared the declared TypeScript support information for both archives. A failing API or toolchain fixture remains to be established. [Source](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/README.md)
- `@types/node` `17.0.44 в†’ 18.0.0`. The archive comparison did not establish a changed TypeScript support floor. A Node API-specific case remains open. [Source](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/README.md)
- `@types/node` `18.16.3 в†’ 20.0.0`. The two declaration sets track different Node lines. A source construct rejected by the exact target remains to be verified. [Source](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/README.md)
- `@types/node` `20.14.12 в†’ 22.0.0`. A Node major match is relevant when choosing declarations. The archive comparison did not prove a breaking type change for this pair. [Source](https://github.com/DefinitelyTyped/DefinitelyTyped/blob/master/README.md)
- `@types/react-dom` `17.0.14 в†’ 18.0.0`. The sampled legacy render declaration remains available. New root APIs are part of a separate React migration. [Source](https://react.dev/blog/2022/03/08/react-18-upgrade-guide)
- `@vitejs/plugin-react` `3.1.0 в†’ 4.0.0`. The plugin changelog describes Fast Refresh and Vite compatibility changes. The checked peer ranges did not show a held peer rejected by the target. [Source](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md#400-2023-04-25)
- `eslint-config-prettier` `8.10.0 в†’ 9.0.0`. The exact peer checks did not isolate an excluded ESLint release. A rule configuration requiring an edit remains open. [Source](https://github.com/prettier/eslint-config-prettier/releases/tag/v9.0.0)
- `eslint-config-prettier` `9.1.0 в†’ 10.0.0`. The compared manifests did not establish an incompatible ESLint peer. No project-config failure was replayed. [Source](https://github.com/prettier/eslint-config-prettier/releases/tag/v10.0.0)
- `eslint-plugin-react-hooks` `4.6.2 в†’ 5.0.0`. The compared manifests did not reject a previously supported ESLint peer from the fixture set. A rule-level regression was not reproduced. [Source](https://github.com/facebook/react/releases/tag/eslint-plugin-react-hooks%405.0.0)
- `eslint` `9.21.0 в†’ 9.22.0`. The target adds defineConfig and helpers for global ignores. No rejected configuration was verified. [Source](https://eslint.org/blog/2025/03/eslint-v9.22.0-released/)
- `glob` `9.3.5 в†’ 10.0.0`. The project changelog identifies pattern-engine and export additions. The exact archive comparison did not isolate a rejected source contract. [Source](https://github.com/isaacs/node-glob/blob/main/changelog.md#1000)
- `react-dom` `18.2.0 в†’ 18.3.0`. The exact React and React DOM pair renders the same markup and emits a deprecation warning. The removed behavior has a separate React 19 fixture. [Source](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- `react-dom` `19.1.1 в†’ 19.2.0`. The React release notes cover React DOM changes. The controls did not isolate a rejected form of application code. [Source](https://react.dev/blog/2025/10/01/react-19-2)
- `react-markdown` `7.1.2 в†’ 8.0.0`. The changelog includes major-version changes. The current renderer checks did not prove one for these exact releases. [Source](https://github.com/remarkjs/react-markdown/blob/main/changelog.md)
- `react-redux` `7.2.8 в†’ 8.0.0`. The exact target ships TypeScript declarations. No independent break caused by holding the old consumer configuration was reproduced. [Source](https://github.com/reduxjs/react-redux/releases/tag/v8.0.0)
- `react-router-dom` `6.3.0 в†’ 6.4.0`. The release introduces data router APIs. The available fixture checks did not isolate an incompatible browser route. [Source](https://github.com/remix-run/react-router/releases/tag/react-router-dom%406.4.0)
- `react-router` `6.3.0 в†’ 6.4.0`. The release introduces data router APIs. A failing held route definition was not reproduced. [Source](https://github.com/remix-run/react-router/releases/tag/react-router%406.4.0)
- `react` `18.2.0 в†’ 18.3.0`. The controlled function defaultProps render preserves the output and adds a warning. React 19 removal is covered on its own transition. [Source](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
- `react` `18.3.0 в†’ 18.3.1`. The target adds the React act export and the fixture can invoke it. A previously accepted use was not found to fail. [Source](https://github.com/facebook/react/releases/tag/v18.3.1)
- `react` `19.1.1 в†’ 19.2.0`. The release notes describe new APIs and behavior. A previously accepted application construct was not reproduced as failing. [Source](https://react.dev/blog/2025/10/01/react-19-2)
- `vite` `3.2.5 в†’ 4.0.0`. The guide documents the Rollup upgrade and CSS default import deprecation. A failing fixture for a specific old configuration remains open. [Source](https://v4.vite.dev/guide/migration.html)
- `vite` `5.0.12 в†’ 5.1.0`. The documented runtime API is opt-in and experimental in 5.1. The archive comparison found no verified held engine or peer rejection. [Source](https://v5.vite.dev/guide/api-vite-runtime.html)

Records are staged for knowledge review.
