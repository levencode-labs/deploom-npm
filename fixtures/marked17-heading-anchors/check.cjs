'use strict';

const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');

const old = require('./before/node_modules/marked');
assert.equal(require('./before/node_modules/marked/package.json').version, '4.3.0');
assert.equal(require('./after/node_modules/marked/package.json').version, '17.0.1');
assert.equal(require('./after/node_modules/marked-gfm-heading-id/package.json').version, '4.1.3');

function loadTarget(packageName) {
  return import(pathToFileURL(require.resolve('./after/node_modules/' + packageName)));
}

function headingIds(html) {
  return Array.from(html.matchAll(/<h[1-6]\b[^>]*\bid="([^"]+)"/g), (match) => match[1]);
}

async function main() {
  const { Marked } = await loadTarget('marked');
  const { gfmHeadingId } = await loadTarget('marked-gfm-heading-id');
  const markdown = [
    '# Release notes',
    '',
    '[Jump to the second heading](#release-notes-1)',
    '',
    '## Release notes',
  ].join('\n');
  const expected = ['release-notes', 'release-notes-1'];

  const baseline = old.parse(markdown);
  assert.deepEqual(headingIds(baseline), expected);
  assert.match(baseline, /href="#release-notes-1"/);
  const held = new Marked().parse(markdown);
  assert.deepEqual(headingIds(held), []);
  assert.match(held, /href="#release-notes-1"/);

  const renderer = new Marked(gfmHeadingId());
  const migrated = renderer.parse(markdown);
  assert.deepEqual(headingIds(migrated), expected);
  assert.match(migrated, /href="#release-notes-1"/);
  assert.deepEqual(headingIds(renderer.parse(markdown)), expected);
  console.log('Marked with the GFM heading extension preserves the tested deep-link anchors.');
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
