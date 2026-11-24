const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const before = createRequire(join(__dirname, 'before', 'package.json'));
const afterDir = join(__dirname, 'after');
const after = createRequire(join(afterDir, 'package.json'));
const classes = 'ui-open:underline hui-open:underline ui-missing:underline underline';

function selectors(root, className) {
  const token = '.' + className.replace(':', '\\:');
  const matched = new Set();
  root.walkRules(rule => {
    if (!rule.nodes.some(node => node.prop === 'text-decoration-line' && node.value === 'underline')) return;
    for (const selector of rule.selectors) {
      if (selector.includes(token)) matched.add(selector.replace(/["']/g, ''));
    }
  });
  return [...matched].sort();
}

async function check() {
  assert.equal(before('tailwindcss/package.json').version, '3.4.0');
  assert.equal(after('tailwindcss/package.json').version, '4.3.3');
  const plugin = before('@headlessui/tailwindcss');
  const original = await before('postcss')([
    before('tailwindcss')({
      content: [{ raw: '<div class="' + classes + '"></div>' }],
      plugins: [plugin, plugin({ prefix: 'hui' })],
    }),
  ]).process('@tailwind utilities;', { from: join(__dirname, 'before', 'case.css') });
  const from = join(afterDir, 'case.css');
  await assert.rejects(async () => after('postcss')([after('tailwindcss')()]).process(
    '@tailwind utilities;', { from },
  ), /directly as a PostCSS plugin|PostCSS plugin has moved/);

  const input = '@import "tailwindcss" source(none);\n@source inline("' + classes + '");\n';
  const processV4 = declaration => after('postcss')([
    after('@tailwindcss/postcss')({ base: afterDir, optimize: { minify: false } }),
  ]).process(input + declaration, { from });
  const unregistered = await processV4('');
  assert.deepEqual(selectors(unregistered.root, 'ui-open:underline'), []);
  assert.deepEqual(selectors(unregistered.root, 'hui-open:underline'), []);
  const normal = await processV4('@plugin "@headlessui/tailwindcss";');
  const custom = await processV4('@plugin "@headlessui/tailwindcss" { prefix: "hui"; }');
  for (const [prefix, result] of [['ui', normal], ['hui', custom]]) {
    const rule = prefix + '-open:underline';
    const expected = selectors(original.root, rule);
    assert.equal(expected.length, 2);
    assert.ok(expected.every(selector => selector.includes('[data-headlessui-state~=open]')));
    assert.deepEqual(selectors(result.root, rule), expected);
    assert.deepEqual(selectors(result.root, 'ui-missing:underline'), []);
  }
  assert.deepEqual(selectors(normal.root, 'hui-open:underline'), []);
  assert.ok(selectors(unregistered.root, 'underline').includes('.underline'));
  console.log('Tailwind 4 preserves Headless UI open selectors with explicit plugin registration and prefix.');
}

check().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
