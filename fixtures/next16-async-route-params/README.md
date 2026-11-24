# Await route and query parameters on Next.js 16

The pinned localcontacts migration converts params and searchParams to promises when moving from Next.js 14 to 16. The fixture replays that deep-link pattern with built Next.js apps on a temporary loopback port. Next.js 14.2.18 serves a valid ID and its edit/view query state. The same synchronous access on 16.4.2 returns 404 for a valid ID. Awaiting both inputs restores the two successful responses and preserves the 404 for a genuinely invalid ID.

Make the affected server page asynchronous and await its params and searchParams before interpreting fields. Check separately any metadata, layout or route handler with equivalent access. Exercise a valid dynamic route with and without a query option, and one invalid route.

The reproduction uses Node 24.18.0 and npm 11.16.0. It aligns React and React DOM to 18.3.1 for the baseline and 19.3.1 for the target, matching the upstream major change. The rest of localcontacts and the migration codemod are outside this fixture.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned localcontacts Next.js migration](https://github.com/capitalism-killed-software/localcontacts/commit/497d0f8390a3fc357d10bb5fb42abe3cc6014e54)
- [Next.js async request API migration](https://nextjs.org/docs/app/guides/upgrading/version-16#async-request-apis-breaking-change)
