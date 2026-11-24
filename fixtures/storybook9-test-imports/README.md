# Keep play-function test utilities working in Storybook 9

The pinned graphty-monorepo upgrade moves the compact-mantine stories from `@storybook/test` to `storybook/test` and removes the old direct dependency. Its pnpm lock resolves Storybook 8.6.18 and `@storybook/test` 8.6.15 before the change and Storybook 9.1.20 after it.

The isolated npm fixture checks the same play-style interaction under each graph. The v8 import supports an accessible button query, a click, and an assertion on the mock handler. Keeping the old import after its package is removed produces `ERR_MODULE_NOT_FOUND`. The v9 subpath preserves the click, status text, and single handler invocation.

Change the imports in stories and helper modules owned by the upgraded workspace. Remove the standalone dependency once those imports move and the workspace has no remaining consumers. Run its Storybook build and a representative interaction test to verify the owning project.

The reproduction uses Node 24.18.0 and npm 11.16.0 with jsdom. It exercises the public imports and one DOM interaction. A full Storybook build, browser execution, and the upstream pnpm workspace are separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned compact-mantine Storybook 9 migration](https://github.com/graphty-org/graphty-monorepo/commit/441d1c3380cfe2916c5239211b71fbdec1fb3f83)
- [Storybook 9 migration guide](https://storybook.js.org/docs/9/releases/migration-guide)
