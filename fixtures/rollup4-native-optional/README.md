# Rollup 4 optional native package

authentik's web UI moved from Rollup `3.29.4` to `4.0.0`. The minimal fixture takes both exact Rollup versions and their optional dependency closures from the upstream lockfiles.

- [authentik upgrade commit](https://github.com/goauthentik/authentik/commit/58f52f92f841a9acd16cfaa8786336e154eb8085)
- [Before lock](https://github.com/goauthentik/authentik/blob/1351bfc6e9a014f732138dd92658e47bebf73562/web/package-lock.json) and [after lock](https://github.com/goauthentik/authentik/blob/58f52f92f841a9acd16cfaa8786336e154eb8085/web/package-lock.json)
- [Official migration guide](https://rollupjs.org/migration/)

## Reproduce

Use Node.js 22 or newer and npm on Linux x64 with glibc or Windows x64. Run from this directory.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --omit=optional --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs omitted
npm ci --prefix after --include=optional --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs restored
```

Rollup 3 still bundles when npm omits optional packages. Rollup 4 fails to load the package for the current platform. Including optional packages from the same lock installs the matching artifact and restores the same bundle.

If the correct artifact is absent from the lock, enabling optional dependencies alone may be insufficient. Inspect the lock and the build platform, including libc on Linux. Choose an installation permitted by the project and run its real build.
