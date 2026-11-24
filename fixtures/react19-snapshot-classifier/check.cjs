const assert = require('node:assert/strict');
const React18 = require('react-before');
const React19 = require('react-after');
const ReactIs18 = require('react-is-before');
const ReactIs19 = require('react-is-after');

assert.equal(React18.version, '18.3.1');
assert.equal(React19.version, '19.3.0');
assert.equal(require('react-is-before/package.json').version, '18.3.1');
assert.equal(require('react-is-after/package.json').version, '19.3.0');

const original = React18.createElement('span', null, 'react-is-control');
const upgraded = React19.createElement('span', null, 'react-is-control');

assert.equal(ReactIs18.isElement(original), true);
assert.equal(ReactIs18.isElement(upgraded), false);
assert.equal(ReactIs19.isElement(upgraded), true);
assert.equal(ReactIs19.isElement(original), false);

// Same two-major classifier as the pinned Jest pretty-format ReactElement plugin.
const test = value => ReactIs18.isElement(value) || ReactIs19.isElement(value);
assert.equal(test(original), true);
assert.equal(test(upgraded), true);
assert.equal(test(null), false);
assert.equal(test({ type: 'span', props: { children: 'react-is-control' } }), false);
console.log('An aligned classifier recognizes React 19 elements. Two majors recognize elements from both runtimes.');
