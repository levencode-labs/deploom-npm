# Pass a prepared Pino logger to Fastify 5 as loggerInstance

The pinned Synapse API moved its existing Pino logger from logger to loggerInstance. The fixture replays the constructor pattern with Fastify 4.29.1 and 5.12.5 and holds Pino 9.6.0. Fastify 4 accepts logger with the instance. The unchanged Fastify 5 call throws FST_ERR_LOG_INVALID_LOGGER_CONFIG. Passing loggerInstance preserves the response and the structured request log. Ordinary logger options remain valid in the logger field.

Determine whether the value is a configured logger instance or an options object before editing. Use loggerInstance for an instance and keep settings objects in logger. Verify application startup and one request with the expected level and fields.

The fixture uses in-process Fastify injection on Node 24.18.0 and npm 11.16.0. It covers logger registration and a request. Synapse initialization, transports and production serializers need separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Synapse API correction](https://github.com/Northlatch-Labs-LLC/synapse/commit/c228a8c41528e6be15838a033757e6d6423f394b)
- [Fastify 5 logger constructor migration](https://fastify.dev/docs/latest/Guides/Migration-Guide-V5/#new-logger-constructor-signature)
