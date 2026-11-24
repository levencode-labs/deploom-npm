# Resolve custom rule scope from the AST node on ESLint 9

The pinned StyleX fix migrates its numeric expression check to SourceCode.getScope(node) and walks parent scopes to find an outer binding. The isolated rule accepts a numeric outer binding and rejects a string on ESLint 8.57.1. Its old context.getScope() implementation throws on ESLint 9.0.0. The node-aware API preserves both lint outcomes on ESLint 9.

Inspect rule visitors and shared helpers for context.getScope calls. Pass the relevant AST node to sourceCode.getScope and walk outward where the rule needs to resolve declarations outside the current scope. Run the owning rule tests with both valid and invalid inputs. If the plugin still supports older ESLint releases, validate that support separately.

This fixture exercises real ESLint scope analysis on Node 24.18.0 and npm 11.16.0. It does not run the full StyleX rule suite.

```sh
npm ci --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned StyleX rule fix and upstream regression case](https://github.com/meta/stylex/commit/cff92b434cf3b9ef21761aaf5ee0517de29fe819)
- [ESLint 9 migration guide](https://eslint.org/docs/latest/use/migrate-to-9.0.0#removed-multiple-context-methods)
