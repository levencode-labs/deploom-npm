'use strict';

const assert = require('node:assert/strict');
const { join } = require('node:path');
const { existsSync } = require('node:fs');
const { arm } = require('./arm.cjs');

async function check(row) {
  const [group, name, from, to, a, b] = row;
  const split = ['react', 'react-types', 'vite', 'tailwindcss'].includes(group);
  const before = arm(join(__dirname, split ? group+'0' : group), name, from, a);
  const after = arm(join(__dirname, split ? group+'1' : group), name, to, b);
  const load = () => [before.load(), after.load()];

  if (name === 'js-yaml' && from === '3.0.0') {
    const [old, current] = load();
    assert.deepEqual(old.safeLoad('answer: 42'), {answer: 42});
    assert.throws(() => current.safeLoad('answer: 42'), /removed/);
    assert.deepEqual(current.load('answer: 42'), {answer: 42});
    return;
  }
  if (name === 'js-yaml') {
    const code = "import(process.argv[1]).then(m=>{if (!m.default || typeof m.default.load !== 'function') process.exitCode=1})";
    assert.equal(before.sandbox(code).status, 0);
    assert.equal(after.sandbox(code).status, 1);
    assert.equal(after.sandbox("import(process.argv[1]).then(m=>{if(m.load('value: 5').value!==5)process.exitCode=1})").status, 0);
    return;
  }
  if (name === 'uuid' && from === '3.0.0') {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
    assert.match(before.load()(), uuid);
    assert.throws(() => after.load()(), TypeError);
    assert.match(after.load().v4(), uuid);
    return;
  }
  if (name === 'uuid') {
    assert.ok(existsSync(join(before.root,'dist','umd','uuid.min.js')));
    assert.equal(existsSync(join(after.root,'dist','umd','uuid.min.js')), false);
    assert.equal(typeof after.load().v4, 'function');
    return;
  }
  if (name === 'lru-cache') {
    const [Old, current] = load();
    assert.equal(new Old({max: 2}).set('a', 1), true);
    assert.throws(() => new current({max: 2}), TypeError);
    const cache = new current.LRUCache({max: 2});
    cache.set('a',1);
    assert.equal(cache.get('a'),1);
    return;
  }
  if (name === 'zod') {
    const result=(z) => z.object({id:z.string()}).safeParse({id:123}).error;
    const [old,current]=load();
    assert.equal(result(old).errors[0].path[0], 'id');
    assert.equal(result(current).errors, undefined);
    assert.equal(result(current).issues[0].path[0], 'id');
    return;
  }
  if (name === 'semver') {
    assert.equal(before.resolve('/semver'), join(before.root,'semver.js'));
    assert.throws(() => after.resolve('/semver'), {code:'MODULE_NOT_FOUND'});
    assert.equal(after.load().valid('1.2.3'), '1.2.3');
    return;
  }
  if (name === 'signal-exit') {
    const [old,current] = load();
    assert.equal(typeof old,'function');
    assert.throws(() => current(()=>{}), TypeError);
    assert.equal(typeof current.onExit(()=>{}),'function');
    return;
  }
  if (name === 'commander' && from === '2.0.0') {
    function args(lib) {
      const program = new lib.Command();
      program.command('hello <who>').action(()=>{});
      program.parse(['node','app','hello','world']);
      return program.args;
    }
    const [old,current]=load();
    assert.ok(args(old).some(x=>typeof x==='object'));
    assert.equal(args(current).some(x=>typeof x==='object'), false);
    return;
  }
  if (name === 'ajv') {
    const [Old,current]=load();
    assert.equal(new Old().validate({format:'email'},'example@example.com'),true);
    assert.throws(() => new current.default().compile({format:'email'}), /unknown format/);
    const explicit = new current.default();
    explicit.addFormat('email', /^[^@]+@[^@]+$/);
    assert.equal(explicit.validate({format:'email'},'example@example.com'),true);
    assert.equal(explicit.validate({format:'email'},'missing-at'),false);
    return;
  }
  if (name === 'date-fns' && from === '1.0.0') {
    const [old,current]=load();
    const day = new Date(2022, 2, 14, 12);
    assert.equal(old.format(day,'YYYY-MM-DD'),'2022-03-14');
    assert.throws(() => current.format(day,'YYYY-MM-DD'), RangeError);
    assert.equal(current.format(day,'yyyy-MM-dd'),'2022-03-14');
    return;
  }
  if (name === 'date-fns') {
    const day = new Date(2022,2,14,12);
    assert.equal(typeof before.load('/addDays'),'function');
    assert.throws(() => after.load('/addDays')(day,1), TypeError);
    assert.equal(after.load('/addDays').addDays(day,1).getDate(),15);
    return;
  }
  if (name === 'terser') {
    const [old,current]=load();
    assert.match(old.minify('let count = 1 + 2;').code,/=3/);
    assert.equal(current.minify('let count = 1 + 2;').code,undefined);
    assert.match((await current.minify('let count = 1 + 2;')).code,/=3/);
    return;
  }
  if (name === 'reselect') {
    const [old,current] = load();
    const select=(lib) => lib.createSelector([(_,x) => x], x=>({ x }));
    const oldSelect=select(old), newSelect=select(current);
    const state={};
    const a=oldSelect(state,1);
    oldSelect(state,2);
    assert.notEqual(oldSelect(state,1),a);
    const b=newSelect(state,1);
    newSelect(state,2);
    assert.equal(newSelect(state,1),b);
    const limited=current.createSelector([(_,x)=>x], x=>({x}),
      {memoize:current.lruMemoize,argsMemoize:current.lruMemoize});
    const c=limited(state,1);
    limited(state,2);
    assert.notEqual(limited(state,1),c);
    return;
  }
  if (name === 'body-parser') {
    const [old,current]=load();
    assert.equal(typeof old(),'function');
    assert.throws(()=>current(), /individual middleware|split/i);
    assert.equal(typeof current.json(),'function');
    return;
  }
  if (name === 'fast-xml-parser') {
    const [old,current]=load();
    const xml='<root><count>3</count></root>';
    assert.equal(old.parse(xml).root.count,3);
    assert.throws(()=>current.parse(xml),TypeError);
    assert.equal(new current.XMLParser().parse(xml).root.count,3);
    return;
  }
  if (name === 'mime') {
    const [old,current]=load();
    assert.equal(old.lookup('logo.png'),'image/png');
    assert.throws(()=>current.lookup('logo.png'),TypeError);
    assert.equal(current.getType('logo.png'),'image/png');
    return;
  }
  if (name === 'redux') {
    const [old,current]=load();
    function dispatch(lib,x) {
      const store=lib.createStore((state=0,action)=> action.type === x ? state+1 : state);
      store.dispatch({type:x});
      return store.getState();
    }
    const x=Symbol('increment');
    assert.equal(dispatch(old,x),1);
    assert.throws(()=>dispatch(current,x), /type.*string/i);
    assert.equal(dispatch(current,'increment'),1);
    return;
  }
  if (name === 'immer') {
    const [old,current]=load();
    const change = draft => { draft.done = true; };
    assert.equal(old.default({done:false},change).done,true);
    assert.throws(()=>current.default({done:false},change),TypeError);
    assert.equal(current.produce({done:false},change).done,true);
    return;
  }
  if (name === 'async' && from === '2.0.0') {
    const [old,current]=load();
    function run(library, legacy) {
      const queue=library.queue((task, next)=>next(null,task*2));
      const called=[];
      const task=new Promise((resolve,reject)=> {
        const mark=()=>called.push('drain');
        if (legacy) queue.drain=mark;
        else queue.drain(mark);
        queue.push(2,(error,result)=>error?reject(error):resolve(result));
      });
      return task.then(result=>new Promise(resolve=>setImmediate(()=>resolve([result,called]))));
    }
    assert.deepEqual(await run(old,true),[4,['drain']]);
    await assert.rejects(run(current,true), TypeError);
    assert.deepEqual(await run(current,false),[4,['drain']]);
    return;
  }
  if (name === '@testing-library/jest-dom') {
    assert.ok(before.resolve('/extend-expect'));
    assert.throws(() => after.resolve('/extend-expect'), (error) => ['ERR_PACKAGE_PATH_NOT_EXPORTED','MODULE_NOT_FOUND'].includes(error.code));
    assert.ok(after.resolve());
    assert.equal(typeof after.load('/matchers').toBeInTheDocument,'function');
    return;
  }
  if (name === 'pako') {
    const [old,current]=load();
    const input='migration sample';
    assert.equal(typeof old.deflate(input,{to:'string'}),'string');
    assert.ok(current.deflate(input,{to:'string'}) instanceof Uint8Array);
    const bytes=current.deflate(input);
    assert.equal(current.inflate(bytes,{to:'string'}),input);
    return;
  }
  if (name === 'protobufjs') {
    assert.ok(before.manifest.bin.pbjs);
    assert.equal(after.manifest.bin?.pbjs,undefined);
    assert.equal(typeof after.load().loadSync,'function');
    return;
  }
  if (name === 'web-vitals' && from === '2.0.0') {
    const old=before.sandbox("console.log(typeof require(process.argv[1]).getLCP)");
    assert.equal(old.stdout.trim(),'function');
    const current=after.sandbox("import(process.argv[1]).then(m=>console.log(typeof m.getLCP,typeof m.onLCP))");
    assert.equal(current.stdout.trim(),'undefined function');
    return;
  }
  if (name === 'web-vitals') {
    const type = "import(process.argv[1]+'/onFID.js').then(x=>{if(typeof x.onFID!=='function')process.exitCode=1})";
    assert.equal(before.sandbox(type).status,0);
    assert.equal(after.sandbox(type).status,1);
    assert.equal(after.sandbox("import(process.argv[1]).then(m=>{if(typeof m.onINP!=='function')process.exitCode=1})").status,0);
    return;
  }
  if (name === 'vite') {
    const expression=`const v=await import(process.argv[1]);
      const legacy={configFile:false,resolve:{conditions:['company']}};
      const held=await v.resolveConfig(legacy,'build');
      const fixed=v.defaultClientConditions && await v.resolveConfig({
        ...legacy, resolve:{conditions:['company',...v.defaultClientConditions]},
      },'build');
      console.log(JSON.stringify({held:held.resolve.conditions,fixed:fixed?.resolve.conditions}));`;
    const read = item => {
      const run=item.sandbox(expression,['--input-type=module']);
      assert.equal(run.status,0,run.stderr);
      return JSON.parse(run.stdout.trim());
    };
    assert.deepEqual(read(before).held,['company']);
    const result=read(after);
    assert.ok(!result.held.includes('browser'));
    assert.ok(result.fixed.includes('browser'));
    assert.ok(result.fixed.includes('company'));
    return;
  }
  if (name === '@types/react') {
    const compile=(item, argument)=>{
      const ts=item.peer('typescript');
      const filename=join(item.cwd,'ref-probe.ts').replaceAll('\\','/');
      const opts={noEmit:true,strict:true,skipLibCheck:true,types:['react'],typeRoots:[join(item.cwd,'node_modules','@types')]};
      const text="import { useRef } from 'react'; const ref = useRef<number>("+argument+");";
      const host=ts.createCompilerHost(opts);
      host.getCurrentDirectory=()=>item.cwd;
      const original=host.getSourceFile.bind(host);
      host.getSourceFile=(file,language)=>file.replaceAll('\\','/')===filename
        ? ts.createSourceFile(file,text,language,true) : original(file,language);
      const program=ts.createProgram([filename], opts, host);
      return ts.getPreEmitDiagnostics(program).map(d=>d.code);
    };
    assert.deepEqual(compile(before,''),[]);
    assert.deepEqual(compile(after,''),[2554]);
    assert.deepEqual(compile(after,'undefined'),[]);
    return;
  }
  if (name === 'react') {
    const html=(a, fixed)=>
    {
      const {jsx}=a.peer('react/jsx-runtime');
      const {renderToStaticMarkup}=a.peer('react-dom/server');
      function Button(props) { return jsx('button',{children:props.label}); }
      Button.defaultProps={label:'Submit'};
      function Fixed({label='Submit'}) { return jsx('button',{children:label}); }
      return renderToStaticMarkup(jsx(fixed ? Fixed : Button,{}));
    };
    assert.equal(html(before,false),'<button>Submit</button>');
    assert.equal(html(after,false),'<button></button>');
    assert.equal(html(after,true),'<button>Submit</button>');
    return;
  }
  if (name === 'tailwindcss') {
    const css='@tailwind utilities;';
    const result=await before.peer('postcss')([before.load()({content:[{raw:'<div class="underline"></div>'}]})]).process(css,{from:undefined});
    assert.match(result.css,/\.underline\b/);
    assert.throws(()=>after.load()(),/PostCSS plugin has moved/);
    const plugin=after.peer('@tailwindcss/postcss')();
    const target=await after.peer('postcss')([plugin]).process('@import "tailwindcss"; @source "./sample.html";',{from:join(__dirname,'tailwindcss1','input.css')});
    assert.match(target.css,/\.underline\b/);
    return;
  }
  throw new Error('No focused contract');
}

