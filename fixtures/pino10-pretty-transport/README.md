# Preserve pretty logging when upgrading Pino

The pinned bangumi-list-v3 logger migration replaces prettyPrint with a pino-pretty transport. Its npm locks record Pino 6.14.0 and 10.1.0 with pino-pretty 7.6.1 and 13.1.3, respectively.

The fixture sends one structured info event through the old option. Keeping it on Pino 10.1.0 fails at logger construction. A pino-pretty worker transport preserves the message, severity, and custom field. The fixture waits for the worker to close before checking its output. A plain logger without a transport still emits a JSON event.

Move the pretty options to the pino-pretty transport where readable output is required. Keep structured JSON sinks unchanged. Verify a sample event and let the worker drain before asserting output. Review shutdown and worker resolution in the receiving deployment.

The reproduction uses Node 24.18.0 and npm 11.16.0. It checks one stdout event. The application's file destination, rotation, and HTTP logging have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned bangumi-list-v3 logger migration](https://github.com/wxt2005/bangumi-list-v3/commit/c5ba8447a930c26390fbc4e304d48b9ed8d4af11)
- [Pino pretty transport setup](https://github.com/pinojs/pino-pretty#programmatic-integration)
- [Pino 8 release](https://github.com/pinojs/pino/releases/tag/v8.0.0)
