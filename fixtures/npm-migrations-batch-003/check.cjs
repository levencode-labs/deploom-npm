'use strict';
const assert = require('node:assert/strict');
const { check } = require('./checks.cjs');

const pairs = [
  ["happy-dom", "16.0.0", "18.0.0"],
  ["happy-dom", "16.0.0", "19.0.0"],
  ["happy-dom", "16.0.0", "20.0.0"],
  ["happy-dom", "16.0.0", "21.0.0"],
  ["happy-dom", "17.0.0", "18.0.0"],
  ["happy-dom", "17.0.0", "19.0.0"],
  ["happy-dom", "17.0.0", "20.0.0"],
  ["happy-dom", "17.0.0", "21.0.0"],
  ["happy-dom", "18.0.0", "19.0.0"],
  ["happy-dom", "18.0.0", "20.0.0"],
  ["happy-dom", "18.0.0", "21.0.0"],
  ["happy-dom", "19.0.0", "20.0.0"],
  ["happy-dom", "19.0.0", "21.0.0"],
  ["happy-dom", "20.0.0", "21.0.0"],
  ["copy-webpack-plugin", "12.0.0", "13.0.0"],
  ["copy-webpack-plugin", "12.0.0", "14.0.0"],
  ["copy-webpack-plugin", "13.0.0", "14.0.0"],
  ["react-dropzone", "15.0.0", "16.0.0"],
  ["react-dropzone", "15.0.0", "17.0.0"],
  ["react-dropzone", "15.0.0", "18.0.0"],
  ["react-dropzone", "15.0.0", "19.0.0"],
  ["react-dropzone", "15.0.0", "20.0.0"],
  ["react-dropzone", "16.0.0", "17.0.0"],
  ["react-dropzone", "16.0.0", "18.0.0"],
  ["react-dropzone", "16.0.0", "19.0.0"],
  ["react-dropzone", "16.0.0", "20.0.0"],
  ["react-dropzone", "17.0.0", "18.0.0"],
  ["react-dropzone", "17.0.0", "19.0.0"],
  ["react-dropzone", "17.0.0", "20.0.0"],
  ["react-dropzone", "18.0.0", "19.0.0"],
  ["react-dropzone", "18.0.0", "20.0.0"],
  ["react-dropzone", "19.0.0", "20.0.0"],
  ["@storybook/react-vite", "8.0.0", "9.0.0"],
  ["@storybook/react-vite", "8.0.0", "10.0.0"],
  ["@storybook/react-vite", "9.0.0", "10.0.0"],
  ["@vitest/ui", "1.0.0", "2.0.0"],
  ["@vitest/ui", "1.0.0", "3.0.0"],
  ["@vitest/ui", "1.0.0", "4.0.0"],
  ["@vitest/ui", "1.0.0", "5.0.0"],
  ["@vitest/ui", "2.0.0", "3.0.0"],
  ["@vitest/ui", "2.0.0", "4.0.0"],
  ["@vitest/ui", "2.0.0", "5.0.0"],
  ["@vitest/ui", "3.0.0", "4.0.0"],
  ["@vitest/ui", "3.0.0", "5.0.0"],
  ["@vitest/ui", "4.0.0", "5.0.0"],
  ["sinon", "18.0.0", "19.0.0"],
  ["sinon", "18.0.0", "20.0.0"],
  ["sinon", "18.0.0", "21.0.0"],
  ["sinon", "18.0.0", "22.0.0"],
  ["sinon", "19.0.0", "20.0.0"],
  ["sinon", "19.0.0", "21.0.0"],
  ["sinon", "19.0.0", "22.0.0"],
  ["sinon", "20.0.0", "21.0.0"],
  ["sinon", "20.0.0", "22.0.0"],
  ["sinon", "21.0.0", "22.0.0"],
  ["puppeteer", "22.0.0", "23.0.0"],
  ["puppeteer", "22.0.0", "24.0.0"],
  ["puppeteer", "22.0.0", "25.0.2"],
  ["puppeteer", "23.0.0", "24.0.0"],
  ["puppeteer", "23.0.0", "25.0.2"],
  ["puppeteer", "24.0.0", "25.0.2"],
  ["webpack-cli", "6.0.0", "7.0.0"],
  ["stylelint", "16.0.0", "17.0.0"],
  ["stylelint", "16.0.0", "18.0.0"],
  ["stylelint", "17.0.0", "18.0.0"],
  ["@sentry/webpack-plugin", "3.0.0", "4.0.0"],
  ["@sentry/webpack-plugin", "3.0.0", "5.0.0"],
  ["@sentry/webpack-plugin", "3.0.0", "11.8.0"],
  ["@sentry/webpack-plugin", "4.0.0", "5.0.0"],
  ["@sentry/webpack-plugin", "4.0.0", "11.8.0"],
  ["@sentry/webpack-plugin", "5.0.0", "11.8.0"],
  ["@commitlint/cli", "19.0.0", "20.0.0"],
  ["@commitlint/cli", "19.0.0", "21.0.0"],
  ["@commitlint/cli", "20.0.0", "21.0.0"],
  ["@commitlint/config-conventional", "19.0.0", "20.0.0"],
  ["@commitlint/config-conventional", "19.0.0", "21.0.0"],
  ["@commitlint/config-conventional", "20.0.0", "21.0.0"],
  ["nx", "18.0.0", "19.0.0"],
  ["nx", "18.0.0", "20.0.0"],
  ["nx", "18.0.0", "21.0.0"],
  ["nx", "18.0.0", "22.0.0"],
  ["nx", "18.0.0", "23.0.0"],
  ["nx", "18.0.0", "24.0.0"],
  ["nx", "19.0.0", "20.0.0"],
  ["nx", "19.0.0", "21.0.0"],
  ["nx", "19.0.0", "22.0.0"],
  ["nx", "19.0.0", "23.0.0"],
  ["nx", "19.0.0", "24.0.0"],
  ["nx", "20.0.0", "21.0.0"],
  ["nx", "20.0.0", "22.0.0"],
  ["nx", "20.0.0", "23.0.0"],
  ["nx", "20.0.0", "24.0.0"],
  ["nx", "21.0.0", "22.0.0"],
  ["nx", "21.0.0", "23.0.0"],
  ["nx", "21.0.0", "24.0.0"],
  ["nx", "22.0.0", "23.0.0"],
  ["nx", "22.0.0", "24.0.0"],
  ["nx", "23.0.0", "24.0.0"],
  ["@storybook/addon-a11y", "8.0.0", "9.0.0"],
  ["@storybook/addon-a11y", "8.0.0", "10.0.0"]
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
