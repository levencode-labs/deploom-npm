'use strict';
const assert = require('node:assert/strict');
const { writeFileSync, mkdtempSync, rmSync, readFileSync } = require('node:fs');
const { join } = require('node:path');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { spawnSync } = require('node:child_process');
const semver = require('./p00/node_modules/semver');
const facts = require('./facts.json');
const compilerCases = require('./ts-cases.json');
const runtime = { glob:'p02',typescript:'p04',globals:'p05',rimraf:'p10',eslint:'p12',
  '@types/react':'p13',prettier:'p16','@eslint/js':'p17','@types/react-dom':'p18',axios:'p19',
  chai:'p20', reselect:'p32',redux:'p35','@types/jest':'p37','@types/eslint':'p38','big.js':'p39',
  'react-markdown':'p42','@reduxjs/toolkit':'p47' };
const testNodes = ['8.17.0','10.24.1','12.22.12','14.16.0','14.21.3','16.20.2','18.16.1',
  '18.20.8','20.0.0','20.18.3','20.19.0','21.7.3','22.0.0','22.12.0','24.18.0'];
const peers = {
  '@babel/core':['7.29.7','8.0.0'], eslint:['7.32.0','8.56.0','8.57.0','9.0.0','10.0.0'],
  vite:['2.9.14','3.2.5','4.5.5','5.4.19','6.0.0','7.0.0','8.0.0'],
  react:['16.14.0','17.0.2','18.2.0','19.0.0','19.2.0'],
  'react-dom':['16.14.0','17.0.2','18.2.0','19.0.0','19.2.0'],
  prettier:['2.8.8','3.0.0','3.5.0'], webpack:['4.47.0','5.82.0','5.101.0'],
  postcss:['7.0.39','8.4.49','8.5.0'], 'redux':['4.2.1','5.0.0'],
  '@types/react':['17.0.43','18.3.13','19.0.0'],
};

function arm(name, version) {
  const manifest = facts[name][version];
  assert.match(manifest.integrity, /^sha512-[\w+/]{86}==$/);
  if (!runtime[name]) return { manifest };
  const cwd = join(__dirname, runtime[name]);
  const alias = 'v-' + version.replaceAll('.', '-');
  const root = join(cwd, 'node_modules', alias);
  const pkg = join(root, 'package.json');
  const actual = require(pkg);
  assert.equal(actual.name, name);
  assert.equal(actual.version, version);
  assert.equal(require(join(cwd,'package-lock.json')).packages['node_modules/' + alias].integrity, manifest.integrity);
  const load = createRequire(join(cwd, 'package.json'));
  return { manifest, cwd, alias, root, entry: () => load(alias) };
}

function engine(a,b) {
  const old = a.engines?.node;
  const next = b.engines?.node;
  if (!old || !next) return;
  const held = testNodes.find(v=>semver.satisfies(v,old) && !semver.satisfies(v,next));
  if (!held || !semver.satisfies('24.18.0',next)) return;
  assert(!semver.satisfies(held,next));
  return ['node-engine',{ held, a:old, b:next }];
}

function peer(a,b) {
  for (const [name, samples] of Object.entries(peers)) {
    const old = a.peerDependencies?.[name];
    const next = b.peerDependencies?.[name];
    if (!old || !next) continue;
    const before = samples.findLast(v => semver.satisfies(v,old) && !semver.satisfies(v,next));
    const after = samples.find(v => semver.satisfies(v,next));
    if (!before || !after) continue;
    assert(!semver.satisfies(before,next));
    return ['peer',{ name, a:old, b:next, before, after }];
  }
}

function diagnostics(ts, parent, file, original, json = {}) {
  const dir = mkdtempSync(join(parent,'deploom-ts-'));
  try {
    const path = join(dir,file);
    writeFileSync(path,original);
    const parsed = ts.convertCompilerOptionsFromJson({ strict:true, noEmit:true, target:'es2020',
      jsx:'preserve', types:[], skipLibCheck:true, ...json },dir);
    return [...parsed.errors, ...ts.getPreEmitDiagnostics(ts.createProgram([path],parsed.options))].map(d=>d.code);
  } finally {
    rmSync(dir,{recursive:true,force:true});
  }
}

