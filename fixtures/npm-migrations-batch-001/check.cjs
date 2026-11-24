'use strict';

const assert = require('node:assert/strict');
const { readFileSync, existsSync, mkdtempSync, rmSync } = require('node:fs');
const { createRequire } = require('node:module');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const semver = require('./p00/node_modules/semver');
const { arm, child, engine, command, legacyConsole, windowValue, quietOutput } = require('./helpers.cjs');
const rows = [
  ["p01","commander","12.0.0","13.0.0"],
  ["p01","commander","12.0.0","14.0.0"],
  ["p01","commander","12.0.0","15.0.0"],
  ["p01","commander","13.0.0","14.0.0"],
  ["p01","commander","13.0.0","15.0.0"],
  ["p01","commander","14.0.0","15.0.0"],
  ["p02","@types/node","22.0.0","24.0.0"],
  ["p02","@types/node","22.0.0","25.0.0"],
  ["p02","@types/node","22.0.0","26.0.0"],
  ["p02","@types/node","24.0.0","25.0.0"],
  ["p02","@types/node","24.0.0","26.0.0"],
  ["p02","@types/node","25.0.0","26.0.0"],
  ["p03","glob","11.0.0","12.0.0"],
  ["p03","glob","11.0.0","13.0.0"],
  ["p03","glob","11.0.0","14.0.0"],
  ["p03","glob","12.0.0","13.0.0"],
  ["p03","glob","12.0.0","14.0.0"],
  ["p03","glob","13.0.0","14.0.0"],
  ["p04","uuid","10.0.0","11.0.0"],
  ["p04","uuid","10.0.0","12.0.0"],
  ["p04","uuid","10.0.0","13.0.0"],
  ["p04","uuid","10.0.0","14.0.0"],
  ["p04","uuid","11.0.0","12.0.0"],
  ["p04","uuid","11.0.0","13.0.0"],
  ["p04","uuid","11.0.0","14.0.0"],
  ["p04","uuid","12.0.0","13.0.0"],
  ["p04","uuid","12.0.0","14.0.0"],
  ["p04","uuid","13.0.0","14.0.0"],
  ["p05","esbuild","0.19.12","0.20.0"],
  ["p05","esbuild","0.21.5","0.22.0"],
  ["p05","esbuild","0.22.0","0.23.0"],
  ["p05","esbuild","0.23.1","0.24.0"],
  ["p05","esbuild","0.24.2","0.25.0"],
  ["p05","esbuild","0.26.0","0.27.0"],
  ["p06","globals","14.0.0","15.0.0"],
  ["p06","globals","14.0.0","16.0.0"],
  ["p06","globals","14.0.0","17.0.0"],
  ["p06","globals","15.0.0","16.0.0"],
  ["p06","globals","15.0.0","17.0.0"],
  ["p06","globals","16.0.0","17.0.0"],
  ["p07","path-to-regexp","7.0.0","8.0.0"],
  ["p07","path-to-regexp","7.0.0","9.0.0"],
  ["p07","path-to-regexp","8.0.0","9.0.0"],
  ["p08","dotenv","17.0.0","18.0.0"],
  ["p09","vite","6.0.0","7.0.0"],
  ["p09","vite","6.0.0","8.0.0"],
  ["p09","vite","7.0.0","8.0.0"],
  ["p10","eslint","9.0.0","10.0.0"],
  ["p11","@typescript-eslint/eslint-plugin","7.0.0","8.0.0"],
  ["p12","content-disposition","1.0.0","2.0.0"],
  ["p12","content-disposition","1.0.0","3.0.0"],
  ["p12","content-disposition","2.0.0","3.0.0"],
  ["p13","@typescript-eslint/parser","7.0.0","8.0.0"],
  ["p14","@eslint/js","9.0.0","10.0.0"],
  ["p15","axios","1.7.9","1.8.0"],
  ["p15","axios","1.11.0","1.12.0"],
  ["p15","axios","1.15.2","1.16.0"],
  ["p16","chai","5.0.0","6.0.0"],
  ["p17","date-fns","3.0.0","4.0.0"],
  ["p18","jsdom","23.0.0","24.0.0"],
  ["p18","jsdom","23.0.0","25.0.0"],
  ["p18","jsdom","23.0.0","26.0.0"],
  ["p18","jsdom","23.0.0","27.0.0"],
  ["p18","jsdom","23.0.0","28.0.0"],
  ["p18","jsdom","23.0.0","29.0.0"],
  ["p18","jsdom","23.0.0","30.0.0"],
  ["p18","jsdom","23.0.0","31.0.0"],
  ["p18","jsdom","24.0.0","25.0.0"],
  ["p18","jsdom","24.0.0","26.0.0"],
  ["p18","jsdom","24.0.0","27.0.0"],
  ["p18","jsdom","24.0.0","28.0.0"],
  ["p18","jsdom","24.0.0","29.0.0"],
  ["p18","jsdom","24.0.0","30.0.0"],
  ["p18","jsdom","24.0.0","31.0.0"],
  ["p18","jsdom","25.0.0","26.0.0"],
  ["p18","jsdom","25.0.0","27.0.0"],
  ["p18","jsdom","25.0.0","28.0.0"],
  ["p18","jsdom","25.0.0","29.0.0"],
  ["p18","jsdom","25.0.0","30.0.0"],
  ["p18","jsdom","25.0.0","31.0.0"],
  ["p18","jsdom","26.0.0","27.0.0"],
  ["p18","jsdom","26.0.0","28.0.0"],
  ["p18","jsdom","26.0.0","29.0.0"],
  ["p18","jsdom","26.0.0","30.0.0"],
  ["p18","jsdom","26.0.0","31.0.0"],
  ["p18","jsdom","27.0.0","28.0.0"],
  ["p18","jsdom","27.0.0","29.0.0"],
  ["p18","jsdom","27.0.0","30.0.0"],
  ["p18","jsdom","27.0.0","31.0.0"],
  ["p18","jsdom","28.0.0","29.0.0"],
  ["p18","jsdom","28.0.0","30.0.0"],
  ["p18","jsdom","28.0.0","31.0.0"],
  ["p18","jsdom","29.0.0","30.0.0"],
  ["p18","jsdom","29.0.0","31.0.0"],
  ["p18","jsdom","30.0.0","31.0.0"],
  ["p19","vitest","1.0.0","2.0.0"],
  ["p19","vitest","1.0.0","3.0.0"],
  ["p19","vitest","1.0.0","4.0.0"],
  ["p19","vitest","1.0.0","5.0.0"],
  ["p19","vitest","2.0.0","3.0.0"]
];

