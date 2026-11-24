# @testing-library/jest-dom 5.17.0 → 6.1.5

ktlog removed the `@testing-library/jest-dom/extend-expect` import from its test setup while updating from 5.17.0 to 6.1.5.

- [Upstream change](https://github.com/mahata/ktlog/commit/9f0585dbabadcc958a2a25b0861985cfecd68c05)
- [Before lock](https://github.com/mahata/ktlog/blob/d9ef0f44ac1732fedeaeee110cb21e6d0964540d/frontend/package-lock.json) and [after lock](https://github.com/mahata/ktlog/blob/9f0585dbabadcc958a2a25b0861985cfecd68c05/frontend/package-lock.json)
- [Official release notes](https://github.com/testing-library/jest-dom/releases/tag/v6.0.0)

## Reproduce

Run from this directory with Node.js 22 or newer.

```sh
npm ci --prefix before --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

With a global `expect` exposing its `extend` API, the pinned v5 package registers matchers from the old subpath. In v6 the same import throws `ERR_PACKAGE_PATH_NOT_EXPORTED`. The root import registers the matchers in the same setup.

Use the root import when the runner provides global `expect`. A non-global setup needs the runner-specific entry supported by the selected release. Run an existing DOM matcher test with the receiving runner. The fixture verifies real entry point loading and matcher registration in Node, with an instrumented global `expect`.
