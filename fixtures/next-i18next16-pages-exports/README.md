# Use the Pages Router entry points after upgrading next-i18next

The pinned next-i18next 15.4.2 package exposes appWithTranslation at its root. In 16.5.1 the root API serves the App Router and the old named export is absent. Import appWithTranslation from next-i18next/pages. The former serverSideTranslations subpath fails package export resolution. Use next-i18next/pages/serverSideTranslations for Pages Router data functions.

The fixture loads the same local namespace through the old and new server entry points and checks the translated title. If a workspace contains both routers, adjust only imports owned by Pages Router routes. Test one translated page and its namespace loading or hydration in the owning app.

The fixture uses Node 24.18.0 and npm 11.16.0. It covers the public exports and local namespace loading. Next.js route rendering, client hydration and language routing remain separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned v15.4.2 Pages Router example](https://github.com/i18next/next-i18next/blob/c55b8eb777ec201c8475c64af44a67cfd0c70a77/examples/simple/pages/_app.tsx)
- [Pinned v16.5.1 export map](https://github.com/i18next/next-i18next/blob/ad1642b69cf1f4ca3b03d0b235c2c4bf410acfb7/package.json)
- [next-i18next migration documentation](https://github.com/i18next/next-i18next/blob/ad1642b69cf1f4ca3b03d0b235c2c4bf410acfb7/README.md#migration-from-v15)
