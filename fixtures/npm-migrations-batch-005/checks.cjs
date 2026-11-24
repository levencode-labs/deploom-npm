'use strict';
const assert = require('node:assert/strict');
const semver = require('./p00/node_modules/semver');
const facts = require('./facts.json');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const nodeVersions = [
  '8.17.0','10.24.1','12.22.12','14.16.0','14.21.3','16.20.2',
  '18.16.1','18.20.8','20.0.0','20.18.3','20.19.0','21.7.3','22.0.0','22.12.0','24.18.0',
];
const peerVersions = {
  '@babel/core':['7.29.7','8.0.0'],
  '@swc/core':['1.3.0','1.7.0','1.10.0'],
  '@types/react':['17.0.43','18.3.13','19.0.0'],
  eslint:['7.32.0','8.57.0','9.0.0','10.0.0'],
  react:['16.14.0','17.0.2','18.2.0','18.3.1','19.0.0','19.2.0'],
  'react-dom':['16.14.0','17.0.2','18.2.0','18.3.1','19.0.0','19.2.0'],
  postcss:['7.0.39','8.4.49','8.5.0'],
  sass:['1.32.13','1.54.0','1.77.0','1.80.0'],
  'sass-embedded':['1.70.0','1.80.0'],
  stylelint:['14.16.1','15.11.0','16.0.0','16.13.0','16.16.0','16.23.1','17.0.0','18.0.0'],
  typescript:['3.9.10','4.1.6','4.9.5','5.0.4','5.9.3','6.0.2'],
  vite:['3.2.5','4.5.5','5.4.19','6.0.0','7.0.0','8.0.0'],
  vitest:['0.34.7','1.0.0','2.0.0','3.0.0','4.0.0','5.0.0'],
  webpack:['4.47.0','5.0.0','5.82.0','5.101.0'],
  'webpack-cli':['4.10.0','5.0.0','5.1.4','6.0.0'],
};

function engine(old, next) {
  const a=old.engines?.node, b=next.engines?.node;
  if (!semver.validRange(a) || !semver.validRange(b) || !semver.satisfies(process.versions.node,b)) return;
  const held=nodeVersions.find(v=>semver.satisfies(v,a)&&!semver.satisfies(v,b));
  if (held) return ['node-engine',{held,a,b}];
}

function peer(old, next) {
  for (const [name,b] of Object.entries(next.peerDependencies ?? {})) {
    const a=old.peerDependencies?.[name];
    if (!a || !semver.validRange(a) || !semver.validRange(b)) continue;
    const versions=(peerVersions[name] ?? Object.keys(facts[name] ?? {})).filter(v=>semver.valid(v));
    const before=versions.find(v=>semver.satisfies(v,a)&&!semver.satisfies(v,b));
    const after=versions.find(v=>semver.satisfies(v,b));
    if (before && after) return ['peer',{name,a,b,before,after}];
  }
}

const changes = {
  'webpack-dev-server':['beforeMiddleware','setupMiddlewares','webpack-dev-server-middleware'],
  jquery:['isArray',null,'jquery-native-array'],
  'fork-ts-checker-webpack-plugin':['eslint','typescript','fork-ts-checker-eslint'],
  'qrcode.react':['default','namedCases','qrcode-named-renderer'],
  stylelint:['colorHexCase','colorNoHex','stylelint-remove-stylistic-rule'],
  '@storybook/react':['storiesOf','meta','storybook-csf'],
  puppeteer:['browserFetcher','configuration','puppeteer-standalone-browser-manager'],
};

async function check([name,from,to]) {
  const old=facts[name][from], next=facts[name][to];
  for (const source of [old,next]) assert.match(source.integrity,/^sha512-[\w+/]{86}==$/);
  if (name==='happy-dom' && from==='9.20.3' && to==='10.0.0') {
    const folder=join(__dirname,'happy-esm');
    const load=createRequire(join(folder,'package.json'));
    const {packages}=require(join(folder,'package-lock.json'));
    for (const [alias,version] of [['old-happy',from],['new-happy',to]]) {
      const metadata=load(alias+'/package.json');
      assert.equal(metadata.name,name);
      assert.equal(metadata.version,version);
      assert.equal(packages['node_modules/'+alias].integrity,facts[name][version].integrity);
    }
    assert.equal(new (load('old-happy/lib/index').Window)().document.body.tagName,'BODY');
    assert.throws(()=>load('new-happy/lib/index'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
    assert.equal(new (load('new-happy').Window)().document.body.tagName,'BODY');
    return ['happy-dom-public-entry',{}];
  }
  if (name==='@storybook/addon-docs' && old.artifacts.oldBlocks.length && !next.artifacts.oldBlocks.length) {
    assert(next.exports?.['./blocks']);
    return ['storybook-docs-blocks',{}];
  }
  if (name==='@storybook/addon-a11y' && old.exports?.['./register'] && !next.exports?.['./register']) {
    assert(next.exports?.['./manager']);
    return ['storybook-a11y-registration',{}];
  }
  if (name==='node-html-parser' && old.artifacts.deepHtml.length && !next.artifacts.deepHtml.length) {
    assert(next.artifacts.rootHtml.length && next.exports?.['.'] && !next.exports?.['./dist/nodes/html']);
    return ['html-parser-public-entry',{}];
  }
  if (name==='puppeteer') {
    if (old.artifacts.oldHandled.length && !next.artifacts.oldHandled.length) {
      assert(next.artifacts.handled.length);
      return ['puppeteer-handled-type',{}];
    }
    if (old.artifacts.selectorRoot.length && !next.artifacts.selectorRoot.length) {
      assert(next.artifacts.elementWait.length);
      return ['puppeteer-root-selector',{}];
    }
    if (old.artifacts.puppeteerDevices.length && !next.artifacts.puppeteerDevices.length) {
      assert(next.artifacts.knownDevices.length);
      return ['puppeteer-known-devices',{}];
    }
  }
  const change=changes[name];
  if (change) {
    const [previous,replacement,caseName]=change;
    if (old.artifacts[previous].length && !next.artifacts[previous].length) {
      if (replacement) assert(next.artifacts[replacement].length);
      if (caseName==='jquery-native-array') {
        assert(Array.isArray([]));
        assert(!Array.isArray({length:0}));
      }
      if (caseName==='puppeteer-standalone-browser-manager')
        assert(next.dependencies?.['@puppeteer/browsers']);
      return [caseName,{}];
    }
  }
  return peer(old,next) ?? engine(old,next);
}

module.exports = {check};
