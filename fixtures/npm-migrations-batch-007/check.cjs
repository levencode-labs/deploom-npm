'use strict';
const assert = require('node:assert/strict');
const { check } = require('./checks.cjs');

const pairs = [
  ["tsc-watch", "6.3.1", "7.0.0"],
  ["@mermaid-js/layout-elk", "0.1.0", "1.0.0"],
  ["imports-loader", "4.0.1", "5.0.0"],
  ["@docusaurus/theme-mermaid", "2.4.3", "3.0.0"],
  ["expose-loader", "4.1.0", "5.0.0"],
  ["vite-plugin-lib-inject-css", "1.3.0", "2.0.0"],
  ["@react-hookz/web", "24.0.0", "25.0.0"],
  ["@react-hookz/web", "24.0.0", "26.0.0"],
  ["@react-hookz/web", "25.0.0", "26.0.0"],
  ["@react-hookz/web", "12.3.0", "13.0.0"],
  ["@react-hookz/web", "13.3.0", "14.0.0"],
  ["@react-hookz/web", "14.7.1", "15.0.0"],
  ["@react-hookz/web", "15.1.0", "16.0.0"],
  ["@react-hookz/web", "16.1.0", "17.0.0"],
  ["@react-hookz/web", "17.0.1", "18.0.0"],
  ["@react-hookz/web", "18.0.1", "19.0.0"],
  ["@react-hookz/web", "19.2.0", "20.0.0"],
  ["@react-hookz/web", "20.1.0", "21.0.0"],
  ["@react-hookz/web", "21.0.0", "22.0.0"],
  ["@react-hookz/web", "22.0.0", "23.0.0"],
  ["@react-hookz/web", "23.1.0", "24.0.0"],
  ["@babel/plugin-proposal-throw-expressions", "7.29.7", "8.0.0"],
  ["@module-federation/utilities", "0.5.0", "1.0.0"],
  ["@module-federation/utilities", "1.9.1", "2.0.0"],
  ["@module-federation/utilities", "2.0.7", "3.0.0"],
  ["csp-header", "5.2.1", "6.0.0"],
  ["@playwright/experimental-ct-react17", "1.48.2", "1.49.0"],
  ["@playwright/experimental-ct-react17", "1.49.1", "1.50.0"],
  ["@playwright/experimental-ct-react17", "1.54.2", "1.55.0"],
  ["@playwright/experimental-ct-react17", "1.55.1", "1.56.0"],
  ["@playwright/experimental-ct-react17", "1.56.1", "1.57.0"],
  ["@playwright/experimental-ct-react17", "1.57.0", "1.58.0"],
  ["@playwright/experimental-ct-react17", "1.58.2", "1.59.0"],
  ["@playwright/experimental-ct-react17", "1.59.1", "1.60.0"],
  ["stylelint-media-use-custom-media", "3.0.0", "4.0.0"],
  ["stylelint-selector-tag-no-without-class", "3.0.0", "4.0.0"],
  ["creevey", "0.10.35", "0.10.36"],
  ["unplugin-detect-duplicated-deps", "1.0.0", "2.0.0"]
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
