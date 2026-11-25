'use strict';
const assert = require('node:assert/strict');
const semver = require('semver');
const facts = require('./facts.json');
const expected = require('./expected.json');
const pairs = [
  ["ava","2.0.0","3.0.0"],
  ["ava","3.0.0","5.0.0"],
  ["ava","5.0.0","6.0.0"],
  ["ava","6.0.0","8.0.0"],
  ["karma-webpack","3.0.0","4.0.0"],
  ["karma-webpack","4.0.0","5.0.0"],
  ["eslint-config-standard-with-typescript","19.0.0","43.0.0"],
  ["standard","12.0.0","17.0.0"],
  ["conventional-changelog-cli","2.0.0","4.0.0"],
  ["conventional-changelog-cli","4.0.0","5.0.0"],
  ["gulp-sass","4.0.0","5.0.0"],
  ["eslint-plugin-eslint-plugin","3.0.0","5.0.0"],
  ["eslint-plugin-eslint-plugin","5.0.0","7.0.0"],
  ["dts-bundle-generator","6.0.0","9.0.0"],
  ["dts-bundle-generator","9.0.0","10.0.0"],
  ["cpy-cli","3.0.0","5.0.0"],
  ["cpy-cli","5.0.0","7.0.0"],
  ["tap","11.0.0","21.0.0"],
  ["gulp-postcss","9.0.0","10.0.0"],
  ["grunt-contrib-uglify","4.0.0","5.0.0"],
  ["gulp-filter","5.0.0","6.0.0"],
  ["gulp-filter","6.0.0","7.0.0"],
  ["exports-loader","3.0.0","4.0.0"],
  ["exports-loader","4.0.0","5.0.0"],
  ["rollup-plugin-node-externals","6.0.0","7.0.0"],
  ["open-cli","6.0.0","8.0.0"],
  ["open-cli","8.0.0","9.0.0"],
  ["eslint-plugin-sort-destructure-keys","1.0.0","2.0.0"],
  ["grunt-contrib-cssmin","3.0.0","5.0.0"],
  ["eslint-plugin-jasmine","2.0.0","4.0.0"],
  ["rollup-plugin-webpack-stats","3.0.0","4.0.0"],
  ["webpack-stream","3.0.0","7.0.0"],
  ["gulp-autoprefixer","3.0.0","7.0.0"],
  ["gulp-autoprefixer","7.0.0","8.0.0"],
  ["gulp-autoprefixer","8.0.0","10.0.0"],
  ["bundlewatch","0.0.0","1.0.0"],
  ["proxy","2.0.0","4.0.0"],
  ["web-ext","8.0.0","10.0.0"],
  ["yahoo-finance2","3.0.0","4.0.0"],
  ["grunt-sass","2.0.0","3.0.0"],
  ["grunt-sass","3.0.0","4.0.0"],
  ["load-grunt-tasks","3.0.0","5.0.0"],
  ["eslint-plugin-lit","1.0.0","2.0.0"],
  ["stylelint-config-twbs-bootstrap","11.0.0","16.0.0"],
  ["global-jsdom","9.0.0","24.0.0"],
  ["global-jsdom","26.0.0","29.0.0"],
  ["global-jsdom","29.0.0","30.0.0"],
  ["grunt-contrib-jshint","2.0.0","3.0.0"],
  ["bumpp","9.0.0","10.0.0"],
  ["bumpp","10.0.0","11.0.0"],
  ["bumpp","11.0.0","12.0.0"],
  ["grunt-contrib-connect","2.0.0","4.0.0"],
  ["np","11.0.0","12.0.0"],
  ["gulp-zip","3.0.0","5.0.0"],
  ["gulp-zip","5.0.0","6.0.0"],
  ["grunt-eslint","19.0.0","22.0.0"],
  ["grunt-eslint","22.0.0","26.0.0"],
  ["rollup-plugin-delete","2.0.0","3.0.0"],
  ["xo","1.0.0","2.0.0"],
  ["xo","2.0.0","4.0.0"],
  ["eslint-plugin-github","4.0.0","5.0.0"],
  ["babel-plugin-tester","10.0.0","11.0.0"],
  ["documentation","13.0.0","14.0.0"],
  ["eslint-plugin-local","4.0.0","6.0.0"],
  ["google-closure-compiler","20240317.0.0","20250520.0.0"],
  ["gulp-imagemin","3.0.0","6.0.0"],
  ["gulp-imagemin","6.0.0","7.0.0"],
  ["pinst","2.0.0","3.0.0"],
  ["fix-path","4.0.0","5.0.0"],
  ["grunt-concurrent","2.0.0","3.0.0"],
  ["rollup-plugin-filesize","9.0.0","10.0.0"],
  ["grunt-shell","1.0.0","4.0.0"],
  ["eslint-plugin-chai-expect","3.0.0","4.0.0"],
  ["filemanager-webpack-plugin","4.0.0","10.0.0"],
  ["karma-rollup-preprocessor","6.0.0","7.0.0"],
  ["karma-browserify","6.0.0","8.0.0"],
  ["karma-sauce-launcher","2.0.0","4.0.0"],
  ["bunchee","6.0.0","7.0.0"],
  ["electron-debug","4.0.0","5.0.0"],
  ["tstyche","3.0.0","5.0.0"],
  ["tstyche","5.0.0","7.0.0"],
  ["lerna-changelog","1.0.0","2.0.0"],
  ["editorconfig-checker","6.0.0","7.0.0"],
  ["gulp-size","3.0.0","4.0.0"],
  ["grunt-contrib-qunit","3.0.0","11.0.0"],
  ["jest-snapshot-serializer-raw","1.0.0","2.0.0"],
  ["grunt-contrib-jasmine","1.0.0","2.0.0"],
  ["grunt-terser","1.0.0","2.0.0"],
  ["installed-check","10.0.0","11.0.0"],
  ["gulp-pug","3.0.0","5.0.0"],
  ["gzip-size-cli","2.0.0","5.0.0"],
  ["standard-changelog","2.0.0","8.0.0"],
  ["electron-unhandled","5.0.0","6.0.0"],
  ["cldr-misc-full","48.0.0","49.0.0"],
  ["eslint-config-tui","4.0.0","5.0.0"],
];
assert.deepEqual(pairs, expected.map(([pair]) => pair));
for (const [[name, from, to], kind, range] of expected) {
  const a = facts[name][from], b = facts[name][to];
  for (const release of [a,b]) assert.match(release.integrity, /^sha512-[A-Za-z0-9+/]{86}==$/);
  if (kind === 'node-engine') {
    assert.equal(a.engines.node, range.a);
    assert.equal(b.engines.node, range.b);
  } else {
    assert.equal(kind, 'peer');
    assert.equal(a.peerDependencies[range.name], range.a);
    assert.equal(b.peerDependencies[range.name], range.b);
    assert.notEqual(a.peerDependenciesMeta?.[range.name]?.optional, true);
    assert.notEqual(b.peerDependenciesMeta?.[range.name]?.optional, true);
  }
  assert.equal(semver.satisfies(range.before, range.a), true);
  assert.equal(semver.satisfies(range.before, range.b), false);
  assert.equal(semver.satisfies(range.after, range.b), true);
}
console.log('Verified '+expected.length+' exact published Node.js and peer constraints');
