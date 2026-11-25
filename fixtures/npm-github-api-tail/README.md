# Exact npm API and configuration migration fixtures

The fixtures pin source and target releases, preserve the legacy usage as a negative control, and exercise the proposed migration on Node.js 24.18.0. Install each arm using the local lockfile with lifecycle scripts disabled, then run node check.cjs.

The loader cases disable synchronous require(esm). Check the receiving loader and actual export when migrating. The Angular check covers the compiler CLI binaries. The Remark 6 to 9 check covers the removed bundled CLI and the still-available JavaScript parser.

## Upstream guidance

- [Apollo Client 4](https://www.apollographql.com/docs/react/migrating/apollo-client-4-migration) documents a separate React entry point and the optional import codemod. The fixture verifies the resulting imports with a cache-only render. The codemod itself requires separate review and execution.
- [XState 5](https://stately.ai/docs/xstate/v5/migration), [Vue Test Utils 2](https://test-utils.vuejs.org/migration/index.html), [ethers 6](https://docs.ethers.org/v6/migrating/) and [node-cron scheduling](https://www.nodecron.com/scheduling-options.html) describe the API changes exercised here.
- The Cypress and Perfectionist checks cover the cited public config entry points and representative configured rules. Run the receiving project's normal lint to verify the full config stack. [Cypress ESLint plugin](https://github.com/cypress-io/eslint-plugin-cypress)
