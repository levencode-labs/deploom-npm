'use strict';

const assert = require('node:assert/strict');
const before = require('./before/node_modules/sass');
const after = require('./after/node_modules/sass');

assert.equal(require('./before/node_modules/sass/package.json').version, '1.79.5');
assert.equal(require('./after/node_modules/sass/package.json').version, '1.80.0');

const variables = '$duration: 240ms;';
const legacy = '@import "properties"; .animation { animation-duration: $duration; }';
const migrated = '@use "properties"; .animation { animation-duration: properties.$duration; }';
const unqualified = '@use "properties"; .animation { animation-duration: $duration; }';

function compile(sass, source, strict = false) {
  const warnings = [];
  const result = sass.compileString(source, {
    importers: [{
      canonicalize(url) {
        return url === 'properties' ? new URL('fixture:properties') : null;
      },
      load(url) {
        return url.href === 'fixture:properties'
          ? { contents: variables, syntax: 'scss' }
          : null;
      },
    }],
    logger: {
      warn(_message, options) {
        warnings.push(options.deprecationType?.id ?? 'other');
      },
    },
    fatalDeprecations: strict ? ['import'] : [],
  });
  return { css: result.css, warnings };
}

const baseline = compile(before, legacy);
assert.match(baseline.css, /animation-duration: 240ms/);
assert.deepEqual(baseline.warnings, []);

const held = compile(after, legacy);
assert.equal(held.css, baseline.css);
assert.deepEqual(held.warnings, ['import']);
assert.throws(() => compile(after, legacy, true), /Sass @import rules are deprecated/);
assert.throws(() => compile(after, unqualified, true), /Undefined variable/);

assert.deepEqual(compile(after, migrated, true), { css: baseline.css, warnings: [] });
console.log('The Sass module migration preserves CSS and passes with import deprecations treated as errors.');
