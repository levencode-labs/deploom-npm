# Await the Prettier 3 formatting result

The pinned `prettier-eslint` implementation calls `prettier.format` synchronously before handing output to its next formatting step. Its dependency range accepts 2.8.8. The fixture reduces the consumer to a string operation. It checks that Prettier 2.8.8 returns text, that consuming the 3.0.0 result synchronously throws, and that awaiting it preserves the formatted output. An invalid JavaScript sample checks rejection handling.

Await formatting before passing its result to ESLint, writing to disk, or applying string operations. Follow the changed return type through the wrapper and its callers, especially public synchronous interfaces. Verify a clean formatting example and a rejected parse. The fixture covers the direct format call. Configuration loading, plugin behavior, and downstream API compatibility require project checks.

The local reproduction uses Node 24.18.0 and npm 11.16.0.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [prettier-eslint source at d6ef3899](https://github.com/prettier/prettier-eslint/blob/d6ef3899aff970cc546ca88e708b7a3d2bd4121b/src/index.js)
- [Prettier 3.0 release notes](https://prettier.io/blog/2023/07/05/3.0.0/)
