# Preserve query keys when migrating TanStack Query to v5

The pinned Availity authorize hook converts positional useQuery and fetchQuery calls to options objects. The fixture holds React 18.3.1 and compares @tanstack/react-query 4.36.1 and 5.75.5. In v4, the positional calls render the expected initial data and resolve the nested local query. Holding those calls on v5 throws at the hook and rejects the client fetch with a missing query function. The options objects restore the result and store it under the intended cache key.

Convert the affected calls to objects with the same queryKey, queryFn and condition options. Inspect any imperative fetch inside a migrated query callback. Verify a disabled or initial-data render and check that the resolved data appears under the same cache key.

The fixture uses Node 24.18.0 and npm 11.16.0 with a local promise. It checks SSR and cache access. The owning application's asynchronous requests and hydration need their own checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Availity migration](https://github.com/Availity/availity-react/commit/a24b615cb063fffea8738a537d0efd4f91b2a1da)
- [TanStack Query v5 single-signature migration](https://tanstack.com/query/latest/docs/framework/react/guides/migrating-to-v5#supports-a-single-signature-one-object)
