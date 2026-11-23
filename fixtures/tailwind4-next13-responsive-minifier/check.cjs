const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const path = require('node:path');
const { readFileSync } = require('node:fs');
const tailwind3 = require('tailwindcss-v3');

// Responsive classes reproduced on Notus Next.js at 83af9355cf3373c31d5f5f3845e65185d327186d.
const next = createRequire(require.resolve('next/package.json'));
const postcss = next('postcss');
const webpack = next('./dist/compiled/webpack/webpack');
webpack.init();
const { CssMinimizerPlugin } = next('./dist/build/webpack/plugins/css-minimizer-plugin');
const cli = path.join(__dirname, 'node_modules', '@tailwindcss', 'cli', 'dist', 'index.mjs');
const minimizer = new CssMinimizerPlugin({ postcssOptions: { map: false } });

function compile(flags) {
  const result = spawnSync(process.execPath, [cli, '-i', 'input.css', ...flags], {
    cwd: __dirname,
    encoding: 'utf8',
    timeout: 30000,
    windowsHide: true,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /tailwindcss v4\.0\.0/);
  return result.stdout;
}

async function minify(css) {
  const result = await minimizer.optimizeAsset('control.css', new webpack.sources.RawSource(css));
  return String(result.source());
}

function displays(css, selector, media, query = '(width >= 64rem)') {
  const values = [];
  postcss.parse(css).walkDecls('display', decl => {
    let matchesClass = false;
    let matchesMedia = false;
    for (let parent = decl.parent; parent.type !== 'root'; parent = parent.parent) {
      if (parent.type === 'rule' && parent.selectors.includes(selector)) matchesClass = true;
      if (parent.type === 'atrule' && parent.name === 'media') {
        matchesMedia = parent.params.replace(/ /g, '') === query.replace(/ /g, '');
      }
    }
    if (matchesClass && matchesMedia === media) values.push(decl.value);
  });
  return values;
}

async function main() {
  const lock = require('./package-lock.json');
  assert.equal(next('./package.json').version, '13.4.6');
  assert.equal(require('tailwindcss/package.json').version, '4.0.0');
  assert.equal(require('tailwindcss-v3/package.json').version, '3.3.2');
  for (const name of ['cli', 'node', 'oxide']) {
    assert.equal(lock.packages['node_modules/@tailwindcss/' + name].version, '4.0.0');
  }
  const raw = compile([]);
  const broken = await minify(raw);
  const fixed = await minify(compile(['--optimize']));
  const showOnDesktop = '.lg\\:flex';
  const hideOnDesktop = '.lg\\:hidden';
  const baseline = await postcss([tailwind3({
    content: [{ raw: readFileSync(path.join(__dirname, 'control.html'), 'utf8') }],
    corePlugins: { preflight: false },
  })]).process('@tailwind utilities;', { from: undefined });
  assert.deepEqual(displays(await minify(baseline.css), showOnDesktop, true, '(min-width: 1024px)'), ['flex']);
  assert.deepEqual(displays(raw, showOnDesktop, true), ['flex']);
  assert.deepEqual(displays(broken, showOnDesktop, true), ['none']);
  assert.deepEqual(displays(fixed, showOnDesktop, true), ['flex']);
  assert.deepEqual(displays(fixed, hideOnDesktop, true), ['none']);
  assert.deepEqual(displays(fixed, '.hidden', false), ['none']);
  console.log('Tailwind 4.0.0 and Next 13.4.6 responsive CSS controls passed');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
