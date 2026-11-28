'use strict';
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const path = require('node:path');
const [arm,version,mode] = process.argv.slice(2);
const load = createRequire(path.join(path.resolve(arm),'package.json'));
const { JSDOM } = load('jsdom');
const dom = new JSDOM('<main id="root"></main>',{pretendToBeVisual:true});
global.window=dom.window;
global.document=dom.window.document;
global.IS_REACT_ACT_ENVIRONMENT=true;
const React=load('react'), {createRoot}=load('react-dom/client'), {CSSTransition}=load('react-transition-group');
assert.equal(React.version,version);
assert.equal(load('react-dom/package.json').version,version);
assert.equal(load('react-transition-group/package.json').version,'4.4.5');
assert.equal(load('jsdom/package.json').version,'25.0.1');
const h=React.createElement, host=document.querySelector('#root'), root=createRoot(host);
function App() {
  const [open,setOpen]=React.useState(false), [count,setCount]=React.useState(0);
  const ref=React.useRef(null);
  const explicit=mode!=='implicit';
  return h(React.Fragment,null,
    h('button',{id:'toggle',onClick:()=>setOpen(x=>!x)},'Toggle'),
    h('button',{id:'increment',onClick:()=>setCount(x=>x+(mode==='bad-handler'?2:1))},'Increment'),
    h('button',{id:'reset',onClick:()=>setCount(0)},'Reset'),
    h('output',{id:'count'},String(count)),
    h(CSSTransition,{in:open,timeout:0,classNames:'phase',...(explicit?{nodeRef:ref}:{})},
      h('div',{id:'panel',ref:explicit?ref:null},'Transition marker')));
}
async function click(id) {
  await React.act(async()=>document.querySelector(id).click());
  await React.act(async()=>new Promise(r=>setTimeout(r,20)));
}
async function main() {
  try {
    await React.act(async()=>root.render(h(App)));
    await click('#toggle');
    assert.ok(document.querySelector('#panel').classList.contains('phase-enter-done'),'STAGE_B_ENTER');
    await click('#increment');
    assert.equal(document.querySelector('#count').textContent,'1','STAGE_B_UI_COUNT');
    await click('#reset');
    assert.equal(document.querySelector('#count').textContent,'0','STAGE_B_UI_RESET');
    await click('#toggle');
    assert.ok(document.querySelector('#panel').classList.contains('phase-exit-done'),'STAGE_B_EXIT');
    console.log('STAGE_B_REACT_BEHAVIOR_PASS');
  } finally {
    await React.act(async()=>root.unmount());
    dom.window.close();
  }
}
main().catch(e=>{console.error(e);process.exitCode=1;});
