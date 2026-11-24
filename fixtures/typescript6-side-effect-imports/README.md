# Declare CSS side-effect imports on TypeScript 6

The pinned Next.js monorepo imports its global stylesheet through a side-effect import. TypeScript 5.9.2 accepts the isolated import with the option unset. TypeScript 6.0.3 reports TS2882 under the same default. With a filename-specific global.d.css.ts declaration and allowArbitraryExtensions, the import typechecks. A misspelled import still reports TS2882.

Confirm that the bundler handles the asset, then declare that asset in the owning TypeScript project. Recheck the real import and a misspelled path before widening declarations. Run the owning typecheck and the bundle or route that loads the CSS.

This fixture verifies compiler resolution on Node 24.18.0 and npm 11.16.0. Full monorepo build and stylesheet rendering need their own run.

```sh
npm ci --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned global CSS import](https://github.com/belgattitude/nextjs-monorepo-example/blob/b7953382e5efc3173356bf977dfa6e88f28d8bfc/apps/nextjs-app/src/pages/_app.tsx)
- [TypeScript 6 default changes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html#simple-default-changes)
- [TypeScript arbitrary extensions](https://www.typescriptlang.org/tsconfig/allowArbitraryExtensions.html)