function compiler(a,b,to) {
  const item = compilerCases[to];
  if (!item) return;
  const file = 'sample' + (item.extension ?? '.ts');
  const run = (pkg,source,options) => diagnostics(pkg.entry(), tmpdir(),file,source,options);
  assert.deepEqual(run(a,item.before,item.originalOptions),[]);
  const codes = run(b,item.before,item.originalOptions);
  assert(codes.includes(item.error));
  assert.deepEqual(run(b,item.after,item.updatedOptions ?? item.originalOptions),[]);
  return ['typescript-config-or-source',{ target:to, code:item.error,
    condition:item.condition, action:item.action }];
}

function reactArm(version) {
  const directory = join(__dirname, 'react-' + version);
  const load = createRequire(join(directory,'package.json'));
  const lock = require(join(directory,'package-lock.json')).packages;
  for (const name of ['react','react-dom']) {
    assert.equal(load(name + '/package.json').version,version);
    if (facts[name]?.[version]) assert.equal(lock['node_modules/'+name].integrity,facts[name][version].integrity);
  }
  return load;
}

function reactMarkup(load, defaults, name = 'Held') {
  const jsx = load('react/jsx-runtime').jsx;
  const server = load('react-dom/server');
  function Held({text}) { return jsx('p', { children:text }); }
  Held.displayName=name;
  Held.defaultProps={text:'fallback'};
  function Fixed({text='fallback'}) { return jsx('p', {children:text}); }
  const notes=[];
  const original=console.error;
  console.error=(message) => notes.push(String(message));
  try {
    return { html:server.renderToStaticMarkup(jsx(defaults ? Fixed : Held,{})),
      warns:notes.some(x=>x.includes('defaultProps')) };
  } finally {
    console.error=original;
  }
}

function cjsOnly(a,b) {
  const options = pkg => ({cwd:pkg.cwd,encoding:'utf8',timeout:20000});
  const held = pkg => spawnSync(process.execPath,['--no-experimental-require-module','-e','require(process.argv[1])',pkg.alias],options(pkg));
  assert.equal(held(a).status,0);
  assert.match(held(b).stderr,/ERR_REQUIRE_ESM/);
  const module = spawnSync(process.execPath,['-e','import(process.argv[1]).then(m=>m.expect(1).equal(1))',b.alias],options(b));
  assert.equal(module.status,0,module.stderr);
}

