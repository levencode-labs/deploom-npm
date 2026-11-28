'use strict';
const assert=require('node:assert/strict');
const {createRequire}=require('node:module');
const {spawnSync}=require('node:child_process');
const fs=require('node:fs'), path=require('node:path'), http=require('node:http');
const repo=path.resolve(__dirname,'../..');
const fixture=path.join(repo,'fixtures/vite8-vue-peer');
const pw=createRequire(path.join(repo,'fixtures/playwright-api-transitions/test/package.json'));
const pwManifest=pw.resolve('pw-157/package.json');
assert.equal(require(pwManifest).version,'1.57.0');
const pwLoad=createRequire(pwManifest);
assert.equal(pwLoad('playwright/package.json').version,'1.57.0');
const {chromium}=pwLoad('playwright');

function write(p,data){fs.mkdirSync(path.dirname(p),{recursive:true});fs.writeFileSync(p,data,{flag:'wx'});}
async function run(browser,arm,versions,bad=false){
  const base=path.join(fixture,arm), load=createRequire(path.join(base,'package.json'));
  for(const [pkg,version] of Object.entries(versions)) assert.equal(load(pkg+'/package.json').version,version,pkg);
  const app=fs.mkdtempSync(path.join(base,'stage-b-app-'));
  let server, page;
  try {
    write(path.join(app,'index.html'),'<!doctype html><html><body><div id="app"></div><script type="module" src="/src/main.js"></script></body></html>');
    write(path.join(app,'vite.config.mjs'),"import vue from '@vitejs/plugin-vue'; export default {plugins:[vue()]};");
    write(path.join(app,'src/main.js'),"import {createApp} from 'vue'; import App from './App.vue'; createApp(App).mount('#app');");
    write(path.join(app,'src/App.vue'),'<script setup>\nimport {ref} from "vue"; const count=ref(0), name=ref(""), saved=ref(""); function add(){count.value+='+ (bad?'2':'1') +';} function save(){saved.value=name.value;} function reset(){count.value=0;name.value="";saved.value="";}\n</script><template><main><button @click="add">Add</button><output aria-label="Count">{{count}}</output><form @submit.prevent="save"><label>Name<input v-model="name"/></label><button :disabled="!name">Save</button></form><p role="status">{{saved}}</p><button @click="reset">Reset</button></main></template>');
    const vite=path.join(path.dirname(load.resolve('vite/package.json')),'bin/vite.js');
    const build=spawnSync(process.execPath,[vite,'build'],{cwd:app,encoding:'utf8',timeout:120000});
    if(build.error)throw build.error;
    assert.equal(build.status,0,build.stdout+build.stderr);
    const dist=path.join(app,'dist');
    server=http.createServer((req,res)=>{
      const pathname=new URL(req.url,'http://127.0.0.1').pathname;
      const target=path.resolve(dist,pathname==='/'?'index.html':'.'+pathname);
      if(!target.startsWith(dist+path.sep)||!fs.existsSync(target)||!fs.statSync(target).isFile()){res.writeHead(404);res.end();return;}
      res.setHeader('content-type',target.endsWith('.js')?'application/javascript':target.endsWith('.css')?'text/css':'text/html');
      res.end(fs.readFileSync(target));
    });
    await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
    page=await browser.newPage();
    const errors=[];page.on('pageerror',e=>errors.push(String(e)));
    const response=await page.goto('http://127.0.0.1:'+server.address().port+'/');
    assert.equal(response.status(),200);
    await page.getByRole('button',{name:'Add',exact:true}).click();
    await page.getByRole('button',{name:'Reset',exact:true}).waitFor();
    assert.equal(await page.locator('output').textContent(),'1','STAGE_B_BROWSER_COUNT');
    assert.equal(await page.getByRole('button',{name:'Save',exact:true}).isDisabled(),true);
    await page.getByRole('textbox',{name:'Name'}).fill('Ada');
    await page.getByRole('button',{name:'Save',exact:true}).click();
    assert.equal(await page.locator('p[role="status"]').textContent(),'Ada','STAGE_B_BROWSER_SAVE');
    await page.getByRole('button',{name:'Reset',exact:true}).click();
    assert.equal(await page.locator('output').textContent(),'0','STAGE_B_BROWSER_RESET');
    assert.equal(await page.getByRole('textbox',{name:'Name'}).inputValue(),'');
    assert.equal(await page.locator('p[role="status"]').textContent(),'');
    assert.deepEqual(errors,[]);
    console.log('STAGE_B_VUE_BROWSER_PASS '+arm);
  }finally{
    if(page) await page.close();
    if(server)await new Promise(r=>server.close(r));
    fs.rmSync(app,{recursive:true,force:true});
  }
}
(async()=>{
 const browser=await chromium.launch({headless:true});
 const before={vite:'5.0.10','@vitejs/plugin-vue':'4.5.0',vue:'3.3.8'};
 const after={vite:'8.3.8','@vitejs/plugin-vue':'6.0.7',vue:'3.3.8'};
 try{
   await run(browser,'before',before);
   await run(browser,'after',after);
   await assert.rejects(run(browser,'after',after,true),e=>e.code==='ERR_ASSERTION'&&e.message.includes('STAGE_B_BROWSER_COUNT'));
   console.log('STAGE_B_VUE_NEGATIVE_PASS');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
