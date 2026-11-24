'use strict';

const assert = require('node:assert/strict');
const before = require('./before/node_modules/commander');
const after = require('./after/node_modules/commander');

assert.equal(require('./before/node_modules/commander/package.json').version, '4.1.1');
assert.equal(require('./after/node_modules/commander/package.json').version, '7.0.0');

function parse(library, args, readDirectly, legacyStorage = false) {
  const program = new library.Command();
  if (legacyStorage) program.storeOptionsAsProperties(true);
  program.name('report')
    .option('-f, --format <name>', 'output format', 'text')
    .option('-v, --verbose', 'include details');
  program.parse(['node', 'report.js', ...args]);
  const { format, verbose } = readDirectly ? program : program.opts();
  return { format, verbose: Boolean(verbose) };
}

const args = ['--format', 'json', '--verbose'];
const expected = { format: 'json', verbose: true };
const defaults = { format: 'text', verbose: false };

assert.deepEqual(parse(before, args, true), expected);
assert.deepEqual(parse(before, [], true), defaults);
assert.deepEqual(parse(after, args, true), { format: undefined, verbose: false });
assert.deepEqual(parse(after, args, true, true), expected);

for (const version of [before, after]) {
  assert.deepEqual(parse(version, args, false), expected);
  assert.deepEqual(parse(version, [], false), defaults);
}

console.log('Commander options read through opts() preserve explicit flags and defaults across both pinned versions.');
