'use strict';
const assert = require('node:assert/strict');
const { check } = require('./checks.cjs');

const pairs = [
  ["postcss-preset-env", "10.0.0", "11.0.0"],
  ["postcss-preset-env", "7.8.3", "8.0.0"],
  ["postcss-preset-env", "8.5.1", "9.0.0"],
  ["postcss-preset-env", "9.6.0", "10.0.0"],
  ["rollup-plugin-visualizer", "6.0.0", "7.0.0"],
  ["rollup-plugin-visualizer", "5.14.0", "6.0.0"],
  ["@types/mocha", "9.1.1", "10.0.0"],
  ["@storybook/addon-links", "8.0.0", "9.0.0"],
  ["@storybook/addon-links", "8.0.0", "10.0.0"],
  ["@storybook/addon-links", "9.0.0", "10.0.0"],
  ["@sentry/vite-plugin", "3.0.0", "4.0.0"],
  ["@sentry/vite-plugin", "3.0.0", "5.0.0"],
  ["@sentry/vite-plugin", "3.0.0", "11.8.0"],
  ["@sentry/vite-plugin", "4.0.0", "5.0.0"],
  ["@sentry/vite-plugin", "4.0.0", "11.8.0"],
  ["@sentry/vite-plugin", "5.0.0", "11.8.0"],
  ["@sentry/vite-plugin", "0.7.2", "2.0.0"],
  ["@sentry/vite-plugin", "2.23.0", "3.0.0"],
  ["@types/react-test-renderer", "17.0.10", "18.3.2"],
  ["@types/react-test-renderer", "18.3.0", "19.0.0"],
  ["@storybook/manager-api", "7.6.17", "8.0.0"],
  ["jotai", "1.13.1", "2.0.0"],
  ["jotai", "2.20.3", "3.0.0"],
  ["eslint-plugin-simple-import-sort", "11.0.0", "12.0.0"],
  ["eslint-plugin-simple-import-sort", "11.0.0", "13.0.0"],
  ["eslint-plugin-simple-import-sort", "11.0.0", "14.0.0"],
  ["eslint-plugin-simple-import-sort", "12.0.0", "13.0.0"],
  ["eslint-plugin-simple-import-sort", "12.0.0", "14.0.0"],
  ["eslint-plugin-simple-import-sort", "13.0.0", "14.0.0"],
  ["@storybook/addon-actions", "8.0.0", "9.0.0"],
  ["@storybook/addon-actions", "6.5.16", "7.0.0"],
  ["@storybook/addon-actions", "7.6.17", "8.0.0"],
  ["stylelint-scss", "6.0.0", "7.0.0"],
  ["@storybook/addon-essentials", "6.5.16", "7.0.0"],
  ["@storybook/addon-essentials", "7.6.17", "8.0.0"],
  ["vite-plugin-pwa", "0.20.1", "0.20.2"],
  ["vite-plugin-pwa", "1.0.0", "2.0.0"],
  ["eslint-webpack-plugin", "5.0.0", "6.0.0"],
  ["eslint-webpack-plugin", "3.2.0", "4.0.0"],
  ["eslint-webpack-plugin", "4.2.0", "5.0.0"],
  ["vite-plugin-dts", "4.0.0", "5.0.0"],
  ["vite-plugin-dts", "0.9.10", "1.0.0"],
  ["vite-plugin-dts", "1.7.3", "2.0.0"],
  ["vite-plugin-dts", "2.3.0", "3.0.0"],
  ["vite-plugin-dts", "3.9.1", "4.0.0"],
  ["mobx", "6.16.1", "7.0.0"],
  ["vite-plugin-checker", "0.14.5", "1.0.0"],
  ["eslint-plugin-sonarjs", "1.0.0", "2.0.0"],
  ["eslint-plugin-sonarjs", "1.0.0", "3.0.0"],
  ["eslint-plugin-sonarjs", "1.0.0", "4.0.0"],
  ["eslint-plugin-sonarjs", "2.0.0", "3.0.0"],
  ["eslint-plugin-sonarjs", "2.0.0", "4.0.0"],
  ["eslint-plugin-sonarjs", "3.0.0", "4.0.0"],
  ["madge", "7.0.0", "8.0.0"],
  ["eslint-plugin-perfectionist", "3.0.0", "4.0.0"],
  ["eslint-plugin-perfectionist", "3.0.0", "5.0.0"],
  ["eslint-plugin-perfectionist", "4.0.0", "5.0.0"],
  ["jscpd", "4.0.0", "5.0.4"],
  ["axios-mock-adapter", "1.22.0", "2.0.0"],
  ["mobx-react", "7.6.0", "8.0.0"],
  ["mobx-react", "8.0.0", "9.0.0"],
  ["mobx-react", "9.2.2", "10.0.0"],
  ["@hello-pangea/dnd", "17.0.0", "18.0.0"],
  ["@hello-pangea/dnd", "15.0.0", "16.0.0"],
  ["@hello-pangea/dnd", "16.6.0", "17.0.0"],
  ["@storybook/react-webpack5", "8.0.0", "9.0.0"],
  ["@storybook/react-webpack5", "8.0.0", "10.0.0"],
  ["@storybook/react-webpack5", "9.0.0", "10.0.0"],
  ["@storybook/react-webpack5", "7.6.17", "8.0.0"],
  ["syncpack", "12.0.0", "13.0.0"],
  ["syncpack", "12.0.0", "14.0.0"],
  ["syncpack", "12.0.0", "15.0.0"],
  ["syncpack", "13.0.0", "14.0.0"],
  ["syncpack", "13.0.0", "15.0.0"],
  ["syncpack", "14.0.0", "15.0.0"],
  ["syncpack", "6.2.1", "7.0.0"],
  ["syncpack", "7.2.2", "8.0.0"],
  ["syncpack", "8.5.14", "9.0.0"],
  ["syncpack", "9.8.6", "10.0.0"],
  ["syncpack", "10.9.3", "11.2.1"],
  ["syncpack", "11.2.1", "12.0.0"],
  ["@types/big.js", "6.2.2", "7.0.0"],
  ["chai-as-promised", "7.1.2", "8.0.0"],
  ["react-resize-detector", "10.0.0", "11.0.1"],
  ["react-resize-detector", "10.0.0", "12.0.0"],
  ["react-resize-detector", "11.0.1", "12.0.0"],
  ["plop", "3.1.2", "4.0.0"],
  ["@microsoft/signalr", "9.0.6", "10.0.0"],
  ["@microsoft/signalr", "9.0.6", "11.0.0"],
  ["@microsoft/signalr", "10.0.0", "11.0.0"],
  ["@docusaurus/core", "2.4.3", "3.0.0"],
  ["@docusaurus/preset-classic", "2.4.3", "3.0.0"],
  ["@types/chai-as-promised", "7.1.8", "8.0.0"],
  ["parse-imports", "2.0.0", "3.0.0"],
  ["react-highlight-words", "0.21.1", "1.0.0"],
  ["react-youtube", "7.14.0", "8.0.0"],
  ["react-youtube", "8.3.0", "9.0.0"],
  ["react-youtube", "9.0.3", "10.0.0"],
  ["tsc-watch", "4.6.2", "5.0.1"],
  ["tsc-watch", "5.0.3", "6.0.0"]
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
