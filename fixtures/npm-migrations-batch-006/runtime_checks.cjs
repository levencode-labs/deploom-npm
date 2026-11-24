'use strict';
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {realpathSync,mkdtempSync,rmSync,writeFileSync}=require('node:fs');
const {dirname,join}=require('node:path');
const {tmpdir}=require('node:os');
const {spawnSync}=require('node:child_process');

function installed(facts,dir,alias,name,version){
  const root=join(__dirname,dir);
  const load=createRequire(join(root,'package.json'));
  const {packages}=require(join(root,'package-lock.json'));
  const metadata=require(join(root,'node_modules',alias,'package.json'));
  assert.deepEqual([metadata.name,metadata.version],[name,version]);
  assert.equal(packages['node_modules/'+alias].integrity,facts[name][version].integrity);
  return {root,load,metadata};
}

async function pwaSize(facts,from,to){
  const run=async (alias,version,limit)=>{
    const {load}=installed(facts,'pwa-size',alias,'vite-plugin-pwa',version);
    const {build}=load('vite');
    const {VitePWA}=load(alias);
    const tempRoot=realpathSync(tmpdir());
    const root=mkdtempSync(join(tempRoot,'deploom-pwa-'));
    try {
      writeFileSync(join(root,'index.html'),'<main></main><script type="module" src="./main.js"></script>');
      writeFileSync(join(root,'main.js'),'document.body.textContent = "'+'x'.repeat(1024)+'";');
      await build({
        configFile:false, root, logLevel:'silent',
        build:{minify:false,reportCompressedSize:false},
        plugins:[VitePWA({manifest:false,injectRegister:false,workbox:{
          globPatterns:['**/*.{html,js}'], maximumFileSizeToCacheInBytes:limit, mode:'development',
        }})],
      });
    } finally {
      assert.equal(dirname(realpathSync(root)),tempRoot);
      rmSync(root,{recursive:true,force:true});
    }
  };
  await run('before',from,256);
  await assert.rejects(run('after',to,256),/maximumFileSizeToCacheInBytes/);
  await run('after',to,4096);
}

function syncpack(facts,from,to){
  function invocation(alias,version,args){
    const {root,metadata}=installed(facts,'syncpack-cli',alias,'syncpack',version);
    const script=join(root,'node_modules',alias,metadata.bin.syncpack);
    return spawnSync(process.execPath,[script,...args],{cwd:root,encoding:'utf8',timeout:15000});
  }
  const alias=(arm,version)=>arm+version.split('.')[0];
  function output(result){return result.stdout+'\n'+result.stderr;}
  const held=['list-mismatches','--help'];
  const old=invocation(alias('before',from),from,held);
  const upgraded=invocation(alias('after',to),to,held);
  if (old.status!==0 || upgraded.status===0 || !/list-mismatches/.test(output(upgraded))) return false;
  const lint=invocation(alias('after',to),to,['lint','--help']);
  assert.equal(lint.status,0,output(lint));
  assert.match(output(lint),/\blint\b/i);
  return true;
}

function chaiPlugin(facts,from,to){
  const {root}=installed(facts,'chai-esm','before','chai-as-promised',from);
  installed(facts,'chai-esm','after','chai-as-promised',to);
  const check=(flags,src)=>spawnSync(process.execPath,[...flags,'-e',src],
    {cwd:root,encoding:'utf8',timeout:10000});
  const requireOnly=['--no-experimental-require-module'];
  assert.equal(check(requireOnly,"if(typeof require('before')!=='function')process.exit(1)").status,0);
  const held=check(requireOnly,"require('after')");
  assert.notEqual(held.status,0);
  assert.match(held.stderr,/ERR_REQUIRE_ESM/);
  const target=check([],"import('after').then(async m => {const chai=require('chai');chai.use(m.default);await chai.expect(Promise.resolve(42)).to.eventually.equal(42)})");
  assert.equal(target.status,0,target.stderr);
}

module.exports={pwaSize,syncpack,chaiPlugin};
