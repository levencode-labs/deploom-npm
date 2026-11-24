# Pass GraphQL execution options as an object in GraphQL 16

The pinned Metaphysics upgrade changes positional graphql() calls to argument objects. Its Yarn lock pins graphql 15.8.0 before the change and 16.13.2 after it. The isolated fixture uses those releases through npm.

The old positional call resolves a selected named operation with root resolver, context and variable values. The held call rejects on v16 because GraphQL expects the schema inside the argument object. The object form preserves the same response on both pinned releases, so the edit can be verified before the dependency upgrade.

Use graphql({ schema, source, rootValue, contextValue, variableValues, operationName }) at positional call sites, carrying over the keys the application actually supplies. Run a request with multiple operations, at least one variable and a context-dependent resolver so omissions show up in the response.

The replay pins Node 24.18.0 and npm 11.16.0. It executes an in-process query. Transport, schema stitching and gateway integration require separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Metaphysics GraphQL upgrade](https://github.com/artsy/metaphysics/commit/af0ad5a9b74d2a63922190bfe2220dee4016a0a5)
- [GraphQL.js 15.8.0 execution signatures](https://github.com/graphql/graphql-js/blob/v15.8.0/src/graphql.js)
- [GraphQL.js 16.13.2 execution signature](https://github.com/graphql/graphql-js/blob/v16.13.2/src/graphql.ts)
