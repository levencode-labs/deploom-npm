# Keep generated CSS when migrating a Sass @import to @use

The pinned OpenFeature lockfile update records Dart Sass 1.79.5 and 1.80.0. The shared-properties pattern comes from the pinned animate.scss migration to Sass modules. The fixture uses a module namespace for the shared variable.

The old import produces CSS without deprecation warnings on 1.79.5. On 1.80.0 it produces the same CSS with an `import` warning. Marking that deprecation fatal makes compilation fail. Switching to `@use` and qualifying the variable restores identical CSS in strict mode. Switching the directive alone fails with an undefined variable.

Load the module with `@use` and qualify its variables where they are consumed. Compare the generated CSS, including selector order and any duplicated rules, across the owning entry points. Make the import deprecation fatal in the focused check when the build supports it.

The reproduction uses Node 24.18.0 and npm 11.16.0. It exercises an isolated entry and one variable-only module via the Sass compiler API. The receiving projects, CSS emitted from shared modules, and bundler-specific import resolution have their own verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned OpenFeature Sass lockfile transition](https://github.com/open-feature/openfeature.dev/commit/d003203fde0c5dca8785294c3dc487684ade8e6a)
- [Pinned animate.scss module migration](https://github.com/geoffgraham/animate.scss/commit/73c8f051650aea4d9d144ef4699fea8aa345e809)
- [Dart Sass @import deprecation](https://sass-lang.com/documentation/breaking-changes/import/)
