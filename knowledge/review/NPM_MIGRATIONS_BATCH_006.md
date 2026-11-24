# npm migration review В· Batch 006

Reviewed 100 exact npm pairs and qualified 45 records on Node.js 24.18.0 with npm 11.16.0.
The controls cover published engine and peer ranges, published declarations, an isolated Vite build, the Syncpack CLI, and a Chai plugin import.
The [fixture](../../fixtures/npm-migrations-batch-006/README.md) includes source links and reproduction commands.

| Package | Exact pairs reviewed | Recipes |
| --- | ---: | ---: |
| `postcss-preset-env` | 4 | 3 |
| `rollup-plugin-visualizer` | 2 | 1 |
| `@types/mocha` | 1 | 1 |
| `@storybook/addon-links` | 3 | 1 |
| `@sentry/vite-plugin` | 8 | 3 |
| `@types/react-test-renderer` | 2 | 1 |
| `@storybook/manager-api` | 1 | 0 |
| `jotai` | 2 | 2 |
| `eslint-plugin-simple-import-sort` | 6 | 0 |
| `@storybook/addon-actions` | 3 | 1 |
| `stylelint-scss` | 1 | 1 |
| `@storybook/addon-essentials` | 2 | 0 |
| `vite-plugin-pwa` | 2 | 2 |
| `eslint-webpack-plugin` | 3 | 3 |
| `vite-plugin-dts` | 5 | 1 |
| `mobx` | 1 | 0 |
| `vite-plugin-checker` | 1 | 1 |
| `eslint-plugin-sonarjs` | 6 | 0 |
| `madge` | 1 | 1 |
| `eslint-plugin-perfectionist` | 3 | 2 |
| `jscpd` | 1 | 0 |
| `axios-mock-adapter` | 1 | 0 |
| `mobx-react` | 3 | 1 |
| `@hello-pangea/dnd` | 3 | 1 |
| `@storybook/react-webpack5` | 4 | 3 |
| `syncpack` | 12 | 5 |
| `@types/big.js` | 1 | 1 |
| `chai-as-promised` | 1 | 1 |
| `react-resize-detector` | 3 | 2 |
| `plop` | 1 | 0 |
| `@microsoft/signalr` | 3 | 0 |
| `@docusaurus/core` | 1 | 1 |
| `@docusaurus/preset-classic` | 1 | 1 |
| `@types/chai-as-promised` | 1 | 1 |
| `parse-imports` | 1 | 1 |
| `react-highlight-words` | 1 | 0 |
| `react-youtube` | 3 | 2 |
| `tsc-watch` | 2 | 1 |

## Reviewed pairs without an added recipe

