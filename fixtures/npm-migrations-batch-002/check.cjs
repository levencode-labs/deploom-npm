'use strict';
const assert = require('node:assert/strict');
const { check } = require('./checks.cjs');

const pairs = [
  ["vitest","2.0.0","4.0.0"],
  ["vitest","2.0.0","5.0.0"],
  ["vitest","3.0.0","4.0.0"],
  ["vitest","3.0.0","5.0.0"],
  ["vitest","4.0.0","5.0.0"],
  ["eslint-plugin-react-hooks","5.0.0","6.0.0"],
  ["eslint-plugin-react-hooks","5.0.0","7.0.0"],
  ["eslint-plugin-react-hooks","6.0.0","7.0.0"],
  ["typescript-eslint","7.0.0","8.0.0"],
  ["@vitejs/plugin-react","5.0.0","6.0.0"],
  ["@testing-library/jest-dom","7.0.0","8.0.0"],
  ["@testing-library/react","15.0.0","16.0.0"],
  ["@playwright/test","1.48.2","1.49.0"],
  ["@playwright/test","1.49.1","1.50.0"],
  ["@playwright/test","1.54.2","1.55.0"],
  ["@playwright/test","1.55.1","1.56.0"],
  ["@playwright/test","1.57.0","1.58.0"],
  ["@playwright/test","1.58.2","1.59.0"],
  ["@playwright/test","1.59.1","1.60.0"],
  ["@playwright/test","1.63.0","1.64.0"],
  ["@playwright/test","1.64.1","1.65.0"],
  ["react-router","7.0.0","8.0.0"],
  ["postcss-import","16.0.0","17.0.0"],
  ["@vitest/coverage-v8","1.0.0","2.0.0"],
  ["@vitest/coverage-v8","1.0.0","3.0.0"],
  ["@vitest/coverage-v8","1.0.0","4.0.0"],
  ["@vitest/coverage-v8","1.0.0","5.0.0"],
  ["@vitest/coverage-v8","2.0.0","3.0.0"],
  ["@vitest/coverage-v8","2.0.0","4.0.0"],
  ["@vitest/coverage-v8","2.0.0","5.0.0"],
  ["@vitest/coverage-v8","3.0.0","4.0.0"],
  ["@vitest/coverage-v8","3.0.0","5.0.0"],
  ["@vitest/coverage-v8","4.0.0","5.0.0"],
  ["sass","1.91.0","1.92.0"],
  ["sass","1.106.1","1.107.0"],
  ["@sentry/browser","8.0.0","9.0.0"],
  ["@sentry/browser","8.0.0","10.0.0"],
  ["@sentry/browser","8.0.0","11.0.0"],
  ["@sentry/browser","9.0.0","10.0.0"],
  ["@sentry/browser","9.0.0","11.0.0"],
  ["@sentry/browser","10.0.0","11.0.0"],
  ["lint-staged","16.0.0","17.0.0"],
  ["debounce","3.0.0","4.0.0"],
  ["pdfjs-dist","5.0.375","6.0.227"],
  ["query-string","9.0.0","10.0.0"],
  ["@sentry/react","8.0.0","9.0.0"],
  ["@sentry/react","8.0.0","10.0.0"],
  ["@sentry/react","8.0.0","11.0.0"],
  ["@sentry/react","9.0.0","10.0.0"],
  ["@sentry/react","9.0.0","11.0.0"],
  ["@sentry/react","10.0.0","11.0.0"],
  ["storybook","8.0.0","9.0.0"],
  ["storybook","8.0.0","10.0.0"],
  ["storybook","9.0.0","10.0.0"],
  ["concurrently","9.0.0","10.0.0"],
  ["@storybook/react","8.0.0","9.0.0"],
  ["@storybook/react","8.0.0","10.0.0"],
  ["@storybook/react","9.0.0","10.0.0"],
  ["webpack-dev-server","5.0.0","6.0.0"],
  ["@storybook/addon-docs","8.0.0","9.0.0"],
  ["@storybook/addon-docs","8.0.0","10.0.0"],
  ["@storybook/addon-docs","9.0.0","10.0.0"],
  ["sass-loader","14.0.0","15.0.0"],
  ["sass-loader","14.0.0","16.0.0"],
  ["sass-loader","14.0.0","17.0.0"],
  ["sass-loader","15.0.0","16.0.0"],
  ["sass-loader","15.0.0","17.0.0"],
  ["sass-loader","16.0.0","17.0.0"],
  ["@faker-js/faker","9.0.0","10.0.0"],
  ["eslint-plugin-jest","28.0.0","29.0.0"],
  ["@storybook/builder-vite","8.0.0","9.0.0"],
  ["@storybook/builder-vite","8.0.0","10.0.0"],
  ["@storybook/builder-vite","9.0.0","10.0.0"],
  ["@sentry/types","8.0.0","9.0.0"],
  ["@sentry/types","8.0.0","10.0.0"],
  ["@sentry/types","9.0.0","10.0.0"],
  ["react-error-boundary","5.0.0","6.0.0"],
  ["mocha","11.0.0","12.0.0"],
  ["happy-dom","13.0.0","14.0.0"],
  ["happy-dom","13.0.0","15.0.0"],
  ["happy-dom","13.0.0","16.0.0"],
  ["happy-dom","13.0.0","17.0.0"],
  ["happy-dom","13.0.0","18.0.0"],
  ["happy-dom","13.0.0","19.0.0"],
  ["happy-dom","13.0.0","20.0.0"],
  ["happy-dom","13.0.0","21.0.0"],
  ["happy-dom","14.0.0","15.0.0"],
  ["happy-dom","14.0.0","16.0.0"],
  ["happy-dom","14.0.0","17.0.0"],
  ["happy-dom","14.0.0","18.0.0"],
  ["happy-dom","14.0.0","19.0.0"],
  ["happy-dom","14.0.0","20.0.0"],
  ["happy-dom","14.0.0","21.0.0"],
  ["happy-dom","15.0.0","16.0.0"],
  ["happy-dom","15.0.0","17.0.0"],
  ["happy-dom","15.0.0","18.0.0"],
  ["happy-dom","15.0.0","19.0.0"],
  ["happy-dom","15.0.0","20.0.0"],
  ["happy-dom","15.0.0","21.0.0"],
  ["happy-dom","16.0.0","17.0.0"]
];

async function main() {
  const observed = [];
  const probe = process.argv.includes('--probe');
  const expected = probe ? [] : require('./expected.json');
  if (!probe) assert.equal(expected.length, pairs.length);
  for (const [i, row] of pairs.entries()) {
    try {
      const result = await check(row) ?? null;
      if (!probe) assert.deepEqual(result, expected[i].report);
      observed.push({ row, report: result });
    } catch (error) {
      if (!probe) throw new Error(row.join(' ') + ': ' + error.message, { cause: error });
      observed.push({ row, error: error.message });
    }
  }
  if (probe) console.log(JSON.stringify(observed, null, 2));
  else {
    assert.deepEqual(observed, expected);
    console.log('Replayed ' + observed.length + ' exact version pairs');
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
