# Keep dotenv startup output out of machine-readable logs

The pinned validator-ejector passes quiet: true to dotenv in the app and scripts. In this exact replay, dotenv 16.6.1 loads the file and emits no startup banner. Dotenv 18.0.8 keeps the JSON on stdout and adds an initialization banner on stderr. Passing quiet: true suppresses the banner and preserves the parsed value.

If a script or worker captures startup output, check stdout and stderr independently with its exact dotenv version. Use quiet: true on the relevant config call when the added output is unwanted. Verify the expected variables still load. Keep process diagnostics on the channel the caller expects.

The fixture uses a test-only file and an isolated output object on Node 24.18.0 and npm 11.16.0. It covers direct config calls. Preloads, CLI flags and intermediate dotenv releases have separate behavior.

```sh
npm ci --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned validator-ejector change](https://github.com/lidofinance/validator-ejector/commit/97b78b28b0bfe61cdbae42fd673b572946a2478f)
- [dotenv 18 changelog](https://github.com/motdotla/dotenv/blob/v18.0.8/CHANGELOG.md#1800-2026-09-17)
