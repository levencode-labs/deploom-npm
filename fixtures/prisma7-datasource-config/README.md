# Move datasource URLs from the schema to Prisma 7 CLI config

The pinned charityBox migration moves the PostgreSQL URL to prisma.config.ts and configures it only when the environment variable is present. The fixture uses each exact Prisma release's schema WASM validator. Prisma 6.19.3 accepts the old datasource field. Prisma 7.10.0 rejects it with the published datasource URL diagnostic. Removing the field allows schema validation. The Prisma 7 config loader resolves the schema path and reads the configured URL. It also loads the config when the URL is absent.

Move the datasource URL to the Prisma config used by the owning workspace. Load required environment values explicitly. For builds that generate a client before credentials exist, keep config loading possible without them. Verify schema validation and generation at build time. Before running database commands, verify the datasource URL and the configured runtime adapter against a controlled database.

The fixture uses Node 24.18.0 and npm 11.16.0. It reads the exact WASM builds pinned by the Prisma packages and executes only the fixture config. Separate acceptance covers CLI bootstrap, native engine downloads, client generation, adapters and database connectivity.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned charityBox upgrade](https://github.com/NoStackApp/charityBox/commit/c2b0fe34b410c90ba219391eaf4c88856c1f4a75)
- [Prisma ORM 7 migration guide](https://www.prisma.io/docs/guides/upgrade-prisma-orm/v7)
- [Prisma 6 validator release identity](https://github.com/prisma/orm/blob/6.19.3/packages/internals/package.json)
- [Prisma 7 WASM validation entry point](https://github.com/prisma/orm/blob/7.10.0/packages/internals/src/engine-commands/validate.ts)
