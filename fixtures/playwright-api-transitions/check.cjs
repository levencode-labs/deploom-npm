'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join } = require('node:path');

function client(packageName, directory, version) {
  const load = createRequire(join(__dirname, directory, 'package.json'));
  const manifestPath = load.resolve(packageName + '/package.json');
  const manifest = require(manifestPath);
  assert.equal(manifest.version, version);
  assert.equal(manifest.name, packageName.startsWith('pw-') ? '@playwright/test' : packageName);
  const loadPackage = createRequire(manifestPath);
  const coreDependency = packageName === '@playwright/experimental-ct-react17' ? '@playwright/experimental-ct-core' : 'playwright';
  const loadCoreDependency = createRequire(loadPackage.resolve(coreDependency));
  const core = loadCoreDependency.resolve('playwright-core/package.json');
  assert.equal(require(core).version, version);
  return dirname(core);
}

function routeMatches(core, pattern, url) {
  const { RouteHandler } = require(join(core, 'lib/client/network.js'));
  return RouteHandler.prototype.matches.call({ url: pattern }, url);
}

const sample = 'https://example.test/item/b.js';
const outside = 'https://example.test/item/z.js';
for (const [before, after] of [
  [client('pw-before', 'test', '1.51.1'), client('pw-after', 'test', '1.52.0')],
  [client('@playwright/experimental-ct-react17', 'component-before', '1.51.1'),
    client('@playwright/experimental-ct-react17', 'component-after', '1.52.0')],
]) {
  for (const [glob, regex] of [
    ['**/item/[ab].js', /^https:\/\/example\.test\/item\/[ab]\.js$/],
    ['**/item/?.js', /^https:\/\/example\.test\/item\/[^/]\.js$/],
  ]) {
    assert.equal(routeMatches(before, glob, sample), true);
    assert.equal(routeMatches(after, glob, sample), false);
    assert.equal(routeMatches(after, regex, sample), true);
  }
  assert.equal(routeMatches(after, /^https:\/\/example\.test\/item\/[ab]\.js$/, outside), false);
}
console.log('Both pinned Playwright packages lose legacy glob matches; scoped regexes recover them.');

function shippedPageApi(core) {
  return readFileSync(join(core, 'types/types.d.ts'), 'utf8');
}

const oldApi = shippedPageApi(client('pw-156', 'test', '1.56.1'));
const newApi = shippedPageApi(client('pw-157', 'test', '1.57.0'));
assert.match(oldApi, /accessibility: Accessibility;/);
assert.doesNotMatch(newApi, /accessibility: Accessibility;/);
assert.match(newApi, /ariaSnapshot\(options\?/);
const { Locator } = require(join(client('pw-157', 'test', '1.57.0'), 'lib/client/locator.js'));
const selector = '#checkout';
const snapshot = '- button "Buy"';
const frame = {
  _platform: {},
  _timeout: () => 1000,
  _channel: {
    async ariaSnapshot(params) {
      assert.deepEqual(params, { selector, timeout: 1000 });
      return { snapshot };
    },
  },
};
new Locator(frame, selector).ariaSnapshot().then(result => {
  assert.equal(result, snapshot);
  console.log('Playwright 1.57 drops Page accessibility; Locator ariaSnapshot uses the scoped selector.');
}).catch(error => {
  console.error(error);
  process.exitCode = 1;
});