- `postcss-preset-env` `8.5.1 в†’ 9.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/postcss-preset-env/v/9.0.0)
- `rollup-plugin-visualizer` `5.14.0 в†’ 6.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/rollup-plugin-visualizer/v/6.0.0)
- `@storybook/addon-links` `8.0.0 в†’ 9.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/@storybook/addon-links/v/9.0.0)
- `@storybook/addon-links` `8.0.0 в†’ 10.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/@storybook/addon-links/v/10.0.0)
- `@sentry/vite-plugin` `3.0.0 в†’ 4.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@sentry/vite-plugin/v/4.0.0)
- `@sentry/vite-plugin` `3.0.0 в†’ 5.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@sentry/vite-plugin/v/5.0.0)
- `@sentry/vite-plugin` `4.0.0 в†’ 5.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@sentry/vite-plugin/v/5.0.0)
- `@sentry/vite-plugin` `0.7.2 в†’ 2.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@sentry/vite-plugin/v/2.0.0)
- `@sentry/vite-plugin` `2.23.0 в†’ 3.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@sentry/vite-plugin/v/3.0.0)
- `@types/react-test-renderer` `17.0.10 в†’ 18.3.2`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@types/react-test-renderer/v/18.3.2)
- `@storybook/manager-api` `7.6.17 в†’ 8.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@storybook/manager-api/v/8.0.0)
- `eslint-plugin-simple-import-sort` `11.0.0 в†’ 12.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/lydell/eslint-plugin-simple-import-sort/blob/main/CHANGELOG.md)
- `eslint-plugin-simple-import-sort` `11.0.0 в†’ 13.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/lydell/eslint-plugin-simple-import-sort/blob/main/CHANGELOG.md)
- `eslint-plugin-simple-import-sort` `11.0.0 в†’ 14.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/lydell/eslint-plugin-simple-import-sort/blob/main/CHANGELOG.md)
- `eslint-plugin-simple-import-sort` `12.0.0 в†’ 13.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/lydell/eslint-plugin-simple-import-sort/blob/main/CHANGELOG.md)
- `eslint-plugin-simple-import-sort` `12.0.0 в†’ 14.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/lydell/eslint-plugin-simple-import-sort/blob/main/CHANGELOG.md)
- `eslint-plugin-simple-import-sort` `13.0.0 в†’ 14.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/lydell/eslint-plugin-simple-import-sort/blob/main/CHANGELOG.md)
- `@storybook/addon-actions` `6.5.16 в†’ 7.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://storybook.js.org/docs/9/releases/migration-guide)
- `@storybook/addon-actions` `7.6.17 в†’ 8.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://storybook.js.org/docs/9/releases/migration-guide)
- `@storybook/addon-essentials` `6.5.16 в†’ 7.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/@storybook/addon-essentials/v/7.0.0)
- `@storybook/addon-essentials` `7.6.17 в†’ 8.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/@storybook/addon-essentials/v/8.0.0)
- `vite-plugin-dts` `4.0.0 в†’ 5.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://github.com/qmhc/unplugin-dts/releases)
- `vite-plugin-dts` `0.9.10 в†’ 1.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/qmhc/unplugin-dts/releases)
- `vite-plugin-dts` `1.7.3 в†’ 2.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/qmhc/unplugin-dts/releases)
- `vite-plugin-dts` `3.9.1 в†’ 4.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/qmhc/unplugin-dts/releases)
- `mobx` `6.16.1 в†’ 7.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/mobx/v/7.0.0)
- `eslint-plugin-sonarjs` `1.0.0 в†’ 2.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-sonarjs/v/2.0.0)
- `eslint-plugin-sonarjs` `1.0.0 в†’ 3.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-sonarjs/v/3.0.0)
- `eslint-plugin-sonarjs` `1.0.0 в†’ 4.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-sonarjs/v/4.0.0)
- `eslint-plugin-sonarjs` `2.0.0 в†’ 3.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/eslint-plugin-sonarjs/v/3.0.0)
- `eslint-plugin-sonarjs` `2.0.0 в†’ 4.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-sonarjs/v/4.0.0)
- `eslint-plugin-sonarjs` `3.0.0 в†’ 4.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-sonarjs/v/4.0.0)
- `eslint-plugin-perfectionist` `3.0.0 в†’ 4.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-perfectionist/v/4.0.0)
- `jscpd` `4.0.0 в†’ 5.0.4`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/jscpd/v/5.0.4)
- `axios-mock-adapter` `1.22.0 в†’ 2.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/axios-mock-adapter/v/2.0.0)
- `mobx-react` `7.6.0 в†’ 8.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/mobx-react/v/8.0.0)
- `mobx-react` `8.0.0 в†’ 9.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/mobx-react/v/9.0.0)
- `@hello-pangea/dnd` `17.0.0 в†’ 18.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://github.com/hello-pangea/dnd/releases)
- `@hello-pangea/dnd` `15.0.0 в†’ 16.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://github.com/hello-pangea/dnd/releases)
- `@storybook/react-webpack5` `8.0.0 в†’ 10.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/@storybook/react-webpack5/v/10.0.0)
- `syncpack` `14.0.0 в†’ 15.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `syncpack` `6.2.1 в†’ 7.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `syncpack` `7.2.2 в†’ 8.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `syncpack` `8.5.14 в†’ 9.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `syncpack` `9.8.6 в†’ 10.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `syncpack` `10.9.3 в†’ 11.2.1`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `syncpack` `11.2.1 в†’ 12.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- `react-resize-detector` `10.0.0 в†’ 11.0.1`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/react-resize-detector/v/11.0.1)
- `plop` `3.1.2 в†’ 4.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/plop/v/4.0.0)
- `@microsoft/signalr` `9.0.6 в†’ 10.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@microsoft/signalr/v/10.0.0)
- `@microsoft/signalr` `9.0.6 в†’ 11.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@microsoft/signalr/v/11.0.0)
- `@microsoft/signalr` `10.0.0 в†’ 11.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@microsoft/signalr/v/11.0.0)
- `react-highlight-words` `0.21.1 в†’ 1.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/react-highlight-words/v/1.0.0)
- `react-youtube` `9.0.3 в†’ 10.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/react-youtube/v/10.0.0)
- `tsc-watch` `4.6.2 в†’ 5.0.1`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/tsc-watch/v/5.0.1)

Records are staged for knowledge review.
