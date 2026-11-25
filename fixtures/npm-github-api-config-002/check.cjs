'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, rmSync } = require('node:fs');
const { basename, dirname, join, resolve } = require('node:path');
const { tmpdir } = require('node:os');
const { arm } = require('../npm-github-api-contracts/arm.cjs');

function esm(before, after) {
  const legacy = "try {require(process.argv[1])} catch(e) {console.error(e.code);process.exitCode=1}";
  const flags = ['--no-require-module'];
  assert.equal(before.sandbox(legacy, flags).status, 0);
  const held = after.sandbox(legacy, flags);
  assert.equal(held.status, 1);
  assert.match(held.stderr, /^(ERR_REQUIRE_ESM|ERR_PACKAGE_PATH_NOT_EXPORTED)\s*$/);
  assert.equal(after.sandbox('import(process.argv[1])', flags).status, 0);
}

function call(library, input, action) {
  return new Promise((ok, bad) => action(library, input, (error, value) => error ? bad(error) : ok(value)));
}

async function check([group, name, from, to, oldAlias, newAlias, mode]) {
  const before = arm(join(__dirname, group==='babel'?'babel7':group), name, from, oldAlias);
  const after = arm(join(__dirname, group==='babel'?'babel8':group), name, to, newAlias);
  if (mode === 'esm') return esm(before, after);
  const previous = () => before.load();
  const target = () => after.load();

  switch (name) {
  case 'webpack-merge': {
    const run=merge=>merge({plugins:['a']},{plugins:['b']});
    assert.deepEqual(run(previous()),{plugins:['a','b']});
    assert.throws(()=>run(target()),TypeError);
    assert.deepEqual(run(target().merge),{plugins:['a','b']});
    break;
  }
  case 'webpack-node-externals': {
    const root=mkdtempSync(join(tmpdir(),'deploom-node-externals-'));
    assert.equal(dirname(resolve(root)), resolve(tmpdir()));
    assert.ok(basename(root).startsWith('deploom-node-externals-'));
    try {
      const modulesDir=join(root,'node_modules');
      mkdirSync(join(modulesDir,'fixture-module'),{recursive:true});
      const listener=(opt,modern)=>new Promise((ok,bad)=>{
        const callback=(error,value)=>error?bad(error):ok(value);
        const fn=(modern?target():previous())({modulesDir,...opt});
        if (modern) fn({context:root,request:'fixture-module'},callback);
        else fn(root,'fixture-module',callback);
      });
      assert.equal(await listener({whitelist:['fixture-module']},false),undefined);
      await assert.rejects(listener({whitelist:['fixture-module']},true), /allowlist/);
      assert.equal(await listener({allowlist:['fixture-module']},true),undefined);
    } finally {
      rmSync(root,{recursive:true,force:true});
    }
    break;
  }
  case 'history': {
    function listen(lib, modern) {
      const h=lib.createMemoryHistory();
      let output;
      const off=h.listen((value, action)=>{
        output=modern ? [value.location.pathname,value.action] : [value.pathname,action];
      });
      try { h.push('/fixture'); } finally { off(); }
      return output;
    }
    assert.deepEqual(listen(previous(),false),['/fixture','PUSH']);
    assert.deepEqual(listen(target(),false),[undefined,undefined]);
    assert.deepEqual(listen(target(),true),['/fixture','PUSH']);
    break;
  }
  case 'jwt-decode': {
    const payload=Buffer.from(JSON.stringify({label:'fixture'})).toString('base64url');
    const sample='e30.'+payload+'.';
    assert.equal(previous()(sample).label,'fixture');
    assert.throws(()=>target()(sample),TypeError);
    assert.equal(target().jwtDecode(sample).label,'fixture');
    break;
  }
  case 'winston': {
    const old=new (previous().Logger)({transports:[]});
    assert.equal(typeof old.info,'function');
    assert.throws(()=>new (target().Logger)({transports:[]}), /configure|options|constructor/i);
    assert.equal(typeof target().createLogger({transports:[]}).info,'function');
    break;
  }
  case 'generic-pool': {
    const old=previous().Pool({
      create:cb=>cb(null,{fixture:true}),destroy:()=>{},max:1,min:0,
    });
    const value=await new Promise((ok,bad)=>old.acquire((e,x)=>e?bad(e):ok(x)));
    assert.equal(value.fixture,true);
    old.release(value);
    old.drain(()=>old.destroyAllNow());
    assert.throws(()=>target().Pool(),TypeError);
    const current=target().createPool({create:async()=>({fixture:true}),destroy:async()=>{}},{max:1});
    const item=await current.acquire();
    assert.equal(item.fixture,true);
    await current.release(item);
    await current.drain();
    await current.clear();
    break;
  }
  case 'csv-parse': {
    const input='a,b\n1,2\n';
    assert.deepEqual(await call(previous(),input,(lib,x,cb)=>lib(x,cb)),[['a','b'],['1','2']]);
    assert.throws(()=>target()(input),TypeError);
    assert.deepEqual(await call(target(),input,(lib,x,cb)=>lib.parse(x,cb)),[['a','b'],['1','2']]);
    break;
  }
  case 'csv-stringify': {
    const input=[['a','b']];
    assert.equal(await call(previous(),input,(lib,x,cb)=>lib(x,cb)),'a,b\n');
    assert.throws(()=>target()(input),TypeError);
    assert.equal(await call(target(),input,(lib,x,cb)=>lib.stringify(x,cb)),'a,b\n');
    break;
  }
  case 'idb-keyval': {
    const result=(item)=>item.sandbox("import(process.argv[1]).then(m=>console.log(typeof m.Store,typeof m.createStore))");
    assert.equal(result(before).stdout.trim(),'function undefined');
    assert.equal(result(after).stdout.trim(),'undefined function');
    break;
  }
  case 'i18next': {
    const t=async(lib, newKeys)=>{
      const i=lib.createInstance();
      const suffixes=newKeys ? {key_one:'single',key_other:'plural'} : {key:'single',key_plural:'plural'};
      await i.init({lng:'en',fallbackLng:false,...(newKeys?{}:{compatibilityJSON:'v3'}),
        resources:{en:{translation:suffixes}},interpolation:{escapeValue:false}});
      return [i.t('key',{count:1}),i.t('key',{count:2})];
    };
    assert.deepEqual(await t(previous(),false),['single','plural']);
    assert.deepEqual(await t(target(),false),['single','single']);
    assert.deepEqual(await t(target(),true),['single','plural']);
    break;
  }
  case 'isbot': {
    const crawler='Googlebot/2.1 (+http://www.google.com/bot.html)';
    assert.equal(previous().pattern.test(crawler),true);
    assert.equal(target().pattern,undefined);
    assert.equal(target().getPattern().test(crawler),true);
    break;
  }
  case 'js-cookie': {
    assert.equal(typeof previous().defaults,'object');
    assert.equal(target().defaults,undefined);
    assert.equal(target().withAttributes({path:'/fixture'}).attributes.path,'/fixture');
    break;
  }
  case 'qrcode.react': {
    const render=(item, fixed)=> {
      const React=item.peer('react');
      return item.peer('react-dom/server').renderToStaticMarkup(
        React.createElement(fixed ? item.load().QRCodeSVG : item.load().default,{value:'fixture',...(!fixed?{renderAs:'svg'}:{})}));
    };
    assert.match(render(before,false),/^<svg/);
    assert.throws(()=>render(after,false), /element type is invalid/i);
    assert.match(render(after,true),/^<svg/);
    break;
  }
  case '@sentry/react': {
    const old=previous();
    const current=target();
    assert.equal(typeof old.getCurrentHub,'function');
    assert.throws(()=>current.getCurrentHub(),TypeError);
    const scope=current.getCurrentScope().clone();
    scope.setTag('fixture','yes');
    assert.equal(scope.getScopeData().tags.fixture,'yes');
    break;
  }
  case '@svgr/core': {
    const svg='<svg viewBox="0 0 1 1"><path d="M0 0h1"/></svg>';
    const old=previous();
    const current=target();
    const migrate=await current.transform(svg,{plugins:[after.peer('@svgr/plugin-jsx')]},{componentName:'FixtureIcon'});
    assert.match(await (old.default||old)(svg,{}, {componentName:'FixtureIcon'}),/export default FixtureIcon/);
    assert.doesNotMatch(await current.transform(svg,{}, {componentName:'FixtureIcon'}),/export default FixtureIcon/);
    assert.match(migrate,/export default FixtureIcon/);
    break;
  }
  case '@next/eslint-plugin-next': {
    const old=previous(),current=target();
    const {Linter}=after.peer('eslint');
    const source='<img src="/fixture.png" />;';
    const rule='@next/next/no-img-element';
    const parserOptions={ecmaVersion:2022,ecmaFeatures:{jsx:true}};
    const rules={'@next/next/no-html-link-for-pages':'off'};
    const legacy=new Linter({configType:'eslintrc'});
    legacy.defineRule(rule,old.rules['no-img-element']);
    assert.ok(legacy.verify(source,{...old.configs.recommended,parserOptions,rules:{...old.configs.recommended.rules,...rules}}).some(x=>x.ruleId===rule));
    assert.equal(Array.isArray(current.configs.recommended.plugins),false);
    const flat=new Linter();
    assert.ok(flat.verify(source,[{...current.configs.recommended,languageOptions:{parserOptions},rules:{...current.configs.recommended.rules,...rules}}]).some(x=>x.ruleId===rule));
    break;
  }
  case '@babel/preset-react': {
    const code='const icon = <i />;';
    const run=(item,options={})=>item.peer('@babel/core').transformSync(code,{
      babelrc:false, configFile:false, envName:'production', presets:[[item.load().default||item.load(),options]],
    }).code;
    assert.match(run(before),/React\.createElement/);
    assert.doesNotMatch(run(after),/React\.createElement/);
    assert.match(run(after),/react\/jsx-runtime/);
    assert.match(run(after,{runtime:'classic'}),/React\.createElement/);
    break;
  }
  case 'shiki': {
    const old=before.sandbox("import(process.argv[1]).then(m=>console.log(typeof m.getHighlighter))");
    const current=after.sandbox("import(process.argv[1]).then(m=>console.log(typeof m.getHighlighter,typeof m.createHighlighter))");
    assert.equal(old.stdout.trim(),'function');
    assert.equal(current.stdout.trim(),'undefined function');
    break;
  }
  default: throw new Error('No focused verification');
  }
}