async function main() {
  const rows = [
    ["api","semver","6.0.0","7.0.0","pk-semver-6-0-0","pk-semver-7-0-0","api"],
    ["api","lru-cache","5.0.0","10.0.0","pk-lru-cache-5-0-0","pk-lru-cache-10-0-0","api"],
    ["api","commander","2.0.0","4.0.0","pk-commander-2-0-0","pk-commander-4-0-0","api"],
    ["api","ajv","6.0.0","8.0.0","pk-ajv-6-0-0","pk-ajv-8-0-0","api"],
    ["api","js-yaml","3.0.0","4.0.0","pk-js-yaml-3-0-0","pk-js-yaml-4-0-0","api"],
    ["api","js-yaml","4.0.0","5.0.0","pk-js-yaml-4-0-0","pk-js-yaml-5-0-0","api"],
    ["api","uuid","3.0.0","8.0.0","pk-uuid-3-0-0","pk-uuid-8-0-0","api"],
    ["api","uuid","8.0.0","9.0.0","pk-uuid-8-0-0","pk-uuid-9-0-0","api"],
    ["api","signal-exit","3.0.0","4.0.0","pk-signal-exit-3-0-0","pk-signal-exit-4-0-0","api"],
    ["api","zod","3.0.0","4.0.0","pk-zod-3-0-0","pk-zod-4-0-0","api"],
    ["api","mime","1.0.0","2.0.0","pk-mime-1-0-0","pk-mime-2-0-0","api"],
    ["api","body-parser","1.0.0","2.0.0","pk-body-parser-1-0-0","pk-body-parser-2-0-0","api"],
    ["api","pako","1.0.0","2.0.0","pk-pako-1-0-0","pk-pako-2-0-0","api"],
    ["api","async","2.0.0","3.0.0","pk-async-2-0-0","pk-async-3-0-0","api"],
    ["api","date-fns","1.0.0","2.0.0","pk-date-fns-1-0-0","pk-date-fns-2-0-0","api"],
    ["api","date-fns","2.0.0","3.0.0","pk-date-fns-2-0-0","pk-date-fns-3-0-0","api"],
    ["api","fast-xml-parser","3.0.0","4.0.0","pk-fast-xml-parser-3-0-0","pk-fast-xml-parser-4-0-0","api"],
    ["tooling","protobufjs","6.0.0","7.0.0","pk-protobufjs-6-0-0","pk-protobufjs-7-0-0","api"],
    ["api","terser","4.0.0","5.0.0","pk-terser-4-0-0","pk-terser-5-0-0","api"],
    ["tooling","@testing-library/jest-dom","5.0.0","6.0.0","pk-testing-library-jest-dom-5-0-0","pk-testing-library-jest-dom-6-0-0","api"],
    ["api","immer","9.0.0","10.0.0","pk-immer-9-0-0","pk-immer-10-0-0","api"],
    ["api","reselect","4.0.0","5.0.0","pk-reselect-4-0-0","pk-reselect-5-0-0","api"],
    ["api","redux","4.0.0","5.0.0","pk-redux-4-0-0","pk-redux-5-0-0","api"],
    ["api","web-vitals","2.0.0","4.0.0","pk-web-vitals-2-0-0","pk-web-vitals-4-0-0","api"],
    ["api","web-vitals","4.0.0","5.0.0","pk-web-vitals-4-0-0","pk-web-vitals-5-0-0","api"],
    ["vite","vite","5.0.0","6.0.0","vite","vite","config"],
    ["react","react","18.0.0","19.0.0","react","react","config"],
    ["tailwindcss","tailwindcss","3.0.0","4.0.0","tailwindcss","tailwindcss","config"],
    ["react-types","@types/react","18.0.0","19.0.0","@types/react","@types/react","config"],
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
