# Pinned npm migration scenarios · Batch 001

API cases replay a minimal use on the exact source and target pins. The engine, typings support, and optional peer cases check the published declarations. These checks cover the stated sample or manifest field. Project and platform compatibility still need recipient checks.

Run on Node.js 24.18.0 with npm 11.16.0.

```sh
for arm in p*/; do
  if [ "$arm" = "p05/" ]; then
    npm ci --prefix "$arm" --ignore-scripts --include=optional --no-audit --no-fund
  else
    npm ci --prefix "$arm" --ignore-scripts --omit=optional --no-audit --no-fund
  fi
done
node check.cjs
```

- [Commander 13](https://github.com/tj/commander.js/releases/tag/v13.0.0) and [Commander releases](https://github.com/tj/commander.js/releases)
- [Glob](https://github.com/isaacs/node-glob/blob/main/changelog.md) and [uuid](https://github.com/uuidjs/uuid/blob/main/CHANGELOG.md)
- [esbuild in 2024](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2024.md) and [esbuild in 2025](https://github.com/evanw/esbuild/blob/main/CHANGELOG-2025.md)
- [Globals 15](https://github.com/sindresorhus/globals/releases/tag/v15.0.0), [16](https://github.com/sindresorhus/globals/releases/tag/v16.0.0), and [17](https://github.com/sindresorhus/globals/releases/tag/v17.0.0)
- [Path-to-regexp](https://github.com/pillarjs/path-to-regexp/releases), [Dotenv](https://github.com/motdotla/dotenv/blob/master/CHANGELOG.md), and [Content Disposition](https://github.com/jshttp/content-disposition/releases)
- [Vite 7](https://v7.vite.dev/guide/migration), [Vite 8](https://vite.dev/guide/migration), [ESLint 10](https://eslint.org/docs/latest/use/migrate-to-10.0.0), and [typescript-eslint 8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/)
- [Chai 6](https://github.com/chaijs/chai/releases/tag/v6.0.0), [jsdom releases](https://github.com/jsdom/jsdom/releases), and [Vitest migration](https://vitest.dev/guide/migration/)
