'use strict';
const assert = require('node:assert/strict');
const { readFileSync, writeFileSync, mkdtempSync, rmSync } = require('node:fs');
const { dirname, join } = require('node:path');
const { createRequire } = require('node:module');
const { spawnSync } = require('node:child_process');
const { tmpdir } = require('node:os');
const semver = require('./p00/node_modules/semver');
const facts = require('./facts.json');

const nodes = ['12.22.12','14.21.3','16.20.2','18.20.8','20.0.0','20.18.3','20.19.0','21.7.3',
  '22.0.0','22.12.0','22.13.0','22.18.0','22.22.0','22.22.1','24.18.0'];
const runtime = {'eslint-plugin-react-hooks':'p02','@playwright/test':'p07','sass':'p11',
  '@sentry/browser':'p12','@sentry/react':'p17','sass-loader':'p23','react-error-boundary':'p28','happy-dom':'p30'};

function arm(name, version) {
  const manifest = facts[name][version];
  assert.match(manifest.integrity, /^sha512-[\w+/]{86}==$/);
  const cwd = runtime[name] ? join(__dirname, runtime[name]) : null;
  const alias = 'v-' + version.replaceAll('.', '-');
  if (!cwd) return { manifest };
  const root = join(cwd, 'node_modules', alias);
  const pkg = join(root, 'package.json');
  const local = JSON.parse(readFileSync(pkg, 'utf8'));
  assert.equal(local.name, name);
  assert.equal(local.version, version);
  assert.equal(require(join(cwd, 'package-lock.json')).packages['node_modules/' + alias].integrity, manifest.integrity);
  return { manifest, cwd, root, alias, load: createRequire(pkg),
    entry: () => createRequire(join(cwd, 'package.json'))(alias) };
}

function read(root, name) {
  return readFileSync(join(root, name), 'utf8');
}

function pw(pkg) {
  const playwright = pkg.load.resolve('playwright/package.json');
  const core = createRequire(playwright).resolve('playwright-core/package.json');
  assert.equal(require(core).version, require(playwright).version);
  return { pw: dirname(playwright), core: dirname(core) };
}

function accepts(pkg, script, flags = []) {
  const r = spawnSync(process.execPath, [...flags, '-e', script, pkg.alias],
    { cwd: pkg.cwd, encoding: 'utf8', timeout: 15000 });
  if (r.error) throw r.error;
  return r;
}

function cjsEntry(before, after, sample) {
  const flags = ['--no-experimental-require-module'];
  const held = 'require(process.argv[1]);';
  assert.equal(accepts(before, held, flags).status, 0);
  assert.match(accepts(after, held, flags).stderr, /ERR_REQUIRE_ESM/);
  assert.equal(accepts(after, 'import(process.argv[1]).then(p=>{' + sample + '})').status, 0);
}

function engine(old, next) {
  const a = old.engines?.node;
  const b = next.engines?.node;
  if (!a || !b) return;
  const held = nodes.find(v => semver.satisfies(v, a) && !semver.satisfies(v, b));
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
  return { name, a: a ?? 'no explicit peer range', b, before, after };
}

