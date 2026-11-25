'use strict';

const assert = require('node:assert/strict');
const { existsSync } = require('node:fs');
const { join } = require('node:path');
const { arm } = require('../npm-github-api-contracts/arm.cjs');
const split = new Set(['apollo','vtu','ng']);

function esm(before, after) {
  const legacy="try {require(process.argv[1]);} catch(e){console.error(e.code);process.exitCode=1;}";
  const flags=['--no-require-module'];
  assert.equal(before.sandbox(legacy,flags).status,0);
  const held=after.sandbox(legacy,flags);
  assert.equal(held.status,1);
  assert.match(held.stderr,/^(ERR_REQUIRE_ESM|ERR_PACKAGE_PATH_NOT_EXPORTED)\s*$/);
  const migrated=after.sandbox('import(process.argv[1])',flags);
  assert.equal(migrated.status,0,migrated.stderr);
}

function within(promise) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer=setTimeout(()=>reject(new Error('Missing expected sample event')),8000);
  });
  return Promise.race([promise,timeout]).finally(()=>clearTimeout(timer));
}

async function check([group,name,from,to,a,b,mode]) {
  const before=arm(join(__dirname,split.has(group)?group+'-before':group),name,from,a);
  const after=arm(join(__dirname,split.has(group)?group+'-after':group),name,to,b);
  if (mode==='esm') return esm(before,after);
  const previous=()=>before.load();
  const target=()=>after.load();
  switch (name) {
  case '@apollo/client': {
    const source=`const assert=require('node:assert/strict');
      const React=require('react');
      const {renderToStaticMarkup}=require('react-dom/server');
      const core=require('@apollo/client');
      const {ApolloProvider,useApolloClient}=process.argv.includes('split')?require('@apollo/client/react'):core;
      const {ApolloClient,ApolloLink,InMemoryCache,gql}=core;
      const query=gql('query Greeting { greeting }');
      const cache=new InMemoryCache();
      cache.writeQuery({query,data:{greeting:'Hello from cache'}});
      const client=new ApolloClient({cache,link:new ApolloLink(()=>{throw Error('Unexpected network request');})});
      function Greeting() {
        const data=useApolloClient().readQuery({query});
        assert.equal(data.greeting,'Hello from cache');
        return React.createElement('p',null,data.greeting);
      }
      process.stdout.write(renderToStaticMarkup(React.createElement(ApolloProvider,{client},React.createElement(Greeting))));`;
    const root=before.sandbox(source);
    assert.equal(root.status,0,root.stderr);
    assert.equal(root.stdout,'<p>Hello from cache</p>');
    const held=after.sandbox(source);
    assert.equal(held.status,1,held.stderr);
    assert.match(held.stderr,/Element type is invalid/);
    const moved=after.sandbox(source.replace("process.argv.includes('split')","true"));
    assert.equal(moved.status,0,moved.stderr);
    assert.equal(moved.stdout,root.stdout);
    break;
  }
  case 'xstate': {
    const def={initial:'ready',states:{ready:{on:{FINISH:'done'}},done:{}}};
    const old=previous().Machine(def);
    assert.equal(old.initialState.value,'ready');
    const next=target().createMachine(def);
    assert.throws(()=>next.initialState.value,TypeError);
    const actor=target().createActor(next).start();
    try {
      assert.equal(actor.getSnapshot().value,'ready');
      actor.send({type:'FINISH'});
      assert.equal(actor.getSnapshot().value,'done');
    } finally {
      actor.stop();
    }
    break;
  }
  case 'node-cron': {
    const expression='* * * * * *';
    const signals = [0,1,2].map(()=>Promise.withResolvers());
    const counts=[0,0,0];
    const run=i=>()=>{counts[i]++;signals[i].resolve();};
    const original=previous().schedule(expression,run(0),{scheduled:false});
    const held=target().schedule(expression,run(1),{scheduled:false});
    const deferred=target().createTask(expression,run(2));
    try {
      await within(signals[1].promise);
      assert.ok(counts[1]>0);
      assert.equal(counts[0],0);
      assert.equal(counts[2],0);
      await held.stop();
      original.start();
      await deferred.start();
      await within(Promise.all([signals[0].promise,signals[2].promise]));
      assert.ok(counts[0]&&counts[2]);
    } finally {
      await Promise.all([original.stop(),held.stop(),deferred.stop()]);
    }
    break;
  }
  case '@vue/test-utils': {
    const source=`const {JSDOM}=require('jsdom');
      const {window}=new JSDOM('<!doctype html><html><body></body></html>');
      for(const name of ['window','document','Element','HTMLElement','SVGElement','Node','HTMLBodyElement']) {
        globalThis[name]=name==='window'?window:window[name];
      }
      const vtu=require('@vue/test-utils');
      const Vue=require('vue');
      const modern=false;
      try {
        let options;
        if(modern) {
          options={global:{plugins:[{install(app){app.config.globalProperties.$label='plugin text';}}]}};
        } else {
          const localVue=vtu.createLocalVue();
          localVue.use({install(V){V.prototype.$label='plugin text';}});
          options={localVue};
        }
        const wrapper=vtu.mount({render(h){return (modern?Vue.h:h)('p',this.$label);}},options);
        process.stdout.write(wrapper.text());
        if(modern) wrapper.unmount();
        else wrapper.destroy();
      } finally {window.close();}
    `;
    const old=before.sandbox(source);
    assert.equal(old.status,0,old.stderr);
    assert.equal(old.stdout,'plugin text');
    const held=after.sandbox(source);
    assert.equal(held.status,1,held.stderr);
    assert.match(held.stderr,/createLocalVue is not a function/);
    const fixed=after.sandbox(source.replace('const modern=false;','const modern=true;'));
    assert.equal(fixed.status,0,fixed.stderr);
    assert.equal(fixed.stdout,old.stdout);
    break;
  }
  case 'ethers': {
    const result=previous().utils.parseEther('1.5');
    assert.equal(result.toString(),'1500000000000000000');
    assert.throws(()=>target().utils.parseEther('1.5'),TypeError);
    const migrated=target().parseEther('1.5');
    assert.equal(typeof migrated,'bigint');
    assert.equal(migrated.toString(),result.toString());
    break;
  }
  case 'graphql-subscriptions': {
    const p=new (previous().PubSub)();
    const n=new (target().PubSub)();
    const channel='sample';
    const original=p.asyncIterator(channel);
    assert.throws(()=>n.asyncIterator(channel),TypeError);
    const fixed=n.asyncIterableIterator(channel);
    async function value(pub,it) {
      const next=it.next();
      await new Promise(r=>setImmediate(r));
      try {
        await pub.publish(channel,{label:'fixture'});
        return await within(next);
      } finally {
        await it.return();
      }
    }
    assert.deepEqual(await value(p,original),{value:{label:'fixture'},done:false});
    assert.deepEqual(await value(n,fixed),{value:{label:'fixture'},done:false});
    break;
  }
  case 'markdown-it-emoji': {
    const md=before.peer('markdown-it');
    const options={defs:{smile:'fixture-label'}};
    const old=md().use(previous(),options).render(':smile:');
    assert.ok(old.includes('fixture-label'));
    assert.throws(()=>md().use(target()),/apply is not a function/);
    assert.equal(md().use(target().full,options).render(':smile:'),old);
    break;
  }
  case '@msgpack/msgpack': {
    async function collect(lib, method) {
      async function* chunks() {
        yield lib.encode(1);
        yield lib.encode(2);
      }
      const values=[];
      for await (const value of lib[method](chunks())) values.push(value);
      return values;
    }
    assert.deepEqual(await collect(previous(),'decodeStream'),[1,2]);
    await assert.rejects(collect(target(),'decodeStream'),TypeError);
    assert.deepEqual(await collect(target(),'decodeMultiStream'),[1,2]);
    break;
  }
  case 'koa-body':
    assert.equal(typeof previous()(),'function');
    assert.throws(()=>target()(),TypeError);
    assert.equal(typeof target().koaBody(),'function');
    break;
  case 'redux-logger': {
    const factory=previous().default||previous();
    assert.equal(typeof factory(),'function');
    assert.throws(()=>target()(),TypeError);
    assert.equal(typeof target().createLogger(),'function');
    break;
  }
  case 'remark': {
    const bin=m=>typeof m.bin==='string'?m.bin:m.bin?.remark;
    assert.ok(existsSync(join(before.root,bin(before.manifest))));
    assert.equal(bin(after.manifest),undefined);
    assert.equal(target().parse('sample text').children[0].type,'paragraph');
    break;
  }
  case '@angular/compiler-cli': {
    assert.ok(existsSync(join(before.root,before.manifest.bin.ngcc)));
    assert.equal(after.manifest.bin.ngcc,undefined);
    assert.ok(existsSync(join(after.root,after.manifest.bin.ngc)));
    break;
  }
  case 'eslint-plugin-cypress': {
    assert.ok(before.resolve('/flat'));
    assert.throws(()=>after.resolve('/flat'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
    const plugin=target();
    assert.ok(plugin.configs.recommended.rules['cypress/no-unnecessary-waiting']);
    assert.ok(plugin.configs.recommended.plugins.cypress);
    break;
  }
  case 'eslint-plugin-perfectionist': {
    assert.ok(before.resolve('/configs/recommended-alphabetical'));
    assert.throws(()=>after.resolve('/configs/recommended-alphabetical'),{code:'ERR_PACKAGE_PATH_NOT_EXPORTED'});
    const plugin=target().default||target();
    const config=plugin.configs['recommended-alphabetical'];
    const rule=(Array.isArray(config)?config:[config]).flatMap(x=>Object.keys(x.rules||{}));
    assert.ok(rule.includes('perfectionist/sort-imports'));
    break;
  }
  default: throw new Error('No focused verification');
  }
}

async function main() {
  const rows = [
    ["apollo","@apollo/client","3.0.0","4.0.0","@apollo/client","@apollo/client","api"],
    ["simple","node-cron","3.0.0","4.0.0","p-node-cron-3-0-0","p-node-cron-4-0-0","api"],
    ["esm1","node-notifier","10.0.0","12.0.0","p-node-notifier-10-0-0","p-node-notifier-12-0-0","esm"],
    ["esm1","remark","9.0.0","14.0.0","p-remark-9-0-0","p-remark-14-0-0","esm"],
    ["simple","xstate","4.0.0","5.0.0","p-xstate-4-0-0","p-xstate-5-0-0","api"],
    ["esm1","@manypkg/get-packages","1.0.0","3.0.0","p-manypkg-get-packages-1-0-0","p-manypkg-get-packages-3-0-0","esm"],
    ["vtu","@vue/test-utils","1.0.0","2.0.0","@vue/test-utils","@vue/test-utils","api"],
    ["simple","@msgpack/msgpack","2.0.0","3.0.0","p-msgpack-msgpack-2-0-0","p-msgpack-msgpack-3-0-0","api"],
    ["simple","ethers","5.0.0","6.0.0","p-ethers-5-0-0","p-ethers-6-0-0","api"],
    ["esm1","@mapbox/mapbox-gl-supported","2.0.0","4.0.0","p-mapbox-mapbox-gl-supported-2-0-0","p-mapbox-mapbox-gl-supported-4-0-0","esm"],
    ["esm1","sort-package-json","1.0.0","2.0.0","p-sort-package-json-1-0-0","p-sort-package-json-2-0-0","esm"],
    ["simple","graphql-subscriptions","2.0.0","3.0.0","p-graphql-subscriptions-2-0-0","p-graphql-subscriptions-3-0-0","api"],
    ["esm1","monocart-coverage-reports","2.0.0","3.0.0","p-monocart-coverage-reports-2-0-0","p-monocart-coverage-reports-3-0-0","esm"],
    ["esm1","@lingui/conf","5.0.0","6.0.0","p-lingui-conf-5-0-0","p-lingui-conf-6-0-0","esm"],
    ["simple","redux-logger","2.0.0","3.0.0","p-redux-logger-2-0-0","p-redux-logger-3-0-0","api"],
    ["esm1","gettext-parser","4.0.0","10.0.0","p-gettext-parser-4-0-0","p-gettext-parser-10-0-0","esm"],
    ["simple","markdown-it-emoji","1.0.0","3.0.0","p-markdown-it-emoji-1-0-0","p-markdown-it-emoji-3-0-0","api"],
    ["esm1","franc-min","4.0.0","6.0.0","p-franc-min-4-0-0","p-franc-min-6-0-0","esm"],
    ["esm1","@apify/log","2.0.0","3.0.0","p-apify-log-2-0-0","p-apify-log-3-0-0","esm"],
    ["simple","koa-body","2.0.0","8.0.0","p-koa-body-2-0-0","p-koa-body-8-0-0","api"],
    ["esm1","shlex","2.0.0","3.0.0","p-shlex-2-0-0","p-shlex-3-0-0","esm"],
    ["esm1","remark-toc","5.0.0","9.0.0","p-remark-toc-5-0-0","p-remark-toc-9-0-0","esm"],
    ["esm1","remark-lint","5.0.0","10.0.0","p-remark-lint-5-0-0","p-remark-lint-10-0-0","esm"],
    ["esm1","linguist-languages","8.0.0","9.0.0","p-linguist-languages-8-0-0","p-linguist-languages-9-0-0","esm"],
    ["esm1","@sindresorhus/to-milliseconds","1.0.0","2.0.0","p-sindresorhus-to-milliseconds-1-0-0","p-sindresorhus-to-milliseconds-2-0-0","esm"],
    ["extra","magnet-uri","6.0.0","7.0.0","p-magnet-uri-6-0-0","p-magnet-uri-7-0-0","esm"],
    ["extra","@ai-sdk/open-responses","1.0.0","2.0.0","p-ai-sdk-open-responses-1-0-0","p-ai-sdk-open-responses-2-0-0","esm"],
    ["extra","remark","6.0.0","9.0.0","p-remark-6-0-0","p-remark-9-0-0","api"],
    ["lint","@stylistic/eslint-plugin","3.0.0","5.0.0","p-stylistic-eslint-plugin-3-0-0","p-stylistic-eslint-plugin-5-0-0","esm"],
    ["lint","eslint-plugin-cypress","4.0.0","6.0.0","p-eslint-plugin-cypress-4-0-0","p-eslint-plugin-cypress-6-0-0","api"],
    ["perfectionist","eslint-plugin-perfectionist","2.0.0","5.0.0","p-eslint-plugin-perfectionist-2-0-0","p-eslint-plugin-perfectionist-5-0-0","api"],
    ["ng","@angular/compiler-cli","15.0.0","21.0.0","@angular/compiler-cli","@angular/compiler-cli","api"],
  ];
  assert.equal(new Set(rows.map(([,p,a,b])=>[p,a,b].join(' '))).size,rows.length);
  let failed=0;
  for (const row of rows) {
    try {
      await check(row);
      console.log(JSON.stringify({row,ok:true}));
    } catch (error) {
      failed++;
      console.log(JSON.stringify({row,ok:false,error:String(error.message).slice(0,350)}));
    }
  }
  if (failed) process.exitCode=1;
}
main();
