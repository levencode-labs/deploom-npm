# Keep parsed options through Commander 7 options access

The pinned mite-cli migration upgrades Commander from 4.1.1 to 7.0.0 and reads options through program.opts() when dispatching CLI commands.

The fixture parses an explicit format and verbose flag plus a separate invocation with defaults. Direct reads from the Command instance return the expected options in v4 and lose the explicit values with default storage in v7. Using opts() preserves both invocations on both pinned versions, so the code edit can be verified before the package update. Explicitly enabling legacy property storage in v7 also preserves the direct reads as a control.

Read parsed options from program.opts(). Verify an explicit value, a boolean flag and the no-flag defaults. Check action callback arguments and subcommand inheritance separately where they matter.

The reproduction uses Node 24.18.0 and npm 11.16.0. It checks one small CLI and its root option parser.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned mite-cli migration](https://github.com/Ephigenia/mite-cli/commit/491cb6b8f48930596c54cf0e78f19cdf45fb29ed)
- [Commander 7 release](https://github.com/tj/commander.js/releases/tag/v7.0.0)
