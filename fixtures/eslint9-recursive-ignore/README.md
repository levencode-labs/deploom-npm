# Preserve nested coverage ignores in ESLint 9

Express used an unqualified `coverage` entry in its legacy `.eslintignore`. ESLint 8.57.1 ignores both `coverage/report.js` and `test/coverage/report.js`. ESLint 9.0.0 defaults to flat config. With only the legacy files, it reports that the config is missing. A flat global ignore of `coverage/` preserves the root ignore and exposes the nested directory to lint. Using `**/coverage/` preserves both checks and leaves `src/covered.js` eligible.

For a migration that intends to preserve the recursive ignore, move the pattern to an object containing only `ignores` in the flat config. Verify a root coverage path, a nested coverage path, and an expected source path, then rerun the project lint command.

The fixture checks ignore classification through both ESLint versions. Full Express lint and tests require the receiving project. The local reproduction used Node 24.18.0 and npm 11.16.0.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Express source at 43fca52](https://github.com/expressjs/express/blob/43fca52d28a422c8be48fd489cbd4f2d6152bab6/.eslintignore)
- [ESLint config migration guide](https://eslint.org/docs/latest/use/configure/migration-guide#ignoring-files)
