# npm migration review В· Batch 005

Reviewed 100 exact npm pairs and qualified 60 records on Node.js 24.18.0 with npm 11.16.0.
The controls cover published engine and peer ranges, configuration schemas, declarations, and exact package entry points.
The [fixture](../../fixtures/npm-migrations-batch-005/README.md) includes source links and reproduction commands.

| Package | Exact pairs reviewed | Recipes |
| --- | ---: | ---: |
| `style-loader` | 1 | 1 |
| `webpack-merge` | 1 | 1 |
| `storybook` | 2 | 0 |
| `fork-ts-checker-webpack-plugin` | 3 | 1 |
| `concurrently` | 3 | 3 |
| `postcss-loader` | 2 | 2 |
| `@storybook/react` | 2 | 2 |
| `webpack-dev-server` | 1 | 1 |
| `jquery` | 1 | 1 |
| `@storybook/addon-docs` | 2 | 1 |
| `sass-loader` | 2 | 2 |
| `react-error-boundary` | 1 | 0 |
| `mocha` | 2 | 2 |
| `happy-dom` | 11 | 1 |
| `webpack-bundle-analyzer` | 1 | 1 |
| `copy-webpack-plugin` | 2 | 2 |
| `@babel/plugin-proposal-export-default-from` | 1 | 1 |
| `@vitejs/plugin-react-swc` | 1 | 0 |
| `@vitest/ui` | 1 | 1 |
| `sinon` | 5 | 0 |
| `puppeteer` | 10 | 6 |
| `webpack-cli` | 2 | 2 |
| `@babel/plugin-transform-react-constant-elements` | 1 | 1 |
| `stylelint` | 2 | 2 |
| `@sentry/webpack-plugin` | 2 | 1 |
| `nx` | 5 | 0 |
| `jest-junit` | 4 | 1 |
| `@storybook/addon-a11y` | 1 | 1 |
| `css-minimizer-webpack-plugin` | 6 | 4 |
| `eslint-plugin-storybook` | 1 | 0 |
| `node-html-parser` | 3 | 2 |
| `react-test-renderer` | 1 | 1 |
| `stylelint-config-recommended` | 15 | 15 |
| `qrcode.react` | 2 | 1 |

## Reviewed pairs without an added recipe

