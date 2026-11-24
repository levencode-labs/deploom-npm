'use strict';
const assert = require('node:assert/strict');
const { check } = require('./checks.cjs');

const pairs = [
  ["@types/node", "16.11.13", "17.0.0"],
  ["@types/node", "16.11.41", "18.0.0"],
  ["@types/node", "17.0.44", "18.0.0"],
  ["@types/node", "18.16.3", "20.0.0"],
  ["@types/node", "20.14.12", "22.0.0"],
  ["glob", "7.2.3", "8.1.0"],
  ["glob", "8.1.0", "9.0.0"],
  ["glob", "9.3.5", "10.0.0"],
  ["glob", "10.4.4", "11.0.0"],
  ["@babel/types", "7.29.7", "8.0.0"],
  ["typescript", "4.5.5", "4.6.2"],
  ["typescript", "4.6.4", "4.7.2"],
  ["typescript", "4.7.4", "4.8.2"],
  ["typescript", "4.8.4", "4.9.3"],
  ["typescript", "4.9.5", "5.0.2"],
  ["typescript", "5.0.4", "5.1.3"],
  ["typescript", "5.1.6", "5.2.2"],
  ["typescript", "5.2.2", "5.3.2"],
  ["typescript", "5.9.3", "6.0.2"],
  ["globals", "13.24.0", "14.0.0"],
  ["@babel/runtime", "7.29.7", "8.0.0"],
  ["@babel/core", "7.29.7", "8.0.0"],
  ["vite", "2.9.14", "3.0.0"],
  ["vite", "3.2.5", "4.0.0"],
  ["vite", "4.5.0", "5.0.0"],
  ["vite", "4.5.5", "6.0.0"],
  ["vite", "5.0.12", "5.1.0"],
  ["vite", "5.4.11", "6.0.0"],
  ["vite", "5.4.19", "7.0.0"],
  ["react", "18.2.0", "18.3.0"],
  ["react", "18.3.0", "18.3.1"],
  ["react", "18.3.1", "19.0.0"],
  ["react", "19.1.1", "19.2.0"],
  ["rimraf", "4.4.1", "5.0.0"],
  ["rimraf", "5.0.9", "6.0.0"],
  ["react-dom", "18.2.0", "18.3.0"],
  ["react-dom", "18.3.1", "19.0.0"],
  ["react-dom", "19.1.1", "19.2.0"],
  ["eslint", "8.57.0", "9.0.0"],
  ["eslint", "8.57.1", "10.0.0"],
  ["eslint", "9.21.0", "9.22.0"],
  ["@types/react", "17.0.43", "18.0.0"],
  ["@types/react", "18.3.13", "19.0.0"],
  ["@typescript-eslint/eslint-plugin", "5.62.0", "6.0.0"],
  ["@typescript-eslint/eslint-plugin", "6.21.0", "7.0.0"],
  ["@typescript-eslint/parser", "5.62.0", "6.0.0"],
  ["@typescript-eslint/parser", "6.21.0", "7.0.0"],
  ["prettier", "2.8.8", "3.0.0"],
  ["prettier", "3.4.2", "3.5.0"],
  ["@eslint/js", "8.57.0", "9.0.0"],
  ["@types/react-dom", "17.0.14", "18.0.0"],
  ["@types/react-dom", "18.3.1", "19.0.0"],
  ["axios", "0.27.2", "1.0.0"],
  ["chai", "4.3.10", "5.0.0"],
  ["vitest", "0.34.6", "1.0.0"],
  ["eslint-plugin-react-hooks", "4.6.2", "5.0.0"],
  ["@vitejs/plugin-react", "1.3.2", "2.0.0"],
  ["@vitejs/plugin-react", "2.2.0", "3.0.0"],
  ["@vitejs/plugin-react", "3.1.0", "4.0.0"],
  ["@vitejs/plugin-react", "4.7.0", "5.0.0"],
  ["@types/chai", "4.3.19", "5.0.0"],
  ["@babel/plugin-transform-modules-commonjs", "7.29.7", "8.0.0"],
  ["@testing-library/dom", "8.20.0", "9.0.0"],
  ["@testing-library/dom", "9.3.4", "10.0.0"],
  ["eslint-config-prettier", "8.10.0", "9.0.0"],
  ["eslint-config-prettier", "9.1.0", "10.0.0"],
  ["@testing-library/react", "12.1.4", "13.0.0"],
  ["@testing-library/react", "13.4.0", "14.0.0"],
  ["@testing-library/react", "14.3.0", "15.0.0"],
  ["@babel/preset-typescript", "7.29.7", "8.0.0"],
  ["react-router", "6.3.0", "6.4.0"],
  ["react-router", "6.28.0", "7.0.0"],
  ["@babel/preset-env", "7.29.7", "8.0.0"],
  ["reselect", "4.1.8", "5.0.0"],
  ["react-router-dom", "6.3.0", "6.4.0"],
  ["react-router-dom", "6.28.0", "7.0.0"],
  ["postcss-import", "14.1.0", "15.0.0"],
  ["postcss-import", "15.1.0", "16.0.0"],
  ["redux", "4.2.1", "5.0.0"],
  ["eslint-plugin-prettier", "4.2.1", "5.0.0"],
  ["@types/jest", "27.5.2", "28.1.0"],
  ["@types/jest", "28.1.8", "29.0.0"],
  ["@types/jest", "29.5.14", "30.0.0"],
  ["@types/eslint", "8.56.10", "9.6.0"],
  ["big.js", "6.2.2", "7.0.0"],
  ["react-redux", "7.2.8", "8.0.0"],
  ["react-redux", "8.1.3", "9.0.0"],
  ["@babel/plugin-transform-runtime", "7.29.7", "8.0.0"],
  ["react-markdown", "7.1.2", "8.0.0"],
  ["react-markdown", "8.0.7", "9.0.0"],
  ["react-markdown", "9.1.0", "10.0.0"],
  ["@babel/preset-react", "7.29.7", "8.0.0"],
  ["@sentry/browser", "6.19.7", "7.0.0"],
  ["@sentry/browser", "7.114.0", "8.0.0"],
  ["css-loader", "6.11.0", "7.0.0"],
  ["@babel/plugin-proposal-decorators", "7.29.7", "8.0.0"],
  ["@reduxjs/toolkit", "1.9.7", "2.0.0"],
  ["@reduxjs/toolkit", "2.5.1", "2.6.0"],
  ["babel-loader", "8.2.5", "9.0.0"],
  ["babel-loader", "9.2.1", "10.0.0"]
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