async function check([name,from,to]) {
  const a=arm(name,from), b=arm(name,to);
  const old=a.manifest, next=b.manifest;
  if (name==='typescript') return compiler(a,b,to) ?? engine(old,next);
  if (name==='@types/react') {
    const ts=arm('typescript','5.9.3').entry();
    const test=(pkg,text)=>diagnostics(ts,pkg.cwd,'check.ts',
      'import type * as React from "../node_modules/' + pkg.alias + '/index";\n' + text,
      {moduleResolution:'node'});
    const child='const C: React.FC = p => { p.children; return null; };';
    const jsx='const C: JSX.Element | null = null;';
    const prior = to==='18.0.0' ? child : jsx;
    const fixed = to==='18.0.0'
      ? 'const C: React.FC<React.PropsWithChildren<{}>> = p => { p.children; return null; };'
      : 'const C: React.JSX.Element | null = null;';
    assert.deepEqual(test(a,prior),[]);
    assert(test(b,prior).includes(to==='18.0.0' ? 2339 : 2503));
    assert.deepEqual(test(b,fixed),[]);
    return [to==='18.0.0' ? 'react-types-children' : 'react-types-jsx',{}];
  }
  if (name==='@types/jest') {
    if (old.artifacts.fakeTimerString && !next.artifacts.fakeTimerString) {
      assert(next.artifacts.fakeTimerConfig);
      return ['jest-timer-config',{}];
    }
    if (old.artifacts.toBeCalled && !next.artifacts.toBeCalled) {
      assert(next.artifacts.toHaveBeenCalled);
      return ['jest-call-alias',{}];
    }
  }
  if (name==='@types/react-dom'&&old.artifacts.legacyRender&&!next.artifacts.legacyRender)
    return ['react-dom-types-render',{}];
  if (name.startsWith('@types/') && old.typeScriptVersion && next.typeScriptVersion) {
    if (semver.lt(semver.coerce(old.typeScriptVersion),semver.coerce(next.typeScriptVersion)))
      return ['types-compiler-floor',{ oldFloor:old.typeScriptVersion,newFloor:next.typeScriptVersion }];
    if (name==='@types/chai'&&old.type!=='module'&&next.type==='module') return ['chai-types-esm',{}];
  }
  if (name==='react'||name==='react-dom') {
    if (from==='18.2.0'&&to==='18.3.0') {
      assert.deepEqual(reactMarkup(reactArm(from),false),{html:'<p>fallback</p>',warns:false});
      assert.deepEqual(reactMarkup(reactArm(to),false,name),{html:'<p>fallback</p>',warns:true});
      assert.deepEqual(reactMarkup(reactArm(to),true),{html:'<p>fallback</p>',warns:false});
      return;
    }
    if (from==='18.3.0'&&to==='18.3.1') {
      assert.equal(typeof reactArm(from)('react').act,'undefined');
      const {act}=reactArm(to)('react');
      assert.equal(typeof act,'function');
      let invoked=false; await act(()=>{invoked=true;}); assert(invoked);
      return;
    }
    if (from==='18.3.1'&&to==='19.0.0') {
      if(name==='react-dom'){
        assert.equal(typeof reactArm(from)('react-dom').render,'function');
        assert.equal(reactArm(to)('react-dom').render,undefined);
        assert.equal(typeof reactArm(to)('react-dom/client').createRoot,'function');
        return ['react-dom-root',{}];
      }
      assert.equal(reactMarkup(reactArm(from),false).html,'<p>fallback</p>');
      assert.equal(reactMarkup(reactArm(to),false).html,'<p></p>');
      assert.equal(reactMarkup(reactArm(to),true).html,'<p>fallback</p>');
      return ['react-function-defaults-removed',{}];
    }
  }
  if(name==='@babel/runtime'){
    assert(old.exports['./helpers/esm/defineProperty']);
    assert.equal(next.exports['./helpers/esm/defineProperty'],undefined);
    assert(next.exports['./helpers/defineProperty'].import);
    return ['babel-runtime-helper',{}];
  }
  if(name==='glob'&&from==='8.1.0'){
    assert.equal(typeof a.entry(),'function');
    assert.equal(typeof b.entry(),'object');
    assert.deepEqual(await b.entry().glob('check.cjs',{cwd:__dirname}),['check.cjs']);
    return ['glob-named-promise',{}];
  }
  if(name==='rimraf'&&from==='4.4.1'){
    assert.equal(typeof a.entry(),'function');
    assert.equal(typeof b.entry(),'object');
    assert.equal(typeof b.entry().rimraf,'function');
    return ['rimraf-named',{}];
  }
  if(name==='prettier'&&to==='3.0.0'){
    const opts={parser:'babel'};
    const source='const  value = 1';
    assert.equal(typeof a.entry().format(source,opts),'string');
    const after=b.entry().format(source,opts);
    assert.equal(typeof after.then,'function');
    assert.equal(await after,'const value = 1;\n');
    return ['prettier-async',{}];
  }
  if(name==='prettier'&&to==='3.5.0'){
    const input='a {\n  background-image: linear-gradient(to bottom, rgb(255 255 0 / 50%), rgb(0 0 255 / 50%)), url("a.svg");\n}\n';
    const options={parser:'css',printWidth:68};
    const held=await a.entry().format(input,options);
    assert(await a.entry().check(held,options));
    assert(!(await b.entry().check(held,options)));
    const formatted=await b.entry().format(held,options);
    assert.match(formatted,/background-image:\n    linear-gradient/);
    assert(await b.entry().check(formatted,options));
    return ['prettier-css-background-wrap',{}];
  }
  if(name==='@sentry/browser'&&old.artifacts.sdkName&&!next.artifacts.sdkName){
    assert(next.artifacts.sdkVersion);
    return ['sentry-sdk-name',{}];
  }
  if(name==='axios'){
    const request=pkg=>pkg.entry().create({adapter:async config=>({data:'fixture',status:200,statusText:'OK',headers:{},config})});
    const aClient=request(a),bClient=request(b);
    const hold = config => { config.headers.common['x-test']='fixture'; return config; };
    aClient.interceptors.request.use(hold);
    assert.equal((await aClient.get('/fixture')).config.headers['x-test'],'fixture');
    const heldTarget=request(b);
    heldTarget.interceptors.request.use(hold);
    await assert.rejects(heldTarget.get('/fixture'), /Cannot set properties of undefined/);
    let migrated;
    bClient.interceptors.request.use(config=>{ migrated=config.headers; config.headers.set('x-test','fixture');return config; });
    await bClient.get('/fixture');
    assert.equal(migrated.get('x-test'),'fixture');
    return ['axios-interceptor-headers',{}];
  }
  if(name==='chai'){cjsOnly(a,b);return ['esm',{}];}
  if(name==='redux'){
    const make=p=>p.entry().createStore((state=0)=>state);
    const action={type:Symbol('fixture')};
    assert.equal(make(a).dispatch(action),action);
    assert.throws(()=>make(b).dispatch(action),/type.*string/i);
    assert.deepEqual(make(b).dispatch({type:'fixture'}),{type:'fixture'});
    return ['redux-string-action',{}];
  }
  if(name==='reselect'){
    const count=(pkg,opts)=>{
      const lib=pkg.entry();
      const select=lib.createSelector([state=>state,(_state,tag)=>tag],(state,tag)=>state[tag],opts??{});
      const state={a:1,b:2};select(state,'a');select(state,'b');select(state,'a');
      return select.recomputations();
    };
    assert.equal(count(a),3);
    assert.equal(count(b),2);
    assert.equal(count(b,{memoize:b.entry().lruMemoize,argsMemoize:b.entry().lruMemoize}),3);
    return ['reselect-memoizer',{}];
  }
  if(name==='@reduxjs/toolkit'&&to==='2.0.0'){
    const held=pkg=>pkg.entry().createReducer(0,{inc: state=>state+1});
    assert.equal(held(a)(0,{type:'inc'}),1);
    assert.throws(()=>held(b)(0,{type:'inc'}),/object notation/i);
    const fixed=b.entry().createReducer(0,builder=>builder.addCase('inc',state=>state+1));
    assert.equal(fixed(0,{type:'inc'}),1);
    return ['rtk-builder',{}];
  }
  if(name==='big.js'){
    const before=a.entry(),after=b.entry();
    assert.equal(String(before(undefined)('1.23')),'1.23');
    assert.throws(()=>after(undefined),/Invalid number/);
    assert.equal(String(after()('1.23')),'1.23');
    return ['big-constructor-argument',{}];
  }
  if(name==='react-redux'&&from==='7.2.8'&&to==='8.0.0'){
    assert.equal(old.types,undefined);
    assert.match(next.types,/\.d\.ts$/);
    return peer(old,next) ?? engine(old,next);
  }
  if(name==='react-markdown'){
    if(from==='8.0.7'){
      assert.match(readFileSync(join(a.root,'lib','ast-to-react.d.ts'),'utf8'),/\blinkTarget\?:/);
      const source=readFileSync(join(b.root,'lib','index.d.ts'),'utf8');
      assert.doesNotMatch(source,/\blinkTarget\?:/);
      assert.match(source,/\bcomponents\?:/);
      return ['markdown-link-components',{}];
    }
    if(to==='10.0.0'){
      assert.match(readFileSync(join(a.root,'lib','index.d.ts'),'utf8'),/\bclassName\?:/);
      assert.doesNotMatch(readFileSync(join(b.root,'lib','index.d.ts'),'utf8'),/\bclassName\?:/);
      return ['markdown-wrapper-class',{}];
    }
  }
  return peer(old,next)??engine(old,next);
}
module.exports={check};
