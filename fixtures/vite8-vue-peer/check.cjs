const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

const smoke = `
  import assert from 'node:assert/strict';
  import { unlinkSync, writeFileSync } from 'node:fs';
  import { join } from 'node:path';
  import vue from '@vitejs/plugin-vue';
  import { build } from 'vite';

  const name = 'Component-' + process.pid + '.vue';
  const entry = join(process.cwd(), name);
  writeFileSync(entry, '<template><main>deploom-vue-component</main></template>', { flag: 'wx' });
  try {
    const result = await build({
      configFile: false,
      logLevel: 'silent',
      plugins: [vue()],
      build: {
        write: false,
        lib: { entry, formats: ['es'] },
      },
    });
    assert.ok(result.some(bundle => bundle.output.some(
      item => item.type === 'chunk' && item.code.includes('deploom-vue-component'),
    )));
  } finally {
    unlinkSync(entry);
  }
`;

const held = spawnSync('npm install --package-lock-only --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps', {
  cwd: join(__dirname, 'held'),
  shell: true,
  encoding: 'utf8',
  timeout: 45000,
});
if (held.error) throw held.error;
assert.equal(held.status, 1, held.stdout + held.stderr);
assert.match(held.stderr, /ERESOLVE/);
assert.match(held.stderr, /from @vitejs\/plugin-vue@4\.5\.0/);

for (const [stage, vite, plugin] of [
  ['before', '5.0.10', '4.5.0'],
  ['after', '8.3.8', '6.0.7'],
]) {
  const cwd = join(__dirname, stage);
  for (const [pkg, version] of Object.entries({ vite, '@vitejs/plugin-vue': plugin, vue: '3.3.8' })) {
    const manifest = join(cwd, 'node_modules', pkg, 'package.json');
    assert.equal(JSON.parse(readFileSync(manifest, 'utf8')).version, version, pkg);
  }
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', smoke], {
    cwd, encoding: 'utf8', timeout: 30000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stdout + result.stderr);
}
console.log('Vue SFC builds with both the baseline pair and Vite 8 with a compatible Vue plugin.');
