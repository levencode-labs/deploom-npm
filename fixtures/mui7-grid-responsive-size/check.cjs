'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/@mui/material/package.json').version, '6.5.0');
assert.equal(require('./after/node_modules/@mui/material/package.json').version, '7.3.11');

const scenario = `
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const form = process.argv[1];
  const Grid = (form === 'grid2'
    ? require('@mui/material/Grid2')
    : require('@mui/material/Grid')).default;
  const child = form === 'legacy-props' ? { item: true, xs: 12, sm: 6 } : { size: { xs: 12, sm: 6 } };
  const row = React.createElement(Grid, { container: true, columns: 12, spacing: 2 },
    React.createElement(Grid, child, 'Forecast'));
  process.stdout.write(renderToStaticMarkup(row));
`;

function run(arm, form) {
  const result = spawnSync(process.execPath, ['-e', scenario, form], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15000,
  });
  if (result.error) throw result.error;
  return result;
}

function sizes(html) {
  const css = [...html.matchAll(/<style[^>]*>(.*?)<\/style>/g)].map(match => match[1]).join('');
  const width = span => new RegExp('width:calc\\(100%\\s*\\*\\s*' + span + '\\s*/\\s*var\\(--Grid-parent-columns\\)');
  const sm = /@media\s*\(min-width:\s*600px\)\{[^{}]+\{([^{}]*)\}\}/.exec(css);
  return {
    base: width(12).test(css.split('@media')[0]),
    tablet: width(6).test(sm?.[1] ?? ''),
  };
}

const expected = { base: true, tablet: true };
const baseline = run('before', 'grid2');
assert.equal(baseline.status, 0, baseline.stderr);
assert.match(baseline.stdout, />Forecast<\/div>/);
assert.deepEqual(sizes(baseline.stdout), expected);

const held = run('after', 'grid2');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /Cannot find module.*Grid2|ERR_PACKAGE_PATH_NOT_EXPORTED/s);

const unconverted = run('after', 'legacy-props');
assert.equal(unconverted.status, 0, unconverted.stderr);
assert.deepEqual(sizes(unconverted.stdout), { base: false, tablet: false });

const migrated = run('after', 'grid');
assert.equal(migrated.status, 0, migrated.stderr);
assert.match(migrated.stdout, />Forecast<\/div>/);
assert.deepEqual(sizes(migrated.stdout), expected);
console.log('MUI 7 Grid restores the base and sm responsive width rules with its new entry point.');
