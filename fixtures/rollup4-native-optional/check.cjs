const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const phase = process.argv[2];
assert.ok(['omitted', 'restored'].includes(phase));
assert.equal(process.arch, 'x64');
assert.ok(process.platform === 'win32' ||
  (process.platform === 'linux' && process.report.getReport().header.glibcVersionRuntime));
const nativeName = process.platform === 'win32'
  ? '@rollup/rollup-win32-x64-msvc'
  : '@rollup/rollup-linux-x64-gnu';

function arm(name, version) {
  const root = join(__dirname, name);
  const installedVersion = (pkg) =>
    JSON.parse(readFileSync(join(root, 'node_modules', pkg, 'package.json'), 'utf8')).version;
  assert.equal(installedVersion('rollup'), version);
  return { load: createRequire(join(root, 'package.json')), installedVersion };
}

const before = arm('before', '3.29.4');
const after = arm('after', '4.0.0');

async function build(load) {
  const { rollup } = load('rollup');
  const bundle = await rollup({
    input: 'entry',
    plugins: [{
      name: 'fixture-input',
      resolveId(id) {
        return id === 'entry' ? id : null;
      },
      load(id) {
        return id === 'entry' ? "export const marker = 'rollup-native-fixture';" : null;
      },
    }],
  });
  try {
    const { output } = await bundle.generate({ format: 'cjs' });
    assert.equal(output.length, 1);
    assert.match(output[0].code, /const marker = 'rollup-native-fixture'/);
    assert.match(output[0].code, /exports\.marker = marker/);
    return output[0].code;
  } finally {
    await bundle.close();
  }
}

async function check() {
  const baseline = await build(before.load);
  if (phase === 'omitted') {
    assert.throws(() => after.load('rollup'),
      (error) => error.code === 'MODULE_NOT_FOUND' && error.message.includes(nativeName));
    console.log(`Rollup 3 emitted a bundle and Rollup 4 reported missing ${nativeName}`);
    return;
  }
  assert.equal(after.installedVersion(nativeName), '4.0.0');
  assert.equal(await build(after.load), baseline);
  console.log(`Rollup 4 emitted the same bundle with ${nativeName}@4.0.0`);
}

check().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