async function main() {
  const rows = [
    ["esm-a","@octokit/core","5.0.0","6.0.0","pk-octokit-core-5-0-0","pk-octokit-core-6-0-0","esm"],
    ["esm-a","flat","5.0.0","6.0.0","pk-flat-5-0-0","pk-flat-6-0-0","esm"],
    ["esm-a","change-case","4.0.0","5.0.0","pk-change-case-4-0-0","pk-change-case-5-0-0","esm"],
    ["babel","@babel/preset-react","7.0.0","8.0.0","@babel/preset-react","@babel/preset-react","babel"],
    ["esm-a","lint-staged","11.0.0","12.0.0","pk-lint-staged-11-0-0","pk-lint-staged-12-0-0","esm"],
    ["api","winston","2.0.0","3.0.0","pk-winston-2-0-0","pk-winston-3-0-0","api"],
    ["api","js-cookie","2.0.0","3.0.0","pk-js-cookie-2-0-0","pk-js-cookie-3-0-0","api"],
    ["esm-a","pascal-case","3.0.0","4.0.0","pk-pascal-case-3-0-0","pk-pascal-case-4-0-0","esm"],
    ["esm-a","d3-geo","1.0.0","3.0.0","pk-d3-geo-1-0-0","pk-d3-geo-3-0-0","esm"],
    ["api","isbot","4.0.0","5.0.0","pk-isbot-4-0-0","pk-isbot-5-0-0","api"],
    ["api","debounce","1.0.0","3.0.0","pk-debounce-1-0-0","pk-debounce-3-0-0","esm"],
    ["api","webpack-merge","4.0.0","5.0.0","pk-webpack-merge-4-0-0","pk-webpack-merge-5-0-0","api"],
    ["sdk","@sentry/react","7.0.0","10.0.0","pk-sentry-react-7-0-0","pk-sentry-react-10-0-0","api"],
    ["esm-a","d3-hierarchy","1.0.0","3.0.0","pk-d3-hierarchy-1-0-0","pk-d3-hierarchy-3-0-0","esm"],
    ["esm-a","d3-force","1.0.0","3.0.0","pk-d3-force-1-0-0","pk-d3-force-3-0-0","esm"],
    ["api","shiki","1.0.0","3.0.0","pk-shiki-1-0-0","pk-shiki-3-0-0","api"],
    ["api","i18next","23.0.0","24.0.0","pk-i18next-23-0-0","pk-i18next-24-0-0","api"],
    ["esm-a","url-join","4.0.0","5.0.0","pk-url-join-4-0-0","pk-url-join-5-0-0","esm"],
    ["esm-a","d3-dsv","2.0.0","3.0.0","pk-d3-dsv-2-0-0","pk-d3-dsv-3-0-0","esm"],
    ["esm-a","@formatjs/icu-messageformat-parser","2.0.0","3.0.0","pk-formatjs-icu-messageformat-parser-2-0-0","pk-formatjs-icu-messageformat-parser-3-0-0","esm"],
    ["esm-a","queue","6.0.0","7.0.0","pk-queue-6-0-0","pk-queue-7-0-0","esm"],
    ["api","jwt-decode","3.0.0","4.0.0","pk-jwt-decode-3-0-0","pk-jwt-decode-4-0-0","api"],
    ["api","csv-parse","2.0.0","5.0.0","pk-csv-parse-2-0-0","pk-csv-parse-5-0-0","api"],
    ["esm-a","@octokit/rest","20.0.0","22.0.0","pk-octokit-rest-20-0-0","pk-octokit-rest-22-0-0","esm"],
    ["svgr","@svgr/core","5.0.0","7.0.0","pk-svgr-core-5-0-0","pk-svgr-core-7-0-0","api"],
    ["esm-a","@actions/core","2.0.0","3.0.0","pk-actions-core-2-0-0","pk-actions-core-3-0-0","esm"],
    ["esm-a","@actions/exec","1.0.0","3.0.0","pk-actions-exec-1-0-0","pk-actions-exec-3-0-0","esm"],
    ["esm-a","@vue/devtools-api","6.0.0","8.0.0","pk-vue-devtools-api-6-0-0","pk-vue-devtools-api-8-0-0","esm"],
    ["api","generic-pool","2.0.0","3.0.0","pk-generic-pool-2-0-0","pk-generic-pool-3-0-0","api"],
    ["api","history","4.0.0","5.0.0","pk-history-4-0-0","pk-history-5-0-0","api"],
    ["api","webpack-node-externals","1.0.0","3.0.0","pk-webpack-node-externals-1-0-0","pk-webpack-node-externals-3-0-0","api"],
    ["esm-a","@commitlint/config-conventional","18.0.0","19.0.0","pk-commitlint-config-conventional-18-0-0","pk-commitlint-config-conventional-19-0-0","esm"],
    ["esm-a","pixelmatch","5.0.0","7.0.0","pk-pixelmatch-5-0-0","pk-pixelmatch-7-0-0","esm"],
    ["api","csv-stringify","5.0.0","6.0.0","pk-csv-stringify-5-0-0","pk-csv-stringify-6-0-0","api"],
    ["esm-a","pbf","3.0.0","5.0.0","pk-pbf-3-0-0","pk-pbf-5-0-0","esm"],
    ["esm-a","@actions/github","6.0.0","9.0.0","pk-actions-github-6-0-0","pk-actions-github-9-0-0","esm"],
    ["api","idb-keyval","3.0.0","6.0.0","pk-idb-keyval-3-0-0","pk-idb-keyval-6-0-0","api"],
    ["render","qrcode.react","3.0.0","4.0.0","pk-qrcode.react-3-0-0","pk-qrcode.react-4-0-0","api"],
    ["esm-b","remark-math","3.0.0","5.0.0","pk-remark-math-3-0-0","pk-remark-math-5-0-0","esm"],
    ["esm-b","@octokit/auth-app","6.0.0","8.0.0","pk-octokit-auth-app-6-0-0","pk-octokit-auth-app-8-0-0","esm"],
    ["next","@next/eslint-plugin-next","15.0.0","16.0.0","pk-next15","pk-next16","api"],
  ];
  assert.equal(new Set(rows.map(([,p,a,b])=>[p,a,b].join(' '))).size,rows.length);
  let failed=0;
  for (const row of rows) {
    try {
      await check(row);
      console.log(JSON.stringify({row,ok:true}));
    } catch (error) {
      failed++;
      console.log(JSON.stringify({row,ok:false,error:String(error.message).slice(0,300)}));
    }
  }
  if (failed) process.exitCode=1;
}

main();
