# Keep node-cron 4 tasks stopped until the application starts them

The pinned YouTube Agent migration replaces schedule(..., { scheduled: false }) with createTask() in deferred job setup. Its npm lock resolves node-cron 3.0.3 before and 4.6.0 after the update.

Three tasks are registered for the same schedule. The held schedule() form on node-cron 4 runs a callback before any explicit start. At that moment the old v3 task and the migrated v4 task have run no callbacks. After the test calls start() on both, their callbacks run on the next eligible ticks.

Apply to jobs intended to stay stopped until startup, user activation or another explicit gate. Construct a task with createTask(), preserve the existing start() call, and test that the callback runs only after that call. Review schedule(), time zones and task options independently for jobs meant to start automatically.

The reproduction pins Node 24.18.0 and npm 11.16.0 and uses one-second real local scheduler ticks with bounded waits. Production cron expressions, background workers, shutdown promises and daylight-saving behavior require separate verification.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned YouTube Agent node-cron migration](https://github.com/swaroopchandrashekar13/youtube-agent/commit/5614e64e0e45dd2518df252ae07ad798a420b2c1)
- [node-cron v3 to v4 startup behavior](https://www.nodecron.com/migrating-from-v3.html)
