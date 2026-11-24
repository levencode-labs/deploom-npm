# npm migration review В· Batch 003

Reviewed 100 exact npm pairs and qualified 96 records on Node.js 24.18.0 with npm 11.16.0.
The proof set includes 51 engine or peer checks and 45 API, shipped-migration, or behavior checks.
The [fixture](../../fixtures/npm-migrations-batch-003/README.md) includes source links and reproduction commands.

| Package | Exact pairs reviewed | Recipes |
| --- | ---: | ---: |
| `happy-dom` | 14 | 14 |
| `copy-webpack-plugin` | 3 | 3 |
| `react-dropzone` | 15 | 15 |
| `@storybook/react-vite` | 3 | 3 |
| `@vitest/ui` | 10 | 10 |
| `sinon` | 10 | 9 |
| `puppeteer` | 6 | 5 |
| `webpack-cli` | 1 | 1 |
| `stylelint` | 3 | 3 |
| `@sentry/webpack-plugin` | 6 | 5 |
| `@commitlint/cli` | 3 | 3 |
| `@commitlint/config-conventional` | 3 | 2 |
| `nx` | 21 | 21 |
| `@storybook/addon-a11y` | 2 | 2 |

## Reviewed pairs without an added recipe

- `sinon` `21.0.0 в†’ 22.0.0`. The exact release updates dependencies; the sampled fake timer defaults and already removed assertion property behave the same. No new change was qualified. [Source](https://github.com/sinonjs/sinon/releases/tag/v22.0.0)
- `puppeteer` `23.0.0 в†’ 24.0.0`. Both released core declarations already expose browser. No failing browser launch or other replacement was reproduced for this exact pair. [Source](https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-v24.0.0)
- `@sentry/webpack-plugin` `3.0.0 в†’ 4.0.0`. The documented getBuildInformation removal applies to bundler-plugin-core. Neither exact webpack-plugin entrypoint exports it. [Source](https://github.com/getsentry/sentry-javascript-bundler-plugins/releases/tag/4.0.0)
- `@commitlint/config-conventional` `19.0.0 в†’ 20.0.0`. The sampled conventional preset retains the same body-max-line-length setting. The URL rule behavior was verified for the CLI upgrade separately. [Source](https://github.com/conventional-changelog/commitlint/releases/tag/v20.0.0)

Records are staged for knowledge review.
