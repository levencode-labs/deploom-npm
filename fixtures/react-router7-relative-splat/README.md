# Preserve relative sibling links under React Router splats

The pinned React Router documentation and tests capture path resolution below a multi-segment splat. At /dashboard/team under /dashboard/*, the fixture's relative reports link renders /dashboard/reports on v6.30.3. Enabling the v6 future flag reproduces the v7.18.4 default and renders /dashboard/team/reports. Splitting the named parent and the * child, then linking to ../reports, restores the previous sibling target. The absolute link stays stable across all four configurations.

Find relative links or navigations under multi-segment splats the project actually uses. Decide whether the link should address the current splat path or a sibling under the named parent. For sibling links, split the parent and child route where appropriate, adjust the relative target and test the actual href. Validate the index route separately if the owning route needs it.

The fixture holds React 18.3.1 on Node 24.18.0 and npm 11.16.0. It checks rendered hrefs. Browser navigation, loaders and redirects remain separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned React Router v6 path tests](https://github.com/remix-run/react-router/blob/c662ca366a414bf42624dd6cd20a7c414b2602e3/packages/react-router/__tests__/useResolvedPath-test.tsx)
- [React Router v6 upgrade guide](https://github.com/remix-run/react-router/blob/c662ca366a414bf42624dd6cd20a7c414b2602e3/docs/upgrading/future.md#v7_relativesplatpath)
