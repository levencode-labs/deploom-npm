# Repair the Webpack 4 build hash on supported OpenSSL 3 runtimes

The pinned VuePress 1.9.10 lock resolves its core's Webpack ^4.8.1 dependency to 4.46.0. Under Node 24.18.0 and OpenSSL 3.5.7, the default build hash in an isolated bundle fails with ERR_OSSL_EVP_UNSUPPORTED. Using SHA-256 in the fixture makes the original Webpack build succeed and isolates the failure to the hash path. Changing only Webpack to 4.47.0 makes the default build succeed and the resulting bundle execute. Forcing native-md4 after the upgrade reproduces the original failure.

For a project that must stay on Webpack 4, inspect the owning lock and resolve the actual Webpack copy loaded by its builder. Move that copy to 4.47.0 within its supported dependency range and rerun the affected build with the normal Node settings. Check for explicit native-md4 overrides and separate MD4 use in loaders. This fixture covers the compiler hash and executable output. The full VuePress build remains unverified.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned VuePress Webpack lock at 9fb4bb00](https://github.com/vuejs/vuepress/blob/9fb4bb00925d9409e6732118e996411c6a82c85d/yarn.lock#L16693-L16696)
- [Webpack 4.47.0 release](https://github.com/webpack/webpack/releases/tag/v4.47.0)
- [Node.js OpenSSL 3 release note](https://nodejs.org/en/blog/release/v17.0.0)