function playwrightPair(from, to, a, b) {
  const first = pw(a), last = pw(b);
  const oldApi = read(first.core, 'types/types.d.ts');
  const newApi = read(last.core, 'types/types.d.ts');
  if (to === '1.49.0') {
    const browsers = arm => JSON.parse(read(arm.core, 'browsers.json')).browsers.map(x=>x.name);
    assert(!browsers(first).includes('chromium-headless-shell'));
    assert(browsers(last).includes('chromium-headless-shell'));
    return ['playwright-headless-shell', {}];
  }
  if (to === '1.50.0') {
    const hasChanged = arm => /updateSnapshots\?:[^\r\n]+changed/.test(read(arm.pw, 'types/test.d.ts'));
    assert.equal(hasChanged(first), false);
    assert.equal(hasChanged(last), true);
    return ['playwright-snapshot-changed', {}];
  }
  if (to === '1.56.0') {
    const contexts = arm => createRequire(join(arm.core, 'package.json'))('./lib/client/browserContext.js').BrowserContext.prototype;
    const ctx = { _backgroundPages: new Set(['mock background page']) };
    assert.deepEqual(contexts(first).backgroundPages.call(ctx), ['mock background page']);
    assert.deepEqual(contexts(last).backgroundPages.call(ctx), []);
    assert.equal(typeof contexts(last).serviceWorkers, 'function');
    return ['playwright-background-pages', {}];
  }
  if (to === '1.58.0') {
    assert.match(oldApi, /\bdevtools\?: boolean/);
    assert.doesNotMatch(newApi, /\bdevtools\?: boolean/);
    assert.match(newApi, /\bargs\?: Array<string>/);
    return ['playwright-devtools', {}];
  }
  if (to === '1.59.0') {
    const reporter = arm => read(arm.pw, 'lib/reporters/junit.js');
    assert.doesNotMatch(reporter(first), /elementName: "error"/);
    assert.match(reporter(last), /elementName: "error"/);
    assert.match(reporter(last), /name: "failure"/);
    return ['playwright-junit-error', {}];
  }
  if (to === '1.60.0') {
    assert.match(oldApi, /\bvideosPath\?: string/);
    assert.doesNotMatch(newApi, /\bvideosPath\?: string/);
    assert.match(newApi, /\brecordVideo\?:/);
    return ['playwright-record-video', {}];
  }
  if (to === '1.64.0') {
    const forwarded = arm => /screen: \[\(\{ contextOptions \}, use\) => use\(contextOptions.screen\)/.test(read(arm.pw, 'lib/index.js'));
    assert.equal(forwarded(first), false);
    assert.equal(forwarded(last), true);
    return ['playwright-device-screen', {}];
  }
}

function playwrightClassFields(first, last) {
  const root = mkdtempSync(join(tmpdir(), 'deploom-pw-fields-'));
  try {
    writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
      compilerOptions: { target: 'ES2022', useDefineForClassFields: true },
    }));
    const config = join(root, 'playwright.config.cjs');
    writeFileSync(config, 'module.exports={testDir:".",reporter:"list"};');
    function discover(arm, fields) {
      writeFileSync(join(root, 'sample.spec.ts'),
        'const {test}=require(' + JSON.stringify(arm.root) + ');\n' + fields +
        '\nif (new Entry("abc").length !== 3) throw new Error("Unexpected length");\ntest("field fixture", () => {});\n');
      const result = spawnSync(process.execPath, [join(arm.root, 'cli.js'), 'test', '--list', '--config', config],
        { cwd: root, encoding: 'utf8', timeout: 25000 });
      if (result.error) throw result.error;
      return result;
    }
    const held = 'class Entry { length=this.seed.length; constructor(private seed:string) {} }';
    const fixed = 'class Entry { length:number; constructor(private seed:string) { this.length=this.seed.length; } }';
    assert.equal(discover(first, held).status, 0);
    const broken = discover(last, held);
    assert.notEqual(broken.status, 0);
    assert.match(broken.stdout + broken.stderr, /Cannot read properties of undefined/);
    assert.equal(discover(last, fixed).status, 0);
    return ['playwright-class-fields', {}];
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}

async function inlineModule(pkg, disableJavaScriptEvaluation) {
  const window = new (pkg.entry().Window)({ settings: { disableJavaScriptEvaluation } });
  try {
    const script = window.document.createElement('script');
    script.type = 'module';
    script.textContent = 'export const proof=1; document.body.setAttribute("data-module","ran");';
    window.document.body.appendChild(script);
    await window.happyDOM.whenAsyncComplete();
    return window.document.body.getAttribute('data-module');
  } finally {
    await window.happyDOM.abort();
  }
}

