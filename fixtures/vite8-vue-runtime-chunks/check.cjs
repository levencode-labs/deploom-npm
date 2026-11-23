const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Isolate the chunk configuration from un-pany/v3-admin-vite at c2c895d71d571e9c18c2453fa85469a479c79fc6.
const cases = {
  baseline: { vite: '7.3.6', lock: 'a92d85985b23f85fdc89833b4815d1a76fef30ccc1e41f6022a7045fbf6376a2' },
  target: { vite: '8.3.8', lock: '1f97a83d85bc8e734fa4b9fdf5f8f9c0b9c30d615a517ba6db36f1d8e9b3b1b7' },
};
const options = {
  original: ['rollupOptions', 'manualChunks: { vue: ["vue", "vue-router", "pinia"], element: ["element-plus"] }'],
  names: ['rolldownOptions', String.raw`codeSplitting: { groups: [
    {name: "vue", test: /\/node_modules\/(?:vue|vue-router|pinia)\// },
    {name: "element", test: /\/node_modules\/element-plus\// }
  ] }`],
  runtime: ['rolldownOptions', String.raw`codeSplitting: { groups: [
    {name: "vue", priority: 10, test: /\/node_modules\/(?:vue|vue-router|pinia|@vue\/(?:runtime-core|runtime-dom|reactivity|shared))\// },
    {name: "element", test: /\/node_modules\/element-plus\// }
  ] }`],
};
const vuePackages = ['vue-router', 'pinia', '@vue/runtime-core', '@vue/runtime-dom', '@vue/reactivity', '@vue/shared'];

function run(executable, args, cwd) {
  const child = spawnSync(executable, args, { cwd, encoding: 'utf8', timeout: 180000, windowsHide: true });
  if (child.error) throw child.error;
  return child;
}

function lockDigest(file) {
  return createHash('sha256').update(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')).digest('hex');
}

async function testConfig(directory, version, phase) {
  const load = createRequire(path.join(directory, 'package.json'));
  assert.equal(load('vite/package.json').version, version);
  assert.equal(load('@vitejs/plugin-vue/package.json').version, '6.0.7');
  assert.equal(load('vue/package.json').version, '3.5.39');
  const [field, output] = options[phase];
  const config = path.join(directory, 'vite.config.ts');
  fs.writeFileSync(config, 'import vue from "@vitejs/plugin-vue";\nimport { defineConfig } from "vite";\n'
    + 'export default defineConfig({ plugins:[vue()], build:{'+field+':{output:{'+output+'}}}});\n');
  const tsc = run(process.execPath, [load.resolve('typescript/bin/tsc'),
    config, '--noEmit', '--module', 'nodenext', '--skipLibCheck'], directory);
  const diagnostics = tsc.stdout + tsc.stderr;
  if (version === '8.3.8' && phase === 'original') {
    assert.equal(tsc.status, 2, diagnostics);
    assert.match(diagnostics, /TS2769/);
    assert.match(diagnostics, /ManualChunksFunction/);
    console.log(version, phase, 'rejected the object form at typecheck');
    return;
  }
  assert.equal(tsc.status, 0, diagnostics);

  const { build } = await import(pathToFileURL(load.resolve('vite')).href);
  const result = await build({root:directory, build:{write:false}});
  const modules = Object.fromEntries(result.output.filter(output => output.type === 'chunk')
    .map(chunk => [chunk.name, Object.keys(chunk.modules).map(id => id.replaceAll('\\', '/'))]));
  const inChunk = (chunk, pkg) => modules[chunk].some(id => id.includes('/node_modules/' + pkg + '/'));
  assert.ok(inChunk('element', 'element-plus'));
  if (phase === 'names') {
    assert.ok(inChunk('index', '@vue/runtime-dom'));
    assert.ok(!inChunk('vue', '@vue/runtime-dom'));
  } else {
    for (const pkg of vuePackages) assert.ok(inChunk('vue', pkg), pkg);
    assert.ok(!inChunk('index', '@vue/runtime-dom'));
    assert.ok(!inChunk('element', '@vue/runtime-dom'));
  }
  console.log(version, phase, 'bundle and Vue runtime membership verified');
}

function verify() {
  const root = fs.realpathSync.native(__dirname);
  const tmp = fs.mkdtempSync(path.join(root, '.fixture-'));
  const windows = process.platform === 'win32';
  const npm = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const args = ['ci', '--strict-peer-deps', '--ignore-scripts', '--no-audit', '--no-fund',
    '--registry=https://registry.npmjs.org/'];
  try {
    for (const [variant, meta] of Object.entries(cases)) {
      const directory = path.join(tmp, variant);
      fs.mkdirSync(directory);
      for (const file of ['package.json', 'package-lock.json']) {
        fs.copyFileSync(path.join(__dirname, variant, file), path.join(directory, file));
      }
      const lock = path.join(directory, 'package-lock.json');
      assert.equal(lockDigest(lock), meta.lock);
      const install = run(npm, windows ? ['/d', '/c', 'npm.cmd', ...args] : args, directory);
      assert.equal(install.status, 0, install.stdout + install.stderr);
      assert.equal(lockDigest(lock), meta.lock);

      fs.writeFileSync(path.join(directory, 'index.html'), '<main id="app"></main><script type="module" src="/main.js"></script>\n');
      fs.writeFileSync(path.join(directory, 'main.js'),
        'import {createApp} from "vue";\nimport {createPinia} from "pinia";\n'
        + 'import {createRouter,createWebHashHistory} from "vue-router";\nimport App from "./App.vue";\n'
        + 'createApp(App).use(createPinia()).use(createRouter({history:createWebHashHistory(),routes:[{path:"/",component:App}]})).mount("#app");\n');
      fs.writeFileSync(path.join(directory, 'App.vue'),
        '<script setup>\nimport {ElButton} from "element-plus";\n</script>\n<template><ElButton>Chunk test</ElButton></template>\n');
      for (const phase of variant === 'baseline' ? ['original'] : ['original', 'names', 'runtime']) {
        const check = run(process.execPath, [__filename, directory, meta.vite, phase], directory);
        process.stdout.write(check.stdout);
        process.stderr.write(check.stderr);
        assert.equal(check.status, 0, 'Vite fixture failed: ' + variant + '/' + phase);
      }
    }
  } finally {
    assert.equal(path.dirname(fs.realpathSync.native(tmp)), root);
    fs.rmSync(tmp, { recursive:true, force:true, maxRetries:5, retryDelay:200 });
  }
}

const [directory, version, phase] = process.argv.slice(2);
if (directory) {
  testConfig(directory, version, phase).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  verify();
}
