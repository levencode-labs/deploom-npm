# TypeScript 6 rejects an explicit ES5 target

The strict and unstrict rule-test configurations in `eslint-plugin-jest` share an explicit ES5 target. This fixture uses their compiler options to compare the TypeScript 5.9.2 baseline with 6.0.3. Both configurations get TS5107 on the target compiler with options held. Using ES2015 clears that diagnostic. On TypeScript 6, `ignoreDeprecations: "6.0"` also clears it while keeping the ES5 target.

If the project can raise its runtime floor, change the affected config to ES2015 or newer and rerun the owning typecheck and tests. Projects that still emit ES5 can use the TypeScript 6 suppression while they plan the removal of the legacy target. The fixture checks compiler option validation. Runtime support and the full ESLint plugin suite require project checks.

Run from this directory with Node.js and npm. The local reproduction used Node 24.18.0 and npm 11.16.0. The package lock pins both compiler tarballs.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Strict source at 53507db5](https://github.com/jest-community/eslint-plugin-jest/blob/53507db5d43ebeda66b6a647427886d19305ccc8/src/rules/__tests__/fixtures/tsconfig.json)
- [Unstrict source at 53507db5](https://github.com/jest-community/eslint-plugin-jest/blob/53507db5d43ebeda66b6a647427886d19305ccc8/src/rules/__tests__/fixtures/unstrict/tsconfig.json)
- [TypeScript 6.0 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-6-0.html)
