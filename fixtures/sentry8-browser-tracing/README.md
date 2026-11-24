# Register Sentry BrowserTracing through the v8 factory

The pinned Ophis migration replaces the @sentry/tracing BrowserTracing constructor with browserTracingIntegration from @sentry/react. The workspace lock records @sentry/react and @sentry/tracing 7.120.4 before the upgrade and @sentry/react 8.55.2 after it.

The fixture registers BrowserTracing on both versions and routes a synthetic event through a local in-memory transport. The old @sentry/tracing import fails after that package is removed in the v8 install. The functional integration registers under the same BrowserTracing name and preserves the test event with no network calls.

Use browserTracingIntegration() from @sentry/react for this migration. Translate the integration options and confirm any framework-specific routing integration in the receiving application. Verify integration registration and a sample event with a local transport before testing real tracing.

The pinned project lock uses React 19.1.2. A strict npm install with that React version rejects SDK 7.120.4. The fixture asserts both peer declarations, including React 19 support declared by SDK 8.55.2. The runtime replay holds React 18.3.1 on both sides and uses Node 24.18.0, npm 11.16.0, and jsdom. It exercises SDK initialization and event dispatch in memory with automatic page and navigation instrumentation disabled. Trace spans, sampling and delivery through a real service have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Ophis Sentry upgrade](https://github.com/ophis-fi/ophis/commit/5a066f318eb0713023cc7bf99fff66dfd0e394fb)
- [Sentry React SDK 7 to 8 migration](https://docs.sentry.io/platforms/javascript/guides/react/migration/v7-to-v8/)
