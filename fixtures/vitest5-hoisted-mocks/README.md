# Vitest 5 hoisted mocking calls

This fixture compares Vitest `4.1.10` and `5.0.0` with Vite `7.3.6` in both dependency trees. The tests assert the exact transform error for nested `vi.mock`, `vi.unmock` and `vi.hoisted`. Top-level versions of these APIs and nested `vi.doMock` and `vi.doUnmock` remain valid.

```sh
npm ci --prefix v4 --ignore-scripts
npm ci --prefix v5 --ignore-scripts
node check.cjs
```

The fixture exercises the Node runner. The pinned ESLint plugin uses nested calls as inputs to the hoisted-apis-on-top rule.

- [Vitest migration guide](https://vitest.dev/guide/migration/#hoisted-mocking-calls-must-be-at-the-top-level)
- [Rule tests at c5df1054](https://github.com/vitest-dev/eslint-plugin-vitest/blob/c5df1054a25044a7ca5baf07461b7aee1f15f5f2/tests/hoisted-apis-on-top.test.ts)
