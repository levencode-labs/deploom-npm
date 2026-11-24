# Move glob workspace discovery to the Promise API

The pinned Kasm registry migration replaces the callable CommonJS export and callback with the named glob export and await. Its processing lockfile resolves glob 7.2.3 before the change and 10.5.0 after it.

The fixture builds a temporary directory with direct and nested workspace descriptors, a different file in a workspace, and a descriptor outside the requested root. The v7 callback returns the two expected relative paths. The v10 module object is no longer callable. The named v10 function returns a Promise without calling the old callback. On Windows, v10 returns backslashes by default where v7 returned slashes. Awaiting the new function with posix: true preserves the two paths and their spelling.

Apply when the script loads glob through require() and passes a callback to the callable export. Destructure glob from require('glob'), await the matching Promise, and let errors reach the caller or its existing error handler. Specify posix: true if downstream code expects slash-delimited paths. Compare the actual selected file set including nested and excluded files. The test compares sets through sorting because match order is outside the claim.

The fixture pins Node 24.18.0 and npm 11.16.0. It exercises ordinary CommonJS matching with an explicit cwd. Dotfiles, symlinks, platform-specific pattern syntax and synchronous consumers require their own applicable checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Kasm Registry migration](https://github.com/alove4tech/kasm-registry/commit/eec529a0fe79b7df64d2509da44bace5017bc037)
- [glob v10.5.0 API](https://github.com/isaacs/node-glob/blob/v10.5.0/README.md)
