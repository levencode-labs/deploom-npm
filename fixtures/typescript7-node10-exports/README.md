# TypeScript 7 NodeNext package exports

Use Node.js 24 and pnpm 12.15.0. The fixture checks the resolved TypeScript versions before compiling. The last argument is an existing scratch directory.

```sh
pnpm install --frozen-lockfile --ignore-scripts
node check.cjs node_modules/typescript6/bin/tsc node_modules/typescript7/bin/tsc /path/to/scratch
```

The fixture checks deprecated node10 under 6.0.3, removal under 7.0.2, and the public and private package entry points under NodeNext and Node.js. It uses a synthetic package with an exports map.

Sources

- [TypeScript 7.0 release notes](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)
- [Pinned TypeScript repository CI configuration](https://github.com/microsoft/TypeScript/blob/01f1a759d92b19ea7024776da02358995d56a7ff/.github/workflows/ci.yml)
