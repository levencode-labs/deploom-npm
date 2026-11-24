const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const test = `
  import assert from 'node:assert/strict';
  import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
  import { join } from 'node:path';
  import { pathToFileURL } from 'node:url';
  import { JSDOM } from 'jsdom';
  import { compile } from 'svelte/compiler';

  const [generate, style] = process.argv.slice(1);
  const html = new JSDOM('<main id="app"></main>', { pretendToBeVisual: true });
  globalThis.requestAnimationFrame = html.window.requestAnimationFrame.bind(html.window);
  globalThis.cancelAnimationFrame = html.window.cancelAnimationFrame.bind(html.window);
  globalThis.window = html.window;
  for (const key of ['document', 'Node', 'Element', 'HTMLElement', 'Text', 'Comment', 'Event', 'CustomEvent', 'navigator']) {
    Object.defineProperty(globalThis, key, { value: html.window[key], configurable: true });
  }

  const target = document.getElementById('app');
  const source = '<script>export let name;</script><h1>Hello {name}</h1>';
  const { js } = compile(source, { filename: 'App.svelte', generate, dev: true });
  const dir = mkdtempSync(join(process.cwd(), 'replay-'));
  const entry = join(dir, 'component.mjs');
  writeFileSync(entry, js.code);
  try {
    const { default: App } = await import(pathToFileURL(entry).href);
    const svelte = await import('svelte');
    const props = { name: 'fixture' };
    const usingMount = style === 'mount';
    const app = usingMount ? svelte.mount(App, { target, props }) : new App({ target, props });
    await svelte.tick();
    assert.equal(target.querySelector('h1').textContent, 'Hello fixture');
    if (usingMount) await svelte.unmount(app);
    else app.$destroy();
    assert.equal(target.querySelector('h1'), null);
    console.log('Mounted, rendered the supplied prop, and cleaned up.');
  } finally {
    unlinkSync(entry);
    rmdirSync(dir);
    html.window.close();
  }
`;

function run(stage, version, generate, style) {
  const cwd = join(__dirname, stage);
  const info = JSON.parse(readFileSync(join(cwd, 'node_modules/svelte/package.json'), 'utf8'));
  assert.equal(info.version, version);
  const result = spawnSync(process.execPath, ['--conditions=browser', '--input-type=module', '-e', test, generate, style], {
    cwd, encoding: 'utf8', timeout: 20000,
  });
  if (result.error) throw result.error;
  return result;
}

const before = run('before', '4.2.18', 'dom', 'constructor');
assert.equal(before.status, 0, before.stderr);
const held = run('after', '5.0.0', 'client', 'constructor');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /component_api_invalid_new|no longer valid in Svelte 5/);
const restored = run('after', '5.0.0', 'client', 'mount');
assert.equal(restored.status, 0, restored.stderr);
assert.match(restored.stdout, /Mounted, rendered the supplied prop, and cleaned up/);
console.log('Svelte 5 mount and unmount preserve the rendered prop and teardown.');
