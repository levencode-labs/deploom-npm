const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

// Utility behavior from leoMirandaa/shadcn-landing-page at ae3716dbce5c8a26815222bb743994b5717938f1.
const cases = {
  baseline: { tailwind: '3.4.4', postcss: '8.4.38', lock: 'b901f198d1c3395ecc740fdc60d2b1fa6fcfc639c6d0f37d5cbcf75e8c12e889' },
  target: { tailwind: '4.3.3', postcss: '8.5.33', lock: '620beccc76992ec690e1b696868684c1537fe22d383535a0a37b9f8222ca5338' },
};
const original = 'shadow-sm rounded-sm focus-visible:outline-none';
const updated = 'shadow-xs rounded-sm focus-visible:outline-hidden';
const theme = { extend: { borderRadius: { sm: 'calc(var(--radius) - 4px)' } } };

function lockDigest(file) {
  return createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
}

function prepare(directory, variant, meta) {
  fs.mkdirSync(directory);
  for (const file of ['package.json', 'package-lock.json']) {
    fs.copyFileSync(path.join(__dirname, variant, file), path.join(directory, file));
  }
  const lock = path.join(directory, 'package-lock.json');
  assert.equal(lockDigest(lock), meta.lock);
  const flags = ['ci', '--strict-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund',
    '--registry=https://registry.npmjs.org/'];
  const windows = process.platform === 'win32';
  const executable = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = windows ? ['/d', '/c', 'npm.cmd', ...flags] : flags;
  const child = spawnSync(executable, args, {cwd:directory, encoding:'utf8', timeout:180000, windowsHide:true});
  if (child.error) throw child.error;
  assert.equal(child.status, 0, child.stdout + child.stderr);
  assert.equal(lockDigest(lock), meta.lock);
  const load = createRequire(path.join(directory, 'package.json'));
  assert.equal(load('tailwindcss/package.json').version, meta.tailwind);
  assert.equal(load('postcss/package.json').version, meta.postcss);

}

function declarations(result, selector, prop, condition) {
  const values = [];
  result.root.walkDecls(prop, d => {
    const ancestry = [];
    for (let n = d.parent; n && n.type !== 'root'; n = n.parent) ancestry.push(n.selector || n.params);
    if (ancestry.some(s => s?.includes(selector)) && (!condition || ancestry.some(s => s?.includes(condition)))) {
      values.push(d.value.trim());
    }
  });
  return values;
}

async function checkBaseline(directory, load) {
  const html = '<div class="' + original + '"></div>';
  const process = load('postcss')([load('tailwindcss')({content:[{raw:html, extension:'html'}], theme})]);
  const css = await process.process('@tailwind utilities;', {from:path.join(directory,'input.css')});
  assert.match(declarations(css,'.shadow-sm','--tw-shadow').join(), /^0 1px 2px 0 /);
  assert.deepEqual(declarations(css,'.rounded-sm','border-radius'), ['calc(var(--radius) - 4px)']);
  assert.deepEqual(declarations(css,'outline-none','outline'), ['2px solid transparent']);
}

async function checkTarget(directory, load) {
  assert.throws(() => load('tailwindcss')(), /PostCSS plugin has moved/);
  const adapter = JSON.parse(fs.readFileSync(path.join(directory,'node_modules/@tailwindcss/postcss/package.json'),'utf8'));
  assert.equal(adapter.version,'4.3.3');
  fs.writeFileSync(path.join(directory,'tailwind.config.cjs'), 'module.exports = ' + JSON.stringify({theme}));
  const compile = classes => load('postcss')([load('@tailwindcss/postcss')({base:directory,optimize:false})])
    .process('@import "tailwindcss" source(none); @config "./tailwind.config.cjs"; @source inline("' + classes + '");',
      {from:path.join(directory,'input.css')});
  const held = await compile(original);
  const fixed = await compile(updated + ' rounded-xs');
  const heldShadow = declarations(held,'.shadow-sm','--tw-shadow').join();
  const fixedShadow = declarations(fixed,'.shadow-xs','--tw-shadow').join();
  assert.match(heldShadow,/^0 1px 3px 0 /);
  assert.match(heldShadow,/,\s*0 1px 2px -1px /);
  assert.match(fixedShadow,/^0 1px 2px 0 /);
  assert.doesNotMatch(fixedShadow,/,\s*0 1px/);
  assert.deepEqual(declarations(held,'outline-none','outline-style'), ['none']);
  assert.deepEqual(declarations(held,'outline-none','outline','forced-colors'), []);
  assert.deepEqual(declarations(fixed,'outline-hidden','outline','forced-colors'), ['2px solid transparent']);
  assert.deepEqual(declarations(fixed,'outline-hidden','outline-offset','forced-colors'), ['2px']);
  assert.deepEqual(declarations(fixed,'.rounded-sm','border-radius'), ['calc(var(--radius) - 4px)']);
  assert.deepEqual(declarations(fixed,'.rounded-xs','border-radius'), ['var(--radius-xs)']);
  assert.deepEqual(declarations(fixed,':root','--radius-xs'), ['0.125rem']);
}

async function verify() {
  const root = fs.realpathSync.native(__dirname);
  const temporary = fs.mkdtempSync(path.join(root,'.fixture-'));
  try {
    for (const [variant, meta] of Object.entries(cases)) {
      const directory = path.join(temporary,variant);
      prepare(directory,variant,meta);
      const compile = spawnSync(process.execPath,[__filename,directory,variant],
        {cwd:directory,encoding:'utf8',timeout:60000,windowsHide:true});
      if (compile.error) throw compile.error;
      assert.equal(compile.status,0,compile.stdout+compile.stderr);
      console.log(variant, meta.tailwind, 'CSS controls passed');
    }
  } finally {
    assert.equal(path.dirname(fs.realpathSync.native(temporary)),root);
    fs.rmSync(temporary,{recursive:true,force:true,maxRetries:5,retryDelay:200});
  }
}

const [directory, variant] = process.argv.slice(2);
const task = directory
  ? (variant === 'baseline' ? checkBaseline : checkTarget)(directory,createRequire(path.join(directory,'package.json')))
  : verify();
task.catch(error => {console.error(error);process.exitCode = 1;});
