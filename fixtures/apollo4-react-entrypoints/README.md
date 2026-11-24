# Move Apollo's React bindings to their v4 entry point

The pinned Apollo Odyssey migration splits React imports from the root client APIs. Its client locks resolve @apollo/client 3.9.5 and 4.2.10. The target lock includes RxJS 7.8.2.

The fixture seeds an in-memory cache and renders a cache-only query with React 18.3.1 held. The original root imports render the expected HTML with 3.9.5. On 4.2.10, the held root import produces an invalid element type. Using the React entry point for ApolloProvider and useQuery restores identical HTML. A throwing link makes any unintended network use fail the test.

Move React providers and hooks to @apollo/client/react. Keep the core client, cache, and gql imports at the package root. Satisfy the target version's RxJS peer requirement using the receiving workspace's package, and verify a representative query.

The reproduction uses Node 24.18.0 and npm 11.16.0, with GraphQL 16.14.2 held for both arms. It exercises cache-only SSR markup. HTTP links, subscriptions, and the testing entry point have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Apollo Odyssey migration](https://github.com/apollographql/odyssey-lift-off-part1/commit/1852b6eaf9fde63f6eb13ad3491c162fc524b843)
- [Apollo Client 4 migration guide](https://www.apollographql.com/docs/react/migrating/apollo-client-4-migration)
