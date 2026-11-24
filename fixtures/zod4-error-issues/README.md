# Preserve validation responses when adopting Zod 4

The pinned AwesomeIntune subscription route builds its HTTP 400 message from the first Zod validation issue. With Zod 3.25.76 the old errors alias reaches the expected response. The held access throws on Zod 4.6.7, before the response is built. Reading issues restores HTTP 400 and the configured message. The success branch and the fixture's invalid field path are also checked.

Find consumers of ZodError.errors after safeParse and in caught validation errors. Read issues and preserve the owning API's status, fields and custom messages. Use an invalid request and a valid request as targeted checks before retaking snapshots.

The fixture tests the validation and response decision in isolation with Node 24.18.0 and npm 11.16.0. Full endpoint handling and external notification services need separate checks.

```sh
npm ci --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned AwesomeIntune Zod migration](https://github.com/ugurkocde/AwesomeIntune/commit/c980a77e4863578f3a26281d9c20505bc43b1e01)
- [Zod 4 error migration guide](https://zod.dev/v4/changelog#zoderror)
