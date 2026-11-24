# npm migration review · Batch 001

The fixture checked 100 exact npm pairs on Node.js 24.18.0 and npm 11.16.0.
It produced 90 exact recipe records with pinned controls. See the [fixture](../../fixtures/npm-migrations-batch-001/README.md) for public source links and reproduction.

| Package | Exact pairs reviewed | Recipes |
| --- | ---: | ---: |
| `commander` | 6 | 6 |
| `@types/node` | 6 | 6 |
| `glob` | 6 | 4 |
| `uuid` | 10 | 10 |
| `esbuild` | 6 | 4 |
| `globals` | 6 | 6 |
| `path-to-regexp` | 3 | 3 |
| `dotenv` | 1 | 1 |
| `vite` | 3 | 3 |
| `eslint` | 1 | 1 |
| `@typescript-eslint/eslint-plugin` | 1 | 1 |
| `content-disposition` | 3 | 3 |
| `@typescript-eslint/parser` | 1 | 1 |
| `@eslint/js` | 1 | 0 |
| `axios` | 3 | 0 |
| `chai` | 1 | 1 |
| `date-fns` | 1 | 0 |
| `jsdom` | 36 | 35 |
| `vitest` | 5 | 5 |

## Reviewed pairs without an added recipe

- `glob` `11.0.0 → 12.0.0`. The changelog removes the unrestricted --shell option added in 11.1. The exact CSV source is 11.0.0 and does not establish that migration. [Source](https://github.com/isaacs/node-glob/blob/main/changelog.md#12)
- `glob` `13.0.0 → 14.0.0`. Both pins already omit the CLI. The Node engine change widens support for Node 18. No incompatible usage was reproduced in this case. [Source](https://github.com/isaacs/node-glob/releases/tag/v14.0.0)
- `esbuild` `0.19.12 → 0.20.0`. The documented Deno child-process change needs a Deno-specific replay. No Node recipe was established. [Source](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2024.md#0200)
- `esbuild` `0.23.1 → 0.24.0`. The documented macOS Catalina binary support drop needs an affected platform verification. The fixture ran on Windows. [Source](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2024.md#0240)
- `@eslint/js` `9.0.0 → 10.0.0`. The recommended map matches across the pins. Two deprecated stylistic rules leave the all preset. A replacement plugin and configuration were not replayed in this batch. [Source](https://eslint.org/docs/latest/use/migrate-to-10.0.0)
- `axios` `1.7.9 → 1.8.0`. Reviewed the release’s request and adapter changes. No source migration with a verified replacement was added. [Source](https://github.com/axios/axios/releases/tag/v1.8.0)
- `axios` `1.11.0 → 1.12.0`. Reviewed the fetch adapter, FormData and type changes. No source migration with a verified replacement was added. [Source](https://github.com/axios/axios/releases/tag/v1.12.0)
- `axios` `1.15.2 → 1.16.0`. Reviewed the published release. No source migration with a verified replacement was added. [Source](https://github.com/axios/axios/releases/tag/v1.16.0)
- `date-fns` `3.0.0 → 4.0.0`. The release describes time-zone features and warns about some type changes. No compatible old usage failing on the new pin was reproduced for this batch. [Source](https://blog.date-fns.org/v40-with-time-zone-support/)
- `jsdom` `23.0.0 → 24.0.0`. The release documents a selector engine revert. The sampled :has selectors succeeded on both installed pins; no replacement was qualified. [Source](https://github.com/jsdom/jsdom/releases/tag/24.0.0)

The records are staged for knowledge review. Project-level application checks and signed corpus promotion are separate.
