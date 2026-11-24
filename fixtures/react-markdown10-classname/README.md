# react-markdown 9.0.3 → 10.0.0

The logs viewer removed `className` from React Markdown and moved the classes to an outer `<div>`. The captured pins keep React and React DOM at 18.3.1.

- [Upstream change](https://github.com/retracedhq/logs-viewer/commit/ee68d8f1ef9fa2a5a9706c798b7fc9737a4b0c55)
- [Before lock](https://github.com/retracedhq/logs-viewer/blob/77ab819f9fc4fa592f8a5a396ad64d02652a6a1f/package-lock.json) and [after lock](https://github.com/retracedhq/logs-viewer/blob/ee68d8f1ef9fa2a5a9706c798b7fc9737a4b0c55/package-lock.json)
- [Official release notes](https://github.com/remarkjs/react-markdown/releases/tag/10.0.0)

## Reproduce

Run from this directory with Node.js 22 or newer.

```sh
npm ci --prefix before --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

The fixture renders real React server HTML. On 9.0.3 the old prop produces a classed wrapper. On 10.0.0 the same prop no longer produces the wrapper or its class. Moving the class to an explicit wrapper reproduces the exact HTML, including the Markdown content. Unstyled Markdown renders without an extra wrapper in either version.

In the recipient, inspect classes and attributes on any existing wrapper and preserve selectors that depend on the rendered structure. Run the real page or component render after the patch.
