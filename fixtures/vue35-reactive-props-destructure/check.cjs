const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const replay = `
  import assert from 'node:assert/strict';
  import { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } from 'node:fs';
  import { join } from 'node:path';
  import { pathToFileURL } from 'node:url';
  import { JSDOM } from 'jsdom';

  const [expectedVue, mode] = process.argv.slice(1);
  const dom = new JSDOM('<div id="root"></div>');
  for (const name of ['window', 'document', 'Element', 'SVGElement']) {
    globalThis[name] = name === 'window' ? dom.window : dom.window[name];
  }
  const { createApp, h, nextTick, ref, version } = await import('vue');
  const { parse, compileScript } = await import('vue/compiler-sfc');
  assert.equal(version, expectedVue);

  const binding = mode === 'legacy' ? "const props = defineProps(['value'])" : "const { value } = defineProps(['value'])";
  const read = mode === 'legacy' ? 'props.value' : 'value';
  const source = '<script setup>import { computed } from "vue";'
    + binding + ';const display = computed(() => ' + read + ' * 2);'
    + '</script><template><output>{{ display }}</output></template>';
  const parsed = parse(source, { filename: 'Fixture.vue' });
  assert.deepEqual(parsed.errors, []);
  const options = { id: 'fixture', inlineTemplate: true };
  if (mode === 'disabled') options.propsDestructure = false;
  const code = compileScript(parsed.descriptor, options).content;

  const directory = mkdtempSync(join(process.cwd(), 'replay-'));
  const modulePath = join(directory, 'component.mjs');
  writeFileSync(modulePath, code);
  try {
    const child = (await import(pathToFileURL(modulePath).href)).default;
    const value = ref(1);
    const target = dom.window.document.querySelector('#root');
    const app = createApp({ render: () => h(child, { value: value.value }) });
    app.mount(target);
    try {
      assert.equal(target.textContent, '2');
      value.value = 2;
      await nextTick();
      console.log(target.textContent);
    } finally {
      app.unmount();
    }
  } finally {
    dom.window.close();
    unlinkSync(modulePath);
    rmdirSync(directory);
  }
`;

function render(stage, version, mode) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', replay, version, mode], {
    cwd: join(__dirname, stage), encoding: 'utf8', timeout: 20000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + result.stderr);
  return result.stdout.trim();
}

assert.equal(render('before', '3.4.38', 'legacy'), '4');
assert.equal(render('before', '3.4.38', 'destructured'), '2');
assert.equal(render('after', '3.5.13', 'destructured'), '4');
assert.equal(render('after', '3.5.13', 'disabled'), '2');
console.log('Vue 3.5 keeps the destructured prop reactive when the SFC compiler feature is enabled.');
