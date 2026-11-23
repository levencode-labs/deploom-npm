const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');

const [oldTsc, nextTsc, scratch] = process.argv.slice(2);
assert(oldTsc && nextTsc && scratch, 'Usage: node check.cjs <TypeScript 6.0.3 bin/tsc> <TypeScript 7.0.2 bin/tsc> <existing scratch dir>');
const compilers = { '6.0.3': path.resolve(oldTsc), '7.0.2': path.resolve(nextTsc) };
const fixture = fs.mkdtempSync(path.join(path.resolve(scratch), 'typescript7-node10-'));
const node = process.execPath;
function write(name, value) {
  const file = path.join(fixture, name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, typeof value === 'string' ? value : JSON.stringify(value, null, 2));
}
function run(args) {
  const result = spawnSync(node, args, { cwd: fixture, encoding: 'utf8', windowsHide: true });
  if (result.error) throw result.error;
  return { status: result.status, output: (result.stdout + result.stderr).trim() };
}
function compile(version, args) {
  const tsc = compilers[version];
  assert.deepEqual(run([tsc, '--version']), { status: 0, output: 'Version ' + version });
  return run([tsc, '--pretty', 'false', ...args]);
}
write('package.json', { private: true, type: 'module' });
write('node_modules/contract-fixture/package.json', {
  name: 'contract-fixture', version: '1.0.0', type: 'module',
  types: './index.d.ts', exports: { '.': { types: './index.d.ts', default: './index.js' } },
});
write('node_modules/contract-fixture/index.js', 'export const value = "public";\n');
write('node_modules/contract-fixture/index.d.ts', 'export declare const value: "public";\n');
write('node_modules/contract-fixture/internal.js', 'export const value = "private";\n');
write('node_modules/contract-fixture/internal.d.ts', 'export declare const value: "private";\n');
write('legacy.ts', 'import { value } from "contract-fixture/internal.js";\nconsole.log(value);\n');
write('public.ts', 'import { value } from "contract-fixture";\nconsole.log(value);\n');
function config(name, source, options) {
  write(name, { files: [source], compilerOptions: { target: 'es2022', strict: true, types: [], ...options } });
}
config('node10.json', 'legacy.ts', { module: 'esnext', moduleResolution: 'node10', outDir: 'legacy' });
config('node10-suppressed.json', 'legacy.ts', { module: 'esnext', moduleResolution: 'node10', ignoreDeprecations: '6.0', outDir: 'legacy' });
config('nodenext-private.json', 'legacy.ts', { module: 'nodenext', moduleResolution: 'nodenext', noEmit: true });
config('nodenext-public.json', 'public.ts', { module: 'nodenext', moduleResolution: 'nodenext', outDir: 'public' });
const results = {};
for (const [label, version, project] of [
  ['ts6Unsuppressed', '6.0.3', 'node10.json'],
  ['ts6Suppressed', '6.0.3', 'node10-suppressed.json'],
  ['ts7Unsuppressed', '7.0.2', 'node10.json'],
  ['ts7Suppressed', '7.0.2', 'node10-suppressed.json'],
  ['ts6NodeNextPrivate', '6.0.3', 'nodenext-private.json'],
  ['ts7NodeNextPrivate', '7.0.2', 'nodenext-private.json'],
  ['ts6NodeNextPublic', '6.0.3', 'nodenext-public.json'],
  ['ts7NodeNextPublic', '7.0.2', 'nodenext-public.json'],
]) results[label] = compile(version, ['-p', project]);
results.legacyRuntime = run(['legacy/legacy.js']);
results.publicRuntime = run(['public/public.js']);
console.log(JSON.stringify({ fixture: path.basename(fixture), results }, null, 2));
assert(results.ts6Unsuppressed.status !== 0 && /node10.*deprecated/i.test(results.ts6Unsuppressed.output));
assert.equal(results.ts6Suppressed.status, 0);
assert(results.ts7Unsuppressed.status !== 0 && /TS5108/.test(results.ts7Unsuppressed.output));
assert(results.ts7Suppressed.status !== 0 && /TS5108/.test(results.ts7Suppressed.output));
for (const name of ['ts6NodeNextPrivate', 'ts7NodeNextPrivate']) {
  assert(results[name].status !== 0 && /TS2307/.test(results[name].output));
}
for (const name of ['ts6NodeNextPublic', 'ts7NodeNextPublic']) assert.equal(results[name].status, 0);
assert(results.legacyRuntime.status !== 0 && /ERR_PACKAGE_PATH_NOT_EXPORTED/.test(results.legacyRuntime.output));
assert.deepEqual(results.publicRuntime, { status: 0, output: 'public' });