- `storybook` `6.5.16 в†’ 7.0.0`. Compared the published CLI package contracts. Framework-specific Storybook migration cases need their own fixture. [Source](https://storybook.js.org/docs/8/migration-guide)
- `storybook` `7.6.17 в†’ 8.0.0`. Compared the published CLI package contracts. Framework-specific Storybook migration cases need their own fixture. [Source](https://storybook.js.org/docs/8/migration-guide)
- `fork-ts-checker-webpack-plugin` `7.3.0 в†’ 8.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/fork-ts-checker-webpack-plugin/v/8.0.0)
- `fork-ts-checker-webpack-plugin` `8.0.0 в†’ 9.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/fork-ts-checker-webpack-plugin/v/9.0.0)
- `@storybook/addon-docs` `7.6.17 в†’ 8.0.0`. The public blocks subpath persists in the compared releases. A docs authoring failure was not verified on the exact pair. [Source](https://storybook.js.org/docs/8/migration-guide)
- `react-error-boundary` `4.1.2 в†’ 5.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/react-error-boundary/v/5.0.0)
- `happy-dom` `2.55.0 в†’ 3.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `3.2.2 в†’ 4.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `4.1.0 в†’ 5.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `5.4.0 в†’ 6.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `6.0.4 в†’ 7.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `7.8.1 в†’ 8.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `8.9.0 в†’ 9.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `10.11.2 в†’ 11.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `11.2.0 в†’ 12.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `happy-dom` `12.10.3 в†’ 13.0.0`. Compared the source and target loader metadata. The archive checks did not verify a failing old DOM operation or import for this exact pair. [Source](https://github.com/capricorn86/happy-dom/releases)
- `@vitejs/plugin-react-swc` `3.11.0 в†’ 4.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/@vitejs/plugin-react-swc/v/4.0.0)
- `sinon` `13.0.2 в†’ 14.0.0`. Compared the exact published package contracts. The available checks did not replay an older stub, timer or sandbox failure for this release pair. [Source](https://github.com/sinonjs/sinon/blob/main/CHANGES.md)
- `sinon` `14.0.2 в†’ 15.0.0`. Compared the exact published package contracts. The available checks did not replay an older stub, timer or sandbox failure for this release pair. [Source](https://github.com/sinonjs/sinon/blob/main/CHANGES.md)
- `sinon` `15.2.0 в†’ 16.0.0`. Compared the exact published package contracts. The available checks did not replay an older stub, timer or sandbox failure for this release pair. [Source](https://github.com/sinonjs/sinon/blob/main/CHANGES.md)
- `sinon` `16.1.3 в†’ 17.0.0`. Compared the exact published package contracts. The available checks did not replay an older stub, timer or sandbox failure for this release pair. [Source](https://github.com/sinonjs/sinon/blob/main/CHANGES.md)
- `sinon` `17.0.1 в†’ 18.0.0`. Compared the exact published package contracts. The available checks did not replay an older stub, timer or sandbox failure for this release pair. [Source](https://github.com/sinonjs/sinon/blob/main/CHANGES.md)
- `puppeteer` `14.4.1 в†’ 15.0.0`. Compared the exact engine metadata and sampled interception, device and selector declarations. The sample did not establish an actionable failure for this pair. [Source](https://pptr.dev/CHANGELOG)
- `puppeteer` `15.5.0 в†’ 16.0.0`. Compared the exact engine metadata and sampled interception, device and selector declarations. The sample did not establish an actionable failure for this pair. [Source](https://pptr.dev/CHANGELOG)
- `puppeteer` `17.1.3 в†’ 18.0.0`. Compared the exact engine metadata and sampled interception, device and selector declarations. The sample did not establish an actionable failure for this pair. [Source](https://pptr.dev/CHANGELOG)
- `puppeteer` `20.9.0 в†’ 21.0.0`. Compared the exact engine metadata and sampled interception, device and selector declarations. The sample did not establish an actionable failure for this pair. [Source](https://pptr.dev/CHANGELOG)
- `@sentry/webpack-plugin` `2.23.0 в†’ 3.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/@sentry/webpack-plugin/v/3.0.0)
- `nx` `13.10.3 в†’ 14.0.0`. Checked the exact package contracts. A failing executor, workspace configuration or shipped migration case was not isolated. [Source](https://nx.dev/docs/reference/nx/migrations)
- `nx` `14.8.6 в†’ 15.0.0`. Checked the exact package contracts. A failing executor, workspace configuration or shipped migration case was not isolated. [Source](https://nx.dev/docs/reference/nx/migrations)
- `nx` `15.9.3 в†’ 16.0.0`. Checked the exact package contracts. A failing executor, workspace configuration or shipped migration case was not isolated. [Source](https://nx.dev/docs/reference/nx/migrations)
- `nx` `16.10.0 в†’ 17.0.0`. Checked the exact package contracts. A failing executor, workspace configuration or shipped migration case was not isolated. [Source](https://nx.dev/docs/reference/nx/migrations)
- `nx` `17.3.1 в†’ 18.0.0`. Checked the exact package contracts. A failing executor, workspace configuration or shipped migration case was not isolated. [Source](https://nx.dev/docs/reference/nx/migrations)
- `jest-junit` `13.2.0 в†’ 14.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/jest-junit/v/14.0.0)
- `jest-junit` `14.0.1 в†’ 15.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/jest-junit/v/15.0.0)
- `jest-junit` `15.0.0 в†’ 16.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/jest-junit/v/16.0.0)
- `css-minimizer-webpack-plugin` `6.0.0 в†’ 7.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/css-minimizer-webpack-plugin/v/7.0.0)
- `css-minimizer-webpack-plugin` `4.2.2 в†’ 5.0.0`. The declared engine and peer contracts match. The available archive checks did not verify a separate old API rejection. [Source](https://www.npmjs.com/package/css-minimizer-webpack-plugin/v/5.0.0)
- `eslint-plugin-storybook` `9.0.0 в†’ 10.0.0`. Compared the published manifests and the selected archive checks. No actionable source-to-target failure was established. [Source](https://www.npmjs.com/package/eslint-plugin-storybook/v/10.0.0)
- `node-html-parser` `7.0.1 в†’ 8.0.0`. The sampled deep HTMLElement path persists in both compared releases. No failure in the sampled entry points was established. [Source](https://github.com/taoqf/node-html-parser/releases)
- `qrcode.react` `2.0.0 в†’ 3.0.0`. The 3.0 declarations provide named renderers and retain the default component. The verified default export removal belongs to the 4.0 transition. [Source](https://github.com/zpao/qrcode.react/blob/trunk/CHANGELOG.md)

Records are staged for knowledge review.
