const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const [oldEntry, newEntry, scratch] = process.argv.slice(2);
assert(oldEntry && newEntry && scratch, 'Usage: node check.cjs <Vite 5 node entry> <Vite 8 node entry> <existing scratch dir>');
async function load(implementation, version) {
  const vite = await import(pathToFileURL(path.resolve(implementation)));
  assert.equal(vite.version, version);
  return vite;
}

async function main() {
  const root = await fs.mkdtemp(path.join(path.resolve(scratch), 'vite-lib-css-'));
  await fs.writeFile(path.join(root, 'package.json'), '{"name":"probe-library","type":"module"}\n');
  await fs.writeFile(path.join(root, 'input.js'), 'import "./input.css"; globalThis.probeLibrary = true;\n');
  await fs.writeFile(path.join(root, 'input.css'), '.probe { position: fixed; }\n');
  await fs.writeFile(path.join(root, 'index.html'), '<div class="probe"></div><script type="module" src="./input.js"></script>\n');
  const oldVite = await load(oldEntry, '5.4.2');
  const newVite = await load(newEntry, '8.3.8');
  const library = { entry: path.join(root, 'input.js'), formats: ['iife'], name: 'ProbeLibrary' };
  const output = async (vite, name, lib) => {
    const outDir = path.join(root, name);
    await vite.build({ root, configFile: false, logLevel: 'silent',
      build: { outDir, cssCodeSplit: !lib, ...(lib ? { lib } : {}) } });
    const files = await fs.readdir(outDir, { recursive: true });
    return { outDir, css: files.filter(file => file.endsWith('.css')) };
  };
  const v5 = await output(oldVite, 'vite5', library);
  const held = await output(newVite, 'vite8-held', library);
  const fixed = await output(newVite, 'vite8-fixed', { ...library, cssFileName: 'style' });
  const fileName = await output(newVite, 'vite8-file-name', { ...library, fileName: 'custom-lib' });
  const app = await output(newVite, 'vite8-app', undefined);

  assert.deepEqual(v5.css, ['style.css']);
  assert.deepEqual(held.css, ['probe-library.css']);
  await assert.rejects(fs.access(path.join(held.outDir, 'style.css')), { code: 'ENOENT' });
  assert.deepEqual(fixed.css, ['style.css']);
  assert.deepEqual(fileName.css, ['custom-lib.css']);
  assert(app.css.length === 1 && !app.css[0].endsWith('probe-library.css'));
  for (const result of [v5, held, fixed, fileName, app]) {
    const stylesheet = await fs.readFile(path.join(result.outDir, result.css[0]), 'utf8');
    assert.match(stylesheet, /\.probe\s*{\s*position\s*:\s*fixed/);
  }
  console.log(JSON.stringify({ from: oldVite.version, to: newVite.version, v5: v5.css, v8: held.css,
    fixed: fixed.css, fileName: fileName.css, ordinaryApp: app.css, preservedRule: '.probe position:fixed' }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
