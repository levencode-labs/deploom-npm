const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const { pathToFileURL } = require('node:url');

async function renderer(arm, version) {
  const root = join(__dirname, arm);
  const load = createRequire(join(root, 'package.json'));
  const manifest = JSON.parse(readFileSync(join(root, 'node_modules/react-markdown/package.json'), 'utf8'));
  assert.equal(manifest.version, version);
  const React = load('react');
  assert.equal(React.version, '18.3.1');
  assert.equal(load('react-dom').version, '18.3.1');
  const { renderToStaticMarkup } = load('react-dom/server');
  const { default: Markdown } = await import(pathToFileURL(load.resolve('react-markdown')).href);
  function render(className, wrapper = false) {
    const markdown = React.createElement(Markdown, wrapper || !className ? null : { className }, '**ready**');
    return renderToStaticMarkup(wrapper ? React.createElement('div', { className }, markdown) : markdown);
  }
  return render;
}

async function main() {
  const before = await renderer('before', '9.0.3');
  const after = await renderer('after', '10.0.0');
  const oldMarkup = before('event-label');
  assert.equal(oldMarkup, '<div class="event-label"><p><strong>ready</strong></p></div>');
  assert.equal(after('event-label'), '<p><strong>ready</strong></p>');
  assert.equal(after('event-label', true), oldMarkup);
  assert.equal(before(), '<p><strong>ready</strong></p>');
  assert.equal(after(), before());
  console.log('Moving className to the wrapper preserves exact rendered HTML. Unstyled Markdown renders without a wrapper.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
