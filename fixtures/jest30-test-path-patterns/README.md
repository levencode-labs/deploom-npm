# Preserve the test path filter when upgrading Jest to 30

Medusa invoked Jest through package scripts using `--testPathPattern`. Its upgrade from 29.7.0 to 30.5.2 changed those scripts to `--testPathPatterns`. This fixture confirms that Jest 30 rejects the old option. Both supported forms run the same single test. Removing the filter runs a deliberately failing second suite.

Replace the singular CLI flag in project scripts and CI while preserving the intended patterns. Compare the selected test inventory or run both a focused suite and an exclusion control. The fixture tests the CLI with isolated test files. It leaves Medusa integration tests to their existing project checks.

The local reproduction uses Node 24.18.0 and npm 11.16.0. Medusa uses Yarn. The fixture pins both npm graphs for the package-independent CLI behavior.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Medusa package script at e8762ca1](https://github.com/medusajs/medusa/blob/e8762ca18cff701830fa34ca3860f38b353a45f2/packages/core/framework/package.json)
- [Medusa migration](https://github.com/medusajs/medusa/pull/17618)
- [Jest 30 upgrade guide](https://jestjs.io/docs/30.0/upgrading-to-jest30)