const engineGroups = new Set(['commander', 'esbuild', 'vite', 'eslint', '@typescript-eslint/parser',
  'content-disposition', 'chai', 'jsdom', 'vitest']);

async function check([group, name, from, to], tmp) {
  const start = arm(group, name, from);
  const end = arm(group, name, to);
  const major = Number(from.split('.')[0]);
  const target = Number(to.split('.')[0]);
  if (name === 'jsdom') {
    if (target === 31) {
      const canvas = start.manifest.peerDependencies.canvas;
      const native = end.manifest.peerDependencies['@napi-rs/canvas'];
      assert.equal(end.manifest.peerDependencies.canvas, undefined);
      assert(semver.satisfies('3.2.3', canvas) || semver.satisfies('2.11.2', canvas));
      assert(semver.satisfies('1.0.13', native));
      assert.equal(windowValue(end, {}, w => w.document.querySelector('p').textContent), 'Sample');
      return ['jsdom31-canvas-backend', { canvas, native }];
    }
    if (major < 27 && target >= 27) {
      assert.deepEqual(legacyConsole(start), [['test']]);
      assert.throws(() => legacyConsole(end), /sendTo is not a function/);
      assert.deepEqual(legacyConsole(end, true), [['test']]);
      return ['jsdom27-virtual-console', {}];
    }
    if (major <= 27 && target >= 28) {
      const userAgent = 'DepLoom migration fixture';
      const oldOptions = { resources: new (start.js().ResourceLoader)({ userAgent }) };
      assert.equal(windowValue(start, oldOptions, w => w.navigator.userAgent), userAgent);
      assert.throws(() => new (end.js().ResourceLoader)({ userAgent }), /not a constructor/);
      assert.equal(windowValue(end, { resources: { userAgent } }, w => w.navigator.userAgent), userAgent);
      return ['jsdom28-resource-options', {}];
    }
    if (major < 25 && target === 25) {
      const realm = pkg => windowValue(pkg, { runScripts: 'outside-only' }, w => {
        const event = new w.EventTarget();
        return { host: event instanceof Object, local: event instanceof w.Object };
      });
      assert.deepEqual(realm(start), { host: true, local: false });
      assert.deepEqual(realm(end), { host: false, local: true });
      return ['jsdom25-window-realm', {}];
    }
    if (major === 24 || major === 25) {
      const oldPeer = start.manifest.peerDependencies.canvas;
      const newPeer = end.manifest.peerDependencies.canvas;
      assert(semver.satisfies('2.11.2', oldPeer));
      assert(!semver.satisfies('2.11.2', newPeer));
      assert(semver.satisfies('3.0.0', newPeer));
      return ['jsdom26-canvas-peer', { oldPeer, newPeer }];
    }
    if (major === 23 && target === 26) {
      const result = pkg => windowValue(pkg, { runScripts: 'outside-only' }, w =>
        new w.EventTarget() instanceof Object);
      assert.equal(result(start), true);
      assert.equal(result(end), false);
      return ['jsdom25-window-realm', {}];
    }
  }
  if (name === '@types/node') {
    const oldFloor = start.manifest.typeScriptVersion;
    const newFloor = end.manifest.typeScriptVersion;
    assert.notEqual(semver.compare(semver.coerce(oldFloor), semver.coerce(newFloor)), 0);
    assert(semver.lt(semver.coerce(oldFloor), semver.coerce(newFloor)));
    assert(existsSync(join(end.root, 'index.d.ts')));
    return ['types-node-typescript-floor', { oldFloor, newFloor }];
  }
  if (name === 'commander' && major === 12) {
    assert.deepEqual(command(start), ['input', 'extra']);
    assert.throws(() => command(end), { code: 'commander.excessArguments' });
    assert.deepEqual(command(end, true), ['input', 'extra']);
    return ['commander13-excess-arguments', {}];
  }
  if (name === 'glob' && major <= 12 && target >= 13) {
    assert(existsSync(join(start.root, start.manifest.bin)));
    assert.equal(end.manifest.bin, undefined);
    assert.deepEqual(end.js().globSync('check.cjs', { cwd: __dirname }), ['check.cjs']);
    return ['glob13-cli-split', {}];
  }
  if (name === 'uuid' && major === 10 && target === 11) {
    const generate = (pkg, seq) => pkg.js().v7({ msecs: 1000, random: new Uint8Array(16), seq });
    assert.notEqual(generate(start), generate(start));
    assert.equal(generate(end), generate(end));
    assert.notEqual(generate(end, 1), generate(end, 2));
    return ['uuid11-v7-options', {}];
  }
  if ((name === 'uuid' && major <= 11 && target >= 12) ||
      (name === 'path-to-regexp' && major === 8 && target === 9)) {
    const legacy = 'require(process.argv[1])';
    const flags = ['--no-experimental-require-module'];
    assert.equal(child(legacy, start, flags).status, 0);
    assert.match(child(legacy, end, flags).stderr, /ERR_REQUIRE_ESM/);
    const sample = name === 'uuid'
      ? 'if(!m.validate(m.v4()))process.exit(1)'
      : 'if(!m.match("/files/*rest")("/files/a/b"))process.exit(1)';
    assert.equal(child('import(process.argv[1]).then(m=>{' + sample + '})', end).status, 0);
    return ['esm-package-entry', {}];
  }
  if (name === 'uuid' && major >= 12 && target === 14) {
    const request = 'import(process.argv[1]).then(m=>{if(!m.validate(m.v4()))process.exit(1)})';
    const held = 'delete globalThis.crypto;';
    assert.equal(child(held + request, start).status, 0);
    assert.match(child(held + request, end).stderr, /crypto is not defined/);
    assert.equal(child(request, end).status, 0);
    return ['uuid14-web-crypto', {}];
  }
  if (name === 'uuid' && major === 12 && target === 13) {
    const oldRoot = start.manifest.exports['.'];
    const newRoot = end.manifest.exports['.'];
    assert.match(oldRoot.browser, /dist-browser/);
    assert.equal(oldRoot.node, undefined);
    assert.match(newRoot.node, /dist-node/);
    assert.equal(newRoot.browser, undefined);
    assert.equal(child('import(process.argv[1]).then(m=>{if(!m.validate(m.v4()))process.exit(1)})', end).status, 0);
    return ['uuid13-node-export-condition', {}];
  }
  if (name === 'path-to-regexp' && major === 7) {
    const pattern = '/files/*';
    assert.deepEqual(Array.from(start.js().match(pattern)('/files/a/b').params[0]), ['a', 'b']);
    assert.throws(() => end.js().match(pattern), /Missing parameter name/);
    const result = end.js().match('/files/*rest')('/files/a/b');
    assert.deepEqual(Array.from(result.params.rest), ['a', 'b']);
    return ['path8-named-wildcard', {}];
  }
  if (name === 'globals') {
    const cases = [
      ['es2021', 'hasOwnProperty', 'globals15-prototype-keys'],
      ['serviceworker', 'FileReaderSync', 'globals16-worker-list'],
      ['browser', 'registerProcessor', 'globals17-audio-worklet'],
    ];
    for (const [profile, key, id] of cases) {
      const old = start.js()[profile];
      const next = end.js()[profile];
      if (Object.hasOwn(old, key) && !Object.hasOwn(next, key)) {
        if (id === 'globals17-audio-worklet') assert(Object.hasOwn(end.js().audioWorklet, key));
        assert(Object.hasOwn({ ...next, [key]: false }, key));
        return [id, { profile, key }];
      }
    }
  }
  if (name === '@typescript-eslint/eslint-plugin') {
    const old = start.manifest.peerDependencies['@typescript-eslint/parser'];
    const next = end.manifest.peerDependencies['@typescript-eslint/parser'];
    assert(semver.satisfies('6.21.0', old));
    assert(!semver.satisfies('6.21.0', next));
    assert(semver.satisfies('8.0.0', next));
    assert(end.resolve('@typescript-eslint/eslint-plugin').rules);
    return ['typescript-eslint8-parser-peer', { old, next }];
  }
  if (name === 'dotenv') {
    const old = quietOutput(start, tmp);
    const next = quietOutput(end, tmp);
    assert.match(old.stdout, /inject(?:ing|ed) env/i);
    assert.match(next.stderr, /injected env/i);
    assert.equal(next.stdout, 'loaded');
    return ['dotenv18-banner-stream', {}];
  }
  if (name === 'vite' && major === 7 && target === 8) {
    const old = start.manifest.dependencies.esbuild;
    const next = end.manifest.peerDependencies.esbuild;
    assert.equal(end.manifest.dependencies.esbuild, undefined);
    assert(end.manifest.peerDependenciesMeta.esbuild.optional);
    assert(semver.validRange(old) && semver.validRange(next));
    return ['vite8-esbuild-optional', { old, next }];
  }
  if (name === 'esbuild' && to === '0.27.0') {
    const { runInNewContext } = require('node:vm');
    function bytes(pkg, target) {
      const code = pkg.js().transformSync('data', { loader: 'binary', format: 'cjs', target }).code;
      const module = { exports: {} };
      class OldUint8Array extends Uint8Array { static fromBase64 = undefined; }
      runInNewContext(code, { Uint8Array: OldUint8Array, module });
      return Array.from(module.exports);
    }
    assert.deepEqual(bytes(start), [100, 97, 116, 97]);
    assert.throws(() => bytes(end), /fromBase64 is not a function/);
    assert.deepEqual(bytes(end, 'node20'), [100, 97, 116, 97]);
    return ['esbuild27-binary-target', {}];
  }
  if (name === 'esbuild' && to === '0.25.0') {
    const serveResult = pkg => {
      const declarations = readFileSync(join(pkg.root, 'lib/main.d.ts'), 'utf8');
      return /interface ServeResult\s*\{([^}]+)\}/.exec(declarations)[1];
    };
    assert.match(serveResult(start), /\bhost: string/);
    assert.doesNotMatch(serveResult(end), /\bhost: string/);
    assert.match(serveResult(end), /\bhosts: string\[\]/);
    return ['esbuild25-serve-hosts', {}];
  }
  if (name === 'esbuild' && to === '0.23.0') {
    const bundle = (pkg, packages) => pkg.js().buildSync({
      stdin: { contents: 'module.exports = require("fixture");', resolveDir: tmp },
      platform: 'node', bundle: true, packages, write: false, logLevel: 'silent',
    }).outputFiles[0].text;
    assert.match(bundle(start), /require\("fixture"\)/);
    assert.throws(() => bundle(end), /Could not resolve "fixture"/);
    assert.match(bundle(end, 'external'), /require\("fixture"\)/);
    return ['esbuild23-keep-packages-external', {}];
  }
  if (name === 'vitest' && target === 2) {
    const config = pkg => createRequire(join(pkg.cwd, 'package.json'))(pkg.importName + '/config');
    assert.equal(config(start).configDefaults.pool, 'threads');
    assert.equal(config(end).configDefaults.pool, 'forks');
    assert.equal(config(end).defineConfig({ test: { pool: 'threads' } }).test.pool, 'threads');
    return ['vitest2-pool-default', {}];
  }
  if (engineGroups.has(name)) {
    const result = engine(start, end);
    if (result) assert(!semver.satisfies(result[1].held, result[1].newRange));
    return result;
  }
}

async function main() {
  const tmp = mkdtempSync(join(tmpdir(), 'deploom-batch-'));
  try {
    const results = [];
    for (const row of rows) {
      try {
        const result = await check(row, tmp);
        results.push({ row, result: result ?? null });
      } catch (error) {
        results.push({ row, error: error.message });
      }
    }
    if (process.argv.includes('--probe')) {
      console.log(JSON.stringify(results, null, 2));
    } else {
      assert.deepEqual(results, require('./expected.json'));
      console.log('Replayed ' + results.length + ' exact version pairs.');
    }
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
