# webpack-dev-server 5 middleware hooks

Internxt Drive Desktop moved from `webpack-dev-server` `4.15.2` to `5.2.2` and replaced `onBeforeSetupMiddleware` with `setupMiddlewares`. Both source locks resolve Webpack to `5.100.2`. The isolated fixture copies the referenced lock entries for the two dev servers and Webpack.

- [Internxt migration](https://github.com/internxt/drive-desktop/commit/e153d32f97143a7deff599bc78685e6be67c3f9b)
- [Before lock](https://github.com/internxt/drive-desktop/blob/18502591bf060b6819f06b515676fdb3abc06326/package-lock.json) and [after lock](https://github.com/internxt/drive-desktop/blob/e153d32f97143a7deff599bc78685e6be67c3f9b/package-lock.json)
- [Official v5 migration guide](https://github.com/webpack/webpack-dev-server/blob/v5.2.2/migration-v5.md)

## Reproduce

From this directory, use Node.js 22 or newer and npm.

```sh
npm ci --prefix before --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

The test starts local dev servers on ephemeral loopback ports and checks that the hook runs once. A custom middleware intercepts one request to the compiled bundle URL. The regular request reaches the actual Webpack bundle. The 5.2.2 constructor rejects the unchanged legacy hook. The new hook adds middleware before the existing array and returns the array, recovering both responses.

The fixture contains a small HTTP app. It verifies hook registration and middleware order through a real bundle request. The recipient still needs to check its own side effects, proxy, HTTPS, and HMR settings.
