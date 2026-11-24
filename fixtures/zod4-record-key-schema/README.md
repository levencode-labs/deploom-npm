# Supply the key schema when migrating Zod records

The pinned Desktop Commander schema includes a dictionary of string, number, boolean or null values, with an empty default. The reduced fixture uses TypeScript 6.0.3 to compare the declarations of Zod 3.25.76 and 4.6.7. The one-argument call compiles with Zod 3 and produces TS2554 with Zod 4.6.7. This particular Zod 4 version also retains a runtime fallback for the JavaScript call.

For a legacy `z.record(valueSchema)` with unrestricted string keys, use `z.record(z.string(), valueSchema)`. The explicit form compiles and preserves populated records, the missing and empty defaults, and rejection of an unsupported value. Run typecheck as well as parsing controls during migration. The fixture checks a data-only schema. JSON Schema conversion and the receiving project's remaining definitions require separate checks.

The local reproduction uses Node 24.18.0 and npm 11.16.0.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Pinned source at c2b87956](https://github.com/wonderwhy-er/DesktopCommanderMCP/blob/c2b87956217b58d170de58a0c951a3569b068ee3/src/tools/schemas.ts)
- [Zod 4 record migration guide](https://zod.dev/v4/changelog#zrecord)
