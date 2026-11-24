'use strict';
const assert = require('node:assert/strict');
const { check } = require('./checks.cjs');

const pairs = [
  ["style-loader", "3.3.4", "4.0.0"],
  ["webpack-merge", "5.10.0", "6.0.0"],
  ["storybook", "6.5.16", "7.0.0"],
  ["storybook", "7.6.17", "8.0.0"],
  ["fork-ts-checker-webpack-plugin", "6.5.0", "7.0.0"],
  ["fork-ts-checker-webpack-plugin", "7.3.0", "8.0.0"],
  ["fork-ts-checker-webpack-plugin", "8.0.0", "9.0.0"],
  ["concurrently", "6.5.1", "7.0.0"],
  ["concurrently", "7.6.0", "8.0.0"],
  ["concurrently", "8.2.2", "9.0.0"],
  ["postcss-loader", "6.2.1", "7.0.0"],
  ["postcss-loader", "7.3.4", "8.0.0"],
  ["@storybook/react", "6.5.16", "7.0.0"],
  ["@storybook/react", "7.6.17", "8.0.0"],
  ["webpack-dev-server", "4.15.1", "5.0.0"],
  ["jquery", "3.7.1", "4.0.0"],
  ["@storybook/addon-docs", "6.5.16", "7.0.0"],
  ["@storybook/addon-docs", "7.6.17", "8.0.0"],
  ["sass-loader", "12.6.0", "13.0.0"],
  ["sass-loader", "13.3.3", "14.0.0"],
  ["react-error-boundary", "4.1.2", "5.0.0"],
  ["mocha", "9.2.2", "10.0.0"],
  ["mocha", "10.8.2", "11.0.0"],
  ["happy-dom", "2.55.0", "3.0.0"],
  ["happy-dom", "3.2.2", "4.0.0"],
  ["happy-dom", "4.1.0", "5.0.0"],
  ["happy-dom", "5.4.0", "6.0.0"],
  ["happy-dom", "6.0.4", "7.0.0"],
  ["happy-dom", "7.8.1", "8.0.0"],
  ["happy-dom", "8.9.0", "9.0.0"],
  ["happy-dom", "9.20.3", "10.0.0"],
  ["happy-dom", "10.11.2", "11.0.0"],
  ["happy-dom", "11.2.0", "12.0.0"],
  ["happy-dom", "12.10.3", "13.0.0"],
  ["webpack-bundle-analyzer", "4.10.2", "5.0.0"],
  ["copy-webpack-plugin", "10.2.4", "11.0.0"],
  ["copy-webpack-plugin", "11.0.0", "12.0.0"],
  ["@babel/plugin-proposal-export-default-from", "7.29.7", "8.0.0"],
  ["@vitejs/plugin-react-swc", "3.11.0", "4.0.0"],
  ["@vitest/ui", "0.34.7", "1.0.0"],
  ["sinon", "13.0.2", "14.0.0"],
  ["sinon", "14.0.2", "15.0.0"],
  ["sinon", "15.2.0", "16.0.0"],
  ["sinon", "16.1.3", "17.0.0"],
  ["sinon", "17.0.1", "18.0.0"],
  ["puppeteer", "12.0.1", "13.0.0"],
  ["puppeteer", "13.7.0", "14.0.0"],
  ["puppeteer", "14.4.1", "15.0.0"],
  ["puppeteer", "15.5.0", "16.0.0"],
  ["puppeteer", "16.2.0", "17.0.0"],
  ["puppeteer", "17.1.3", "18.0.0"],
  ["puppeteer", "18.2.1", "19.0.0"],
  ["puppeteer", "19.11.1", "20.0.0"],
  ["puppeteer", "20.9.0", "21.0.0"],
  ["puppeteer", "21.11.0", "22.0.0"],
  ["webpack-cli", "4.10.0", "5.0.0"],
  ["webpack-cli", "5.1.4", "6.0.0"],
  ["@babel/plugin-transform-react-constant-elements", "7.29.7", "8.0.0"],
  ["stylelint", "14.16.1", "15.0.0"],
  ["stylelint", "15.11.0", "16.0.0"],
  ["@sentry/webpack-plugin", "1.20.1", "2.0.0"],
  ["@sentry/webpack-plugin", "2.23.0", "3.0.0"],
  ["nx", "13.10.3", "14.0.0"],
  ["nx", "14.8.6", "15.0.0"],
  ["nx", "15.9.3", "16.0.0"],
  ["nx", "16.10.0", "17.0.0"],
  ["nx", "17.3.1", "18.0.0"],
  ["jest-junit", "13.2.0", "14.0.0"],
  ["jest-junit", "14.0.1", "15.0.0"],
  ["jest-junit", "15.0.0", "16.0.0"],
  ["jest-junit", "16.0.0", "17.0.0"],
  ["@storybook/addon-a11y", "9.0.0", "10.0.0"],
  ["css-minimizer-webpack-plugin", "6.0.0", "7.0.0"],
  ["css-minimizer-webpack-plugin", "6.0.0", "8.0.0"],
  ["css-minimizer-webpack-plugin", "7.0.0", "8.0.0"],
  ["css-minimizer-webpack-plugin", "3.4.1", "4.0.0"],
  ["css-minimizer-webpack-plugin", "4.2.2", "5.0.0"],
  ["css-minimizer-webpack-plugin", "5.0.1", "6.0.0"],
  ["eslint-plugin-storybook", "9.0.0", "10.0.0"],
  ["node-html-parser", "7.0.1", "8.0.0"],
  ["node-html-parser", "7.0.1", "9.0.0"],
  ["node-html-parser", "8.0.0", "9.0.0"],
  ["react-test-renderer", "18.3.1", "19.0.0"],
  ["stylelint-config-recommended", "14.0.0", "15.0.0"],
  ["stylelint-config-recommended", "14.0.0", "16.0.0"],
  ["stylelint-config-recommended", "14.0.0", "17.0.0"],
  ["stylelint-config-recommended", "14.0.0", "18.0.0"],
  ["stylelint-config-recommended", "14.0.0", "19.0.0"],
  ["stylelint-config-recommended", "15.0.0", "16.0.0"],
  ["stylelint-config-recommended", "15.0.0", "17.0.0"],
  ["stylelint-config-recommended", "15.0.0", "18.0.0"],
  ["stylelint-config-recommended", "15.0.0", "19.0.0"],
  ["stylelint-config-recommended", "16.0.0", "17.0.0"],
  ["stylelint-config-recommended", "16.0.0", "18.0.0"],
  ["stylelint-config-recommended", "16.0.0", "19.0.0"],
  ["stylelint-config-recommended", "17.0.0", "18.0.0"],
  ["stylelint-config-recommended", "17.0.0", "19.0.0"],
  ["stylelint-config-recommended", "18.0.0", "19.0.0"],
  ["qrcode.react", "2.0.0", "3.0.0"],
  ["qrcode.react", "3.1.0", "4.0.0"]
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
