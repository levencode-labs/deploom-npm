# Keep HTTP mock bodies, status and headers after MSW 2

The pinned Strapi admin migration replaces `rest` handlers and response transformers with `http` and `HttpResponse`. Its lock pins MSW 1.3.0 and 2.13.4. The fixture also pins baseline `headers-polyfill` 3.2.1 to match Strapi. With a newer transitive version the old mock response fails before the handler migration can be compared.

Holding the old `rest.get` API on MSW 2 fails during handler setup. The migrated route uses the new `params` argument and returns `HttpResponse.json(body, { status, headers })`. The Node test reads the same successful and forbidden JSON responses, HTTP statuses, content type and custom header in both passing cases. An unexpected request hits the unhandled-request guard.

Move relevant handlers to `http` and replace composed status, header and JSON transformers with the corresponding response options. Preserve dynamic route parameters and test both success and error branches as observed by the real test HTTP client.

The reproduction uses Node 24.18.0 and npm 11.16.0 with intercepted loopback requests. The upstream Yarn graph, jsdom polyfills and browser worker setup have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Strapi admin MSW migration](https://github.com/strapi/strapi/commit/6d8305464708fd6182ba691dead733f2d52ca4a2)
- [MSW 2 release](https://github.com/mswjs/msw/releases/tag/v2.0.0)
- [MSW HttpResponse API](https://mswjs.io/api/http-response)
