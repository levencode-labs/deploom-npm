# jsdom 27 virtual console forwarding

wvlet updated jsdom from `26.1.0` to `27.0.0` and rolled back after its Scala.js adapter tried to call `VirtualConsole.sendTo`. Version 1.1.0 of the adapter also passes `omitJSDOMErrors: true` and listens for `jsdomError` itself. The isolated fixture pins the same jsdom archives from the application lockfiles. It has its own frozen transitive dependency graph.

- [Upgrade](https://github.com/wvlet/wvlet/pull/1316) and [rollback](https://github.com/wvlet/wvlet/commit/a9c31a2eaaa8b77f9ddc817e9737fdc064cce7e5)
- [26.1.0 rollback lock](https://github.com/wvlet/wvlet/blob/a9c31a2eaaa8b77f9ddc817e9737fdc064cce7e5/package-lock.json) and [27.0.0 upgrade lock](https://github.com/wvlet/wvlet/blob/5436bb1445d839342280fca9134b00d54740650e/package-lock.json)
- [Adapter 1.1.0 source](https://github.com/scala-js/scala-js-env-jsdom-nodejs/blob/v1.1.0/jsdom-nodejs-env/src/main/scala/org/scalajs/jsenv/jsdomnodejs/JSDOMNodeJSEnv.scala)
- [Official jsdom 27.0.0 release notes](https://github.com/jsdom/jsdom/releases/tag/27.0.0)

## Reproduce

From this directory, use Node.js 22 or newer and npm.

```sh
npm ci --prefix before --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

The test sends a page console message and triggers a real jsdom error using the unimplemented `window.scrollTo`. The old setup forwards the log, suppresses forwarding of that error and still calls the explicit error listener. On 27.0.0, `sendTo` fails because the method was renamed. Changing the method alone with the old option forwards the error. `forwardTo(sink, { jsdomErrors: 'none' })` preserves all three original behaviors.

If the call belongs to an installed adapter, check the selected adapter's actual jsdom 27 support or keep jsdom at the working version. For application-owned code, match the virtual console receiver before changing it, and preserve the original error policy. Run the receiving project's tests. This replay exercises the Node API used by the adapter and does not run the Scala.js test suite.
