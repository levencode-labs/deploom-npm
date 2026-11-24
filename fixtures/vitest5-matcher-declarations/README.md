# Align custom matcher declarations with Vitest 5

The pinned Advanced Vitest Patterns exercise augments `Matchers<T>` with a Zod schema matcher. On Vitest 3.2.4 it compiles. Holding that declaration on Vitest 5.0.0 reports TS2428. The two-parameter declaration `Matchers<R, T>` clears the error on Vitest 5. Using it on the baseline reproduces TS2428 in the opposite direction.

Update the declaration for the installed Vitest major and use `R` for the matcher return type. Run the owning typecheck. Verify an ordinary assertion, a `.resolves` assertion, asymmetric matching, and rejection of an invalid matcher argument. Projects supporting both majors need a strategy compatible with both declaration surfaces.

The fixture checks compiler behavior with TypeScript 5.9.2 and Vite 7.1.3 held. The local proof uses Node 24.18.0 and npm 11.16.0. Matcher runtime and the full course workspace remain separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Pinned course matcher at 00f33bd1](https://github.com/epicweb-dev/advanced-vitest-patterns/blob/00f33bd1844035a8cb79a043d07f4b1ef0f670e3/exercises/03.assertions/01.solution.custom-matchers/vitest.setup.ts)
- [Vitest migration guide](https://vitest.dev/guide/migration/)
