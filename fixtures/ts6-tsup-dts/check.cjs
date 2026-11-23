const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const fixture = __dirname;
const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'deploom-ts6-tsup-'));
const pnpmJs = process.argv[2] && path.resolve(process.argv[2]);
const pnpm = pnpmJs
  ? [process.execPath, [pnpmJs]]
  : [process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm', []];

function run(executable, args, cwd, shell = false) {
  const result = spawnSync(executable, args, { cwd, encoding: 'utf8', shell,
    env: { ...process.env, CI: 'true' }, timeout: 180_000 });
  if (result.error) throw result.error;
  return { code: result.status, log: result.stdout + result.stderr };
}

function install(name) {
  const dir = path.join(scratch, name);
  fs.cpSync(path.join(fixture, name), dir, {
    recursive: true, filter: source => path.basename(source) !== 'node_modules',
  });
  const [bin, prefix] = pnpm;
  const installed = run(bin, [...prefix, 'install', '--frozen-lockfile', '--ignore-scripts',
    '--config.registry=https://registry.npmjs.org/', '--config.no-proxy=registry.npmjs.org'],
    dir, !pnpmJs && process.platform === 'win32');
  assert.equal(installed.code, 0, installed.log);
  fs.writeFileSync(path.join(dir, 'index.ts'), "export const format = (name: string): string => 'Hello ' + name;\n");
  const tsupConfig = 'export default { entry: ["index.ts"], format: ["cjs", "esm"], dts: true,' +
    'clean: true };';
  fs.writeFileSync(path.join(dir, 'tsup.config.mjs'), tsupConfig);
  return dir;
}

function build(dir, legacy) {
  const compilerOptions = { module: 'ESNext', target: 'ES2020',
    moduleResolution: legacy ? 'node' : 'bundler' };
  if (legacy) compilerOptions.baseUrl = './';
  fs.writeFileSync(path.join(dir, 'tsconfig.json'), JSON.stringify({ compilerOptions }));
  const manifest = require(path.join(dir, 'node_modules/tsup/package.json'));
  assert.equal(manifest.version, '8.5.0');
  const cli = path.join(dir, 'node_modules/tsup', manifest.bin.tsup);
  return run(process.execPath, [cli], dir);
}

try {
  const baseline = install('baseline');
  const target = install('target');
  const patched = install('patched');
  assert.equal(require(path.join(baseline, 'node_modules/typescript/package.json')).version, '5.9.2');
  assert.equal(require(path.join(target, 'node_modules/typescript/package.json')).version, '6.0.3');
  assert.equal(require(path.join(patched, 'node_modules/typescript/package.json')).version, '6.0.3');
  const b = build(baseline, true);
  assert.equal(b.code, 0, b.log);
  const t = build(target, true);
  assert.notEqual(t.code, 0, t.log);
  assert.match(t.log, /TS5101/);
  assert.match(t.log, /TS5107/);
  const configOnly = build(target, false);
  assert.notEqual(configOnly.code, 0, configOnly.log);
  assert.match(configOnly.log, /TS5101/);
  assert.doesNotMatch(configOnly.log, /TS5107/);
  const repaired = build(patched, false);
  assert.equal(repaired.code, 0, repaired.log);
  const dist = path.join(patched, 'dist');
  const declarations = fs.readdirSync(dist).filter(name => /\.d\.(ts|cts|mts)$/.test(name));
  assert.equal(declarations.length, 2);
  for (const file of declarations) {
    const expected = fs.readFileSync(path.join(baseline, 'dist', file));
    assert.deepEqual(fs.readFileSync(path.join(dist, file)), expected);
    assert.match(expected.toString(), /format.*string/);
  }
  console.log('TypeScript 5.9.2 baseline emitted declarations; 6.0.3 held tsup failed before patch, and patched DTS matched baseline.');
} finally {
  assert.equal(path.dirname(scratch), path.resolve(os.tmpdir()));
  assert.match(path.basename(scratch), /^deploom-ts6-tsup-[a-z0-9]+$/i);
  fs.rmSync(scratch, { recursive: true, force: true });
}
