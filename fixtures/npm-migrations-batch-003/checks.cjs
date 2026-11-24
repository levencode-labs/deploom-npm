'use strict';
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const semver = require('./p00/node_modules/semver');
const facts = require('./facts.json');

const runtime = { 'happy-dom':'p01', 'react-dropzone':'p03', sinon:'p06',
  puppeteer:'p07', '@commitlint/cli':'p11' };
const testNodes = ['14.21.3','16.20.2','18.20.8','20.0.0','20.18.3','20.19.0',
  '22.0.0','22.12.0','22.22.0','24.0.0','24.14.0'];

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
  assert.equal(require(join(cwd, 'package-lock.json')).packages['node_modules/' + alias].integrity, manifest.integrity);
  const resolve = createRequire(join(cwd, 'package.json'));
  return { manifest, cwd, alias, root, load: createRequire(pkg), entry: () => resolve(alias) };
}

function engine(old, next) {
  const a = old.engines?.node;
  const b = next.engines?.node;
  if (!a || !b) return;
  const held = testNodes.find(v => semver.satisfies(v, a) && !semver.satisfies(v, b));
  if (!held) return;
  assert(!semver.satisfies(held, b));
  assert(semver.satisfies('24.18.0', b));
  return ['node-engine', { held, a, b }];
}

function peer(old, next, name, before, after) {
  const a = old.peerDependencies?.[name];
  const b = next.peerDependencies?.[name];
  assert(b);
  if (a) assert(semver.satisfies(before, a));
  assert(!semver.satisfies(before, b));
  assert(semver.satisfies(after, b));
  return [a ? 'peer' : 'peer-added', { name, a: a ?? 'no explicit peer range', b, before, after }];
}

function cjsEntry(a, b, sample) {
  function run(arm, code, flags = []) {
    const result = spawnSync(process.execPath, [...flags, '-e', code, arm.alias],
      { cwd: arm.cwd, encoding: 'utf8', timeout: 20000 });
    if (result.error) throw result.error;
    return result;
  }
  const held = 'require(process.argv[1])';
  const flags = ['--no-experimental-require-module'];
  assert.equal(run(a, held, flags).status, 0);
  const incompatible = run(b, held, flags);
  assert.notEqual(incompatible.status, 0);
  assert.match(incompatible.stderr, /ERR_REQUIRE_ESM/);
  assert.equal(run(b, 'import(process.argv[1]).then(p=>{' + sample + '})').status, 0);
  return ['esm', {}];
}

async function documentProbe(pkg, kind) {
  const { Window } = pkg.entry();
  const window = new Window();
  try {
    const { document } = window;
    document.body.innerHTML = '<p>sample</p>';
    if (kind === 'script') {
      const script = document.createElement('script');
      script.textContent = 'document.body.setAttribute("data-probe","ok");';
      document.body.appendChild(script);
      await window.happyDOM.whenAsyncComplete();
      const reported = document.body.getAttribute('data-probe');
      document.body.setAttribute('data-probe', 'ok');
      assert.equal(document.body.getAttribute('data-probe'), 'ok');
      return reported;
    }
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = 'data:text/css,p%7Bcolor%3Ared%7D';
    document.head.appendChild(link);
    await window.happyDOM.whenAsyncComplete();
    const el = document.querySelector('p');
    const color = window.getComputedStyle(el).color;
    const style = document.createElement('style');
    style.textContent = 'p { color: red; }';
    document.head.appendChild(style);
    assert.equal(window.getComputedStyle(el).color, 'red');
    return color;
  } finally {
    await window.happyDOM.abort();
  }
}