async function check([name, from, to]) {
  const a = arm(name, from);
  const b = arm(name, to);
  const old = a.manifest;
  const next = b.manifest;
  const major = version => +version.split('.')[0];
  if (name === '@playwright/test') {
    if (to === '1.65.0') return playwrightClassFields(a, b);
    return playwrightPair(from, to, a, b);
  }
  if (name === '@vitest/coverage-v8') return ['peer', peer(old, next, 'vitest', from, to)];
  if (name === '@vitejs/plugin-react') return ['peer', peer(old, next, 'vite', '7.0.0', '8.0.0')];
  if (name === '@testing-library/jest-dom') return ['peer-added', peer(old, next, 'vitest', '4.0.0', '5.0.0')];
  if (name === '@testing-library/react') {
    const dom = '@testing-library/dom';
    assert(semver.satisfies('10.0.0', old.dependencies[dom]));
    assert.equal(next.dependencies?.[dom], undefined);
    assert(semver.satisfies('10.0.0', next.peerDependencies[dom]));
    return ['testing-library-dom-peer', {}];
  }
  if (name.startsWith('@storybook/')) {
    return [old.peerDependencies?.storybook ? 'peer' : 'peer-added', peer(old, next, 'storybook', from, to)];
  }
  if (name === 'storybook') {
    const prior = old.exports?.['./test'];
    const target = next.exports?.['./test'];
    if (major(from) === 8) {
      assert.equal(prior, undefined);
      assert.match(target.types, /test\/index\.d\.ts$/);
      return ['storybook-test-entry', {}];
    }
    assert.match(prior.require, /\.cjs$/);
    assert.equal(target.require, undefined);
    assert.equal(next.type, 'module');
    return ['storybook-esm-test-entry', {}];
  }
  if (name === 'eslint-plugin-react-hooks' && major(to) === 7) {
    const previous = a.entry().configs.recommended.rules;
    const current = b.entry().configs.recommended.rules;
    const rule = 'react-hooks/refs';
    assert(!Object.hasOwn(previous, rule));
    assert(Object.hasOwn(current, rule));
    assert(Object.hasOwn(b.entry().rules, 'refs'));
    assert(Object.keys(previous).every(key => Object.hasOwn(current, key)));
    return ['react-hooks-recommended', {}];
  }
  if (name === 'react-error-boundary') {
    cjsEntry(a, b, 'if(!p.ErrorBoundary)process.exit(1)');
    return ['esm', {}];
  }
  if (name === 'happy-dom') {
    if (from === '16.0.0' && to === '17.0.0') {
      assert.equal(await inlineModule(a, false), null);
      assert.equal(await inlineModule(b, false), 'ran');
      assert.equal(await inlineModule(b, true), null);
      return ['happy-dom-inline-modules', {}];
    }
    if (major(from) === 13) {
      const before = read(a.root, 'lib/index.d.ts');
      const after = read(b.root, 'lib/index.d.ts');
      assert.match(before, /\bIHTMLElement\b/);
      assert.doesNotMatch(after, /\bIHTMLElement\b/);
      assert.match(after, /\bHTMLElement\b/);
      return ['happy-dom-interface', {}];
    }
    if (major(to) >= 19) {
      cjsEntry(a, b, 'const w=new p.Window();if(!w.document.body)process.exit(1);');
      return ['esm', {}];
    }
    if (major(from) === 14) {
      const html = pkg => {
        const win = new (pkg.entry().Window)();
        win.document.body.innerHTML = '<p>&amp;</p>';
        return [win.document.body.innerHTML, win.document.body.textContent];
      };
      assert.deepEqual(html(a), ['<p>&</p>', '&']);
      assert.deepEqual(html(b), ['<p>&amp;</p>', '&']);
      return ['happy-dom-escaped-html', {}];
    }
    if (major(from) === 15 && major(to) >= 16) {
      const html = (pkg, input) => {
        const win = new (pkg.entry().Window)();
        win.document.body.innerHTML = input;
        return win.document.body.innerHTML;
      };
      const implicit = '<table><tr><td>x</td></tr></table>';
      const explicit = '<table><tbody><tr><td>x</td></tr></tbody></table>';
      assert.equal(html(a, implicit), implicit);
      assert.equal(html(b, implicit), explicit);
      assert.equal(html(b, explicit), explicit);
      return ['happy-dom-tbody', {}];
    }
  }
  if (name === 'sass') {
    if (to === '1.92.0') {
      const compile = (pkg, input) => pkg.entry().compileString(input, { logger: { warn() {} } }).css.replace(/\s+/g, ' ');
      const input = '.x{.y{color:red}color:blue}';
      const baseline = '.x { color: blue; } .x .y { color: red; }';
      assert.equal(compile(a, input), baseline);
      assert.equal(compile(b, input), '.x .y { color: red; } .x { color: blue; }');
      assert.equal(compile(b, '.x{color:blue;.y{color:red}}'), baseline);
      return ['sass-mixed-declarations', {}];
    }
    const warning = (pkg, version) => {
      const sass = pkg.entry();
      const notes = [];
      sass.compileString('a{color:red}', { fatalDeprecations: [sass.Version.parse(version)],
        logger: { warn: message => notes.push(message) } });
      return notes.join('\n');
    };
    assert.equal(warning(a, '990.0.0'), '');
    assert.match(warning(b, '990.0.0'), /beyond the current version/);
    assert.equal(warning(b, '1.106.1'), '');
    return ['sass-future-version', {}];
  }
  if (name === 'sass-loader' && to === '15.0.0') {
    const preference = pkg => /require\.resolve\("([^"]+)"\);/.exec(read(pkg.root, 'dist/utils.js'))[1];
    assert.equal(preference(a), 'sass');
    assert.equal(preference(b), 'sass-embedded');
    return ['sass-loader-embedded', {}];
  }
  if (name === 'sass-loader' && to === '16.0.0') {
    const modern = pkg => /typeof options\.api === "undefined" \? "modern"/.test(read(pkg.root, 'dist/index.js'));
    assert.equal(modern(a), false);
    assert.equal(modern(b), true);
    return ['sass-loader-modern', {}];
  }
  if ((name === '@sentry/browser' || name === '@sentry/react') && from === '9.0.0' && to === '10.0.0') {
    const browserUtils = pkg => {
      const browser = name === '@sentry/react' ? createRequire(pkg.load.resolve('@sentry/browser/package.json')) : pkg.load;
      return browser('@sentry-internal/browser-utils');
    };
    assert.equal(typeof browserUtils(a).addFidInstrumentationHandler, 'function');
    assert.equal(browserUtils(b).addFidInstrumentationHandler, undefined);
    assert.equal(typeof browserUtils(b).addInpInstrumentationHandler, 'function');
    return ['sentry-inp', {}];
  }
  return engine(old, next);
}

module.exports = { check };
