# npm migration review · Batch 002

Reviewed 100 exact npm pairs and qualified 98 records on Node.js 24.18.0 with npm 11.16.0.
The proof set includes 55 engine or peer checks and 43 API, packaging, or default-behavior checks.
The [fixture](../../fixtures/npm-migrations-batch-002/README.md) includes source links and reproduction commands.

| Package | Exact pairs reviewed | Recipes |
| --- | ---: | ---: |
| `vitest` | 5 | 5 |
| `eslint-plugin-react-hooks` | 3 | 3 |
| `typescript-eslint` | 1 | 1 |
| `@vitejs/plugin-react` | 1 | 1 |
| `@testing-library/jest-dom` | 1 | 1 |
| `@testing-library/react` | 1 | 1 |
| `@playwright/test` | 9 | 8 |
| `react-router` | 1 | 1 |
| `postcss-import` | 1 | 1 |
| `@vitest/coverage-v8` | 10 | 10 |
| `sass` | 2 | 2 |
| `@sentry/browser` | 6 | 6 |
| `lint-staged` | 1 | 1 |
| `debounce` | 1 | 1 |
| `pdfjs-dist` | 1 | 1 |
| `query-string` | 1 | 1 |
| `@sentry/react` | 6 | 6 |
| `storybook` | 3 | 3 |
| `concurrently` | 1 | 1 |
| `@storybook/react` | 3 | 3 |
| `webpack-dev-server` | 1 | 1 |
| `@storybook/addon-docs` | 3 | 3 |
| `sass-loader` | 6 | 6 |
| `@faker-js/faker` | 1 | 1 |
| `eslint-plugin-jest` | 1 | 1 |
| `@storybook/builder-vite` | 3 | 3 |
| `@sentry/types` | 3 | 2 |
| `react-error-boundary` | 1 | 1 |
| `mocha` | 1 | 1 |
| `happy-dom` | 22 | 22 |

## Reviewed pairs without an added recipe

- `@playwright/test` `1.54.2 → 1.55.0`. The release ends support for Chromium extension manifest v2. A verified replacement needs an extension and both affected Chromium environments. [Source](https://github.com/microsoft/playwright/releases/tag/v1.55.0)
- `@sentry/types` `9.0.0 → 10.0.0`. Both published entrypoints redirect the sampled aliases to @sentry/core. The v10 guide's browser reporting changes do not establish a failing @sentry/types import for this pair. [Source](https://docs.sentry.io/platforms/javascript/migration/v9-to-v10/)

Records are staged for knowledge review.
