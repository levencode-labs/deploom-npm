'use strict';
const assert = require('node:assert/strict');
const semver = require('./p00/node_modules/semver');
const facts = require('./facts.json');

const nodeVersions = [
  '8.17.0','10.24.1','12.22.12','14.16.0','14.21.3','16.20.2',
  '18.16.1','18.20.8','20.0.0','20.18.3','20.19.0','21.7.3','22.0.0','22.12.0','24.18.0',
];
const peerVersions = {
  storybook:['6.5.16','7.0.0','7.6.17','8.0.0','9.0.0','10.0.0'],
  '@storybook/core':['7.0.0','8.0.0','9.0.0','10.0.0'],
  'react-use':['17.4.0','17.6.0'],
  mermaid:['10.9.1','11.0.0'],
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



const {createRequire}=require('node:module');
const {readFileSync}=require('node:fs');
const {dirname,join}=require('node:path');

function componentCore(alias,version,integrity) {
  const root=join(__dirname,'ct-accessibility');
  const location=join(root,'node_modules',alias,'package.json');
  const metadata=require(location);
  assert.deepEqual([metadata.name,metadata.version],['@playwright/experimental-ct-react17',version]);
  assert.equal(require(join(root,'package-lock.json')).packages['node_modules/'+alias].integrity,integrity);
  const load=createRequire(location);
  const driver=createRequire(load.resolve('@playwright/experimental-ct-core'));
  const manifest=driver.resolve('playwright-core/package.json');
  assert.equal(require(manifest).version,version);
  return dirname(manifest);
}

async function check([name,from,to]) {
  const old=facts[name][from], next=facts[name][to];
  for (const fact of [old,next]) assert.match(fact.integrity,/^sha512-[\w+/]{86}==$/);
  if (name==='@playwright/experimental-ct-react17' && from==='1.56.1' && to==='1.57.0') {
    const a=componentCore('before',from,old.integrity),b=componentCore('after',to,next.integrity);
    const declarations=core=>readFileSync(join(core,'types/types.d.ts'),'utf8');
    assert.match(declarations(a),/accessibility: Accessibility;/);
    assert.doesNotMatch(declarations(b),/accessibility: Accessibility;/);
    const {Locator}=require(join(b,'lib/client/locator.js'));
    const frame={_platform:{},_timeout:()=>1000,_channel:{
      async ariaSnapshot(params) {
        assert.deepEqual(params,{selector:'#panel',timeout:1000});
        return {snapshot:'- button "Save"'};
      },
    }};
    assert.equal(await new Locator(frame,'#panel').ariaSnapshot(),'- button "Save"');
    return ['ct-aria-snapshot',{}];
  }
  if (name==='@react-hookz/web') {
    const a=old.artifacts,b=next.artifacts;
    if (a.documentTitle.length && !b.documentTitle.length) return ['hookz-document-title',{}];
    if (a.safeState.length && !b.safeState.length) return ['hookz-safe-state',{}];
    if (a.cjsEntry.length && next.type==='module' && next.exports?.['.']==='./dist/index.js')
      return ['hookz-esm-package',{}];
    if (a.cjsEntry.length && !b.cjsEntry.length && b.distEntry.length && b.debounced.length)
      return ['hookz-public-root',{held:'cjs/index'}];
    if (a.distEntry.length && !b.distEntry.length && b.cjsEntry.length && b.debounced.length)
      return ['hookz-public-root',{held:'dist/index'}];
  }
  return peer(old,next) ?? engine(old,next);
}

module.exports={check};
