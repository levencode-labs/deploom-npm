# Preserve notification formatting with date-fns 3 named imports

The pinned Royal Navy design-system migration replaces default date-fns subpath imports in its notification component with named imports from the package root. Its pnpm lock records 2.30.0 and 3.6.0.

The original default subpath imports type-check on 2.30.0. With TypeScript's bundler resolution and synthetic defaults disabled, 3.6.0 reports a missing default export in its declarations for all three imports. Its JavaScript fallback still bundles and runs. Named root imports pass the type check and yield the same formatted date, minute difference, and duration label under both versions. This check allows the import edit to be made before updating the dependency.

Convert the affected imports and keep the function calls and options. Run the owning type check and build, then check representative formatted values. Verify locales and custom date handling separately when present.

The reproduction uses Node 24.18.0, npm 11.16.0, TypeScript 5.9.2, and esbuild 0.25.12. It type-checks, bundles, and executes one small entry. The full design-system build and its browser and bundler configuration have their own verification needs.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Royal Navy date-fns migration](https://github.com/Royal-Navy/design-system/commit/919373e0b0ce97e0b04d2786a8ba52da0a1d99fd)
- [date-fns 3 named exports announcement](https://blog.date-fns.org/v3-is-out/#no-more-default-exports)