function dropzoneType(pkg, modern) {
  const ts = createRequire(join(pkg.cwd, 'package.json'))('typescript');
  const dir = mkdtempSync(join(pkg.cwd, 'type-fixture-'));
  try {
    const file = join(dir, 'check.mts');
    const declaration = modern ? '' : 'import type { FileWithPath } from "' + pkg.alias + '";\n';
    writeFileSync(file, declaration + 'declare const file: File;\nconst accept: ' +
      (modern ? 'File' : 'FileWithPath') + ' = file;\n');
    const options = { strict: true, noEmit: true, module: ts.ModuleKind.NodeNext,
      types: [], skipLibCheck: true };
    return ts.getPreEmitDiagnostics(ts.createProgram([file], options)).map(x => x.code);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

async function dropped(pkg, maxFiles) {
  const { Window } = arm('happy-dom', '21.0.0').entry();
  const window = new Window();
  const globals = { window, document: window.document, IS_REACT_ACT_ENVIRONMENT: true };
  const saved = Object.fromEntries(Object.keys(globals).map(k => [k, Object.getOwnPropertyDescriptor(globalThis,k)]));
  Object.assign(globalThis, globals);
  try {
    const load = createRequire(join(pkg.cwd, 'package.json'));
    const react = load('react');
    const { createRoot } = load('react-dom/client');
    const { useDropzone } = pkg.entry();
    const container = window.document.createElement('div');
    window.document.body.appendChild(container);
    let onDrop;
    let seen;
    function Fixture() {
      const hooks = useDropzone({
        multiple: true, maxFiles,
        getFilesFromEvent: async () => [new window.File(['a'], 'a.txt'), new window.File(['b'], 'b.txt')],
        onDrop(accepted, rejected) { seen = [accepted.map(f=>f.name), rejected.map(r=>r.file.name)]; },
      });
      onDrop = hooks.getRootProps().onDrop;
      return react.createElement('div');
    }
    const app = createRoot(container);
    try {
      await react.act(async () => app.render(react.createElement(Fixture)));
      await react.act(async () => onDrop({ preventDefault() {}, persist() {},
        isPropagationStopped: () => false, dataTransfer: { types: ['Files'] } }));
      return seen;
    } finally {
      await react.act(async () => app.unmount());
      container.remove();
    }
  } finally {
    for (const [key, descriptor] of Object.entries(saved)) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
    await window.happyDOM.abort();
  }
}

function nxPair(from, to, old, next) {
  const start = +from.split('.')[0];
  const target = +to.split('.')[0];
  const a = old.artifacts;
  const b = next.artifacts;
  if (target === 24) {
    const id = '24-0-0-enable-legacy-affected';
    assert.equal(a.migrations[id], undefined);
    assert(b.migrations[id].implementation);
    assert.match(b.migrations[id].description, /affected\.legacy/);
    return ['nx-affected-tasks', {}];
  }
  if (target === 23 && start >= 21)
    return peer(old, next, '@swc/core', '1.3.85', '1.15.8');
  if (start <= 20 && target >= 21) {
    const id = 'remove-custom-tasks-runner';
    assert.equal(a.migrations[id], undefined);
    assert(b.migrations[id].implementation);
    return ['nx-custom-task-runners', {}];
  }
  if (start === 21 && target === 22) {
    assert(a.createNodesV1);
    assert.equal(b.createNodesV1, false);
    assert(b.createNodesV2);
    return ['nx-create-nodes-v2', {}];
  }
  if (start === 18) return peer(old, next, '@swc-node/register', '1.6.7', '1.8.0');
  if (start === 19 && target === 20) {
    const key = '19-2-0-move-graph-cache-directory';
    assert.equal(a.migrations[key], undefined);
    assert(b.migrations[key].implementation);
    assert.match(b.migrations[key].description, /\.nx\/workspace-data/);
    return ['nx-workspace-data', {}];
  }
}

async function check([name, from, to]) {
  const a = arm(name, from);
  const b = arm(name, to);
  const old = a.manifest;
  const next = b.manifest;
  const major = v=>+v.split('.')[0];
  if (name === 'nx') return nxPair(from, to, old, next);
  if (name === '@vitest/ui') return peer(old, next, 'vitest', from, to);
  if (name.startsWith('@storybook/')) return peer(old, next, 'storybook', from, to);
  if (name === 'happy-dom') {
    if (major(from) < 19 && major(to) >= 19) return cjsEntry(a, b, 'const w=new p.Window();if(!w.document.body)process.exit(1);');
    if (major(from) === 19 && major(to) >= 20) {
      assert.equal(await documentProbe(a, 'script'), 'ok');
      assert.equal(await documentProbe(b, 'script'), null);
      return ['happy-dom-no-script-default', {}];
    }
    if (major(from) === 20 && major(to) === 21) {
      assert.equal(await documentProbe(a, 'css'), 'red');
      assert.equal(await documentProbe(b, 'css'), '');
      return ['happy-dom-no-css-default', {}];
    }
  }
  if (name === 'copy-webpack-plugin' && to === '13.0.0') {
    assert(old.dependencies.globby);
    assert.equal(next.dependencies.globby, undefined);
    assert(next.dependencies.tinyglobby);
    return ['copy-webpack-glob-engine', {}];
  }
  if (name === 'react-dropzone') {
    if (major(from) <= 16 && major(to) >= 17) return peer(old, next, 'react', '17.0.2', '18.0.0');
    if (major(from) === 17 && major(to) >= 18 && major(to) <= 19) {
      assert.deepEqual(dropzoneType(a, false), []);
      const codes = dropzoneType(b, false);
      assert(codes.includes(2322) || codes.includes(2739) || codes.includes(2741));
      assert.deepEqual(dropzoneType(b, true), []);
      return ['dropzone-file-type', {}];
    }
    if (from === '18.0.0' && to === '19.0.0') {
      assert.deepEqual(await dropped(a, 1), [[], ['a.txt', 'b.txt']]);
      assert.deepEqual(await dropped(b, 1), [['a.txt'], ['b.txt']]);
      return ['dropzone-partial-batch', {}];
    }
  }
  if (name === 'sinon') {
    const start = major(from);
    const target = major(to);
    if (start === 18 && target >= 19) {
      const fakes = (pkg, options) => {
        const clock = pkg.entry().useFakeTimers(options);
        try { return clock.methods.includes('nextTick'); } finally { clock.restore(); }
      };
      assert.equal(fakes(a, {}), false);
      assert.equal(fakes(b, {}), true);
      assert.equal(fakes(b, { toFake: ['setTimeout','clearTimeout'] }), false);
      return ['sinon-fake-all-timers', {}];
    }
    if (start < 20 && target >= 20) {
      assert.equal(typeof a.entry().useFakeXMLHttpRequest, 'function');
      assert.equal(b.entry().useFakeXMLHttpRequest, undefined);
      const transport = { send() {} };
      const stub = b.entry().stub(transport, 'send').resolves({ ok: true });
      try {
        assert.deepEqual(await transport.send('fixture request'), { ok: true });
        assert(stub.calledOnceWithExactly('fixture request'));
      } finally { stub.restore(); }
      return ['sinon-fake-xhr', {}];
    }
    if (start === 20 && target >= 21) {
      assert.equal(typeof a.entry().assert.failException, 'string');
      assert.equal(b.entry().assert.failException, undefined);
      assert.throws(() => b.entry().assert.fail('sample assertion'), /sample assertion/);
      return ['sinon-assert-error', {}];
    }
  }
  if (name === 'puppeteer' && major(from) === 22 && major(to) < 25) {
    const types = pkg => {
      const core = pkg.load.resolve('puppeteer-core/package.json');
      assert.equal(require(core).version, pkg.manifest.dependencies['puppeteer-core']);
      return readFileSync(join(dirname(core), 'lib/types.d.ts'), 'utf8');
    };
    assert.match(types(a), /\bproduct\?: Product/);
    assert.doesNotMatch(types(b), /\bproduct\?: Product/);
    assert.match(types(b), /\bbrowser\?: SupportedBrowser/);
    return ['puppeteer-browser-option', {}];
  }
  if (name === '@sentry/webpack-plugin' && major(from) < 5 && major(to) >= 5)
    return peer(old, next, 'webpack', '4.47.0', '5.101.0');
  if (name === 'webpack-cli') return peer(old, next, 'webpack', '5.82.0', '5.101.0');
  if (name === '@commitlint/cli' && from === '19.0.0' && to === '20.0.0') {
    const lint = (arm, body) => arm.load('@commitlint/lint').default('feat: sample\n\n' + body,
      { 'body-max-line-length': [2, 'always', 30] });
    const body = 'https://example.test/this/url/makes/the/body/line/long';
    assert.equal((await lint(a, body)).valid, false);
    assert.equal((await lint(b, body)).valid, true);
    assert.equal((await lint(b, 'This example has a regular long body line that exceeds the limit')).valid, false);
    return ['commitlint-url-lines', {}];
  }
  return engine(old, next);
}

module.exports = { check };
