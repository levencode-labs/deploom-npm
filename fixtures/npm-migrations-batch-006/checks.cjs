'use strict';
const assert = require('node:assert/strict');
const semver = require('./p00/node_modules/semver');
const facts = require('./facts.json');
const runtime = require('./runtime_checks.cjs');

const nodeVersions = [
  '8.17.0','10.24.1','12.22.12','14.16.0','14.21.3','16.20.2',
  '18.16.1','18.20.8','20.0.0','20.18.3','20.19.0','21.7.3','22.0.0','22.12.0','24.18.0',
];
const peerVersions = {
  storybook:['6.5.16','7.0.0','7.6.17','8.0.0','9.0.0','10.0.0'],
  '@storybook/core':['7.0.0','8.0.0','9.0.0','10.0.0'],
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


async function check([name,from,to]) {
  const old=facts[name][from], next=facts[name][to];
  for (const source of [old,next]) assert.match(source.integrity,/^sha512-[\w+/]{86}==$/);
  if (name==='vite-plugin-pwa' && from==='0.20.1' && to==='0.20.2') {
    await runtime.pwaSize(facts,from,to);
    return ['pwa-oversize-precache',{}];
  }
  if (name==='syncpack' && ['12.0.0','13.0.0'].includes(from) && ['14.0.0','15.0.0'].includes(to)) {
    assert(runtime.syncpack(facts,from,to));
    return ['syncpack-lint-command',{}];
  }
  if (name==='chai-as-promised') {
    runtime.chaiPlugin(facts,from,to);
    return ['chai-plugin-esm-required',{}];
  }
  if (name==='@types/chai-as-promised' && old.artifacts.requirePlugin.length && !next.artifacts.requirePlugin.length) {
    assert(next.artifacts.defaultPlugin.length && next.type==='module');
    return ['chai-plugin-esm-declarations',{}];
  }
  if (name==='jotai' && old.artifacts.initialValues.length && !next.artifacts.initialValues.length) {
    assert(next.artifacts.providerStore.length);
    return ['jotai-initialize-store',{}];
  }
  if (name==='vite-plugin-dts' && old.artifacts.outputDir.length && !next.artifacts.outputDir.length && next.artifacts.outDir.length)
    return ['vite-dts-outdir',{}];
  if (name==='@storybook/addon-actions' && old.artifacts.action.length && !next.artifacts.action.length)
    return ['storybook-action-entry',{}];
  if (name.startsWith('@types/') && old.typeScriptVersion && next.typeScriptVersion) {
    const a=semver.coerce(old.typeScriptVersion), b=semver.coerce(next.typeScriptVersion);
    if (a && b && semver.lt(a,b)) {
      return ['types-compiler-floor',{oldFloor:old.typeScriptVersion,newFloor:next.typeScriptVersion}];
    }
  }
  if (name==='@hello-pangea/dnd' && old.artifacts.reset.length && !next.artifacts.reset.length) {
    assert(next.artifacts.context.length);
    return ['dnd-server-context',{}];
  }
  if (name==='mobx-react' && old.artifacts.provider.length && !next.artifacts.provider.length) {
    assert(next.artifacts.observer.length);
    return ['mobx-react-context',{}];
  }
  if (name==='react-youtube' && old.artifacts.oldFrameClass.length && !next.artifacts.oldFrameClass.length) {
    assert(next.artifacts.newFrameClass.length);
    return ['react-youtube-iframe-class',{}];
  }
  if (name==='react-resize-detector' && old.artifacts.commonjs.length && next.type==='module'
      && next.exports==='./build/index.js' && next.artifacts.exportHook.length)
    return ['resize-detector-esm',{}];
  return peer(old,next) ?? engine(old,next);
}

module.exports = {check};
