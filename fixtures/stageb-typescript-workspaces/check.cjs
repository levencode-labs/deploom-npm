'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const HERE = __dirname;
const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 2 && args[0] === '--output'), 'Usage: node check.cjs [--output report.json]');
const output = args.length ? path.resolve(args[1]) : null;
const expected = { currency: 'USD', subtotalCents: 2500, taxCents: 188, totalCents: 2688 };
const compiler5 = require('typescript-before');
const compiler6 = require('typescript-after');
const compilers = {
  '5.9.2': require.resolve('typescript-before/bin/tsc'),
  '6.0.3': require.resolve('typescript-after/bin/tsc'),
};
const hash = value => createHash('sha256').update(value).digest('hex');
const bytes = file => fs.readFileSync(file);
const json = file => JSON.parse(bytes(file));
const writeJSON = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const normal = text => text.replaceAll('\\', '/');
const report = {
  schema: 1,
  fixture: 'stageb-typescript-workspaces',
  status: 'running',
  toolchain: { node: process.version, platform: process.platform, arch: process.arch },
  transition: { package: 'typescript', from: '5.9.2', to: '6.0.3' },
  cases: [],
  fixtureSha256: hash(bytes(__filename)),
  toolchainLockSha256: hash(bytes(path.join(HERE, 'package-lock.json'))),
  workspaceLockSha256: hash(bytes(path.join(HERE, 'workspace/package-lock.json'))),
};
let temporary;

function run(executable, argv, cwd) {
  const result = spawnSync(executable, argv, {
    cwd, encoding: 'utf8', timeout: 90000, maxBuffer: 4 * 1024 * 1024,
    windowsHide: true,
    env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
  });
  if (result.error) throw result.error;
  assert.equal(result.signal, null, `Process interrupted: ${result.signal}`);
  return { exit: result.status, stdout: result.stdout, stderr: result.stderr };
}

function summary(result, root) {
  const clean = text => normal(text).replaceAll(normal(root), '<workspace>').trim();
  return {
    exit: result.exit,
    diagnostics: [...new Set([...result.stdout.matchAll(/error TS(\d+):/g)].map(match => Number(match[1])))].sort((a, b) => a - b),
    stdout: clean(result.stdout), stderr: clean(result.stderr),
  };
}

function configuration(root, mode) {
  if (mode === 'baseline') return;
  const file = path.join(root, 'tsconfig.base.json');
  const config = json(file);
  delete config.compilerOptions.baseUrl;
  if (mode === 'patched') {
    for (const name of Object.keys(config.compilerOptions.paths)) {
      config.compilerOptions.paths[name] = config.compilerOptions.paths[name].map(value => './' + value);
    }
  }
  writeJSON(file, config);
}

function installCase(name, mode, npmCLI) {
  const root = path.join(temporary, name);
  fs.cpSync(path.join(HERE, 'workspace'), root, { recursive: true });
  configuration(root, mode);
  const lock = path.join(root, 'package-lock.json');
  const before = hash(bytes(lock));
  const result = run(process.execPath, [npmCLI, 'ci', '--offline', '--ignore-scripts', '--no-audit', '--no-fund', '--engine-strict', '--strict-peer-deps'], root);
  assert.equal(result.exit, 0, result.stdout + result.stderr);
  assert.equal(hash(bytes(lock)), before, 'Offline workspace install changed the lock');
  for (const name of ['contracts', 'domain', 'app']) {
    const linked = fs.realpathSync(path.join(root, 'node_modules/@deploom-stageb', name));
    assert.equal(linked, fs.realpathSync(path.join(root, 'packages', name)), 'npm did not link the exact local workspace');
    assert.equal(fs.existsSync(path.join(root, 'packages', name, 'dist')), false, 'A case inherited stale outputs');
  }
  return { root, install: { exit: 0, mode: 'offline-npm-ci', lockfileUnchanged: true, localWorkspaceLinks: 3 } };
}

function build(root, compiler, extra = []) {
  return summary(run(process.execPath, [compilers[compiler], '--build', '--pretty', 'false', ...extra], root), root);
}

function app(root) {
  const result = run(process.execPath, [path.join(root, 'packages/app/dist/index.js')], root);
  assert.equal(result.exit, 0, result.stdout + result.stderr);
  return { exit: result.exit, value: JSON.parse(result.stdout.trim()) };
}

function reject(result, codes) {
  assert.notEqual(result.exit, 0, 'Broken configuration unexpectedly built');
  assert.deepEqual(result.diagnostics, codes, result.stdout);
}

function declarationBoundary(root, compiler) {
  const result = run(process.execPath, [compilers[compiler], '--project', 'packages/app', '--listFilesOnly', '--pretty', 'false'], root);
  assert.equal(result.exit, 0, result.stdout + result.stderr);
  const identity = file => normal(fs.realpathSync(file));
  const files = result.stdout.split(/\r?\n/).filter(Boolean).map(identity);
  for (const name of ['contracts', 'domain']) {
    assert.ok(files.includes(identity(path.join(root, 'packages', name, 'dist/index.d.ts'))), 'Consumer did not use the emitted declaration');
    assert.ok(!files.includes(identity(path.join(root, 'packages', name, 'src/index.ts'))), 'Consumer crossed the declaration boundary through source');
  }
  const domainDeclaration = fs.readFileSync(path.join(root, 'packages/domain/dist/index.d.ts'), 'utf8');
  assert.match(domainDeclaration, /priceInvoice\(invoice: Invoice\): Receipt;/);
  return { emittedDeclarationsConsumed: ['contracts', 'domain'], dependencySourceFilesConsumed: [] };
}

try {
  assert.equal(process.version, 'v24.18.0', 'Use the exact fixture Node.js toolchain');
  assert.equal(compiler5.version, '5.9.2');
  assert.equal(compiler6.version, '6.0.3');
  const candidates = [
    process.env.npm_execpath,
    path.join(path.dirname(process.execPath), 'node_modules/npm/bin/npm-cli.js'),
    path.join(path.dirname(process.execPath), '../lib/node_modules/npm/bin/npm-cli.js'),
  ].filter(Boolean);
  const npmCLI = candidates.find(file => fs.existsSync(file));
  assert.ok(npmCLI, 'Cannot locate npm beside the pinned Node.js installation; use npm run check');
  const npm = run(process.execPath, [npmCLI, '--version'], HERE);
  assert.equal(npm.exit, 0, npm.stderr);
  assert.equal(npm.stdout.trim(), '11.16.0', 'Use the exact fixture npm toolchain');
  report.toolchain.npm = npm.stdout.trim();
  report.toolchain.typescriptBefore = compiler5.version;
  report.toolchain.typescriptAfter = compiler6.version;
  temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'deploom-tsb-'));

  const baseline = installCase('baseline', 'baseline', npmCLI);
  const baselineBuild = build(baseline.root, '5.9.2');
  assert.equal(baselineBuild.exit, 0, baselineBuild.stdout);
  const baselineApp = app(baseline.root);
  assert.deepEqual(baselineApp.value, expected);
  const baselineBoundary = declarationBoundary(baseline.root, '5.9.2');
  report.cases.push({ id: 'baseline', expected: 'pass', compiler: '5.9.2', install: baseline.install, build: baselineBuild, runtime: baselineApp, ...baselineBoundary });

  const held = installCase('held', 'baseline', npmCLI);
  const heldBuild = build(held.root, '6.0.3');
  reject(heldBuild, [5101, 6305, 7006]);
  assert.equal(fs.existsSync(path.join(held.root, 'packages/app/dist/index.js')), false);
  report.cases.push({ id: 'target-unchanged', expected: 'reject', compiler: '6.0.3', install: held.install, build: heldBuild, runtime: { status: 'blocked' } });

  const partial = installCase('partial', 'removed-only', npmCLI);
  const partialBuild = build(partial.root, '6.0.3');
  reject(partialBuild, [5090, 6305, 7006]);
  report.cases.push({ id: 'remove-baseurl-only', expected: 'reject', compiler: '6.0.3', install: partial.install, build: partialBuild, runtime: { status: 'blocked' } });

  const patched = installCase('patched', 'patched', npmCLI);
  const patchedBuild = build(patched.root, '6.0.3');
  assert.equal(patchedBuild.exit, 0, patchedBuild.stdout);
  const patchedApp = app(patched.root);
  assert.deepEqual(patchedApp.value, expected);
  const patchedBoundary = declarationBoundary(patched.root, '6.0.3');
  report.cases.push({ id: 'target-patched', expected: 'pass', compiler: '6.0.3', install: patched.install, build: patchedBuild, runtime: patchedApp, ...patchedBoundary });

  const missingReference = installCase('no-reference', 'patched', npmCLI);
  const appConfigPath = path.join(missingReference.root, 'packages/app/tsconfig.json');
  const appConfig = json(appConfigPath);
  delete appConfig.references;
  writeJSON(appConfigPath, appConfig);
  const noReferenceBuild = build(missingReference.root, '6.0.3');
  reject(noReferenceBuild, [6059, 6307]);
  report.cases.push({ id: 'missing-project-references', expected: 'reject', compiler: '6.0.3', install: missingReference.install, build: noReferenceBuild, runtime: { status: 'blocked' } });

  const declarationPath = path.join(patched.root, 'packages/domain/dist/index.d.ts');
  const declaration = fs.readFileSync(declarationPath, 'utf8');
  assert.ok(declaration.includes('): Receipt;'));
  fs.writeFileSync(declarationPath, declaration.replace('): Receipt;', '): Promise<Receipt>;'));
  const wrongDeclaration = summary(run(process.execPath, [compilers['6.0.3'], '--project', 'packages/app', '--noEmit', '--pretty', 'false'], patched.root), patched.root);
  reject(wrongDeclaration, [2739]);
  fs.writeFileSync(declarationPath, declaration);
  report.cases.push({ id: 'declaration-contract-mismatch', expected: 'reject', compiler: '6.0.3', build: wrongDeclaration, runtime: { status: 'blocked' } });

  const contractsPath = path.join(patched.root, 'packages/contracts/src/index.ts');
  const contracts = fs.readFileSync(contractsPath, 'utf8');
  fs.writeFileSync(contractsPath, contracts.replace('taxBasisPoints = 750', 'taxBasisPoints = 1000'));
  const incrementalBuild = build(patched.root, '6.0.3');
  assert.equal(incrementalBuild.exit, 0, incrementalBuild.stdout);
  const incrementalApp = app(patched.root);
  assert.deepEqual(incrementalApp.value, { ...expected, taxCents: 250, totalCents: 2750 });
  assert.match(fs.readFileSync(path.join(patched.root, 'packages/contracts/dist/index.d.ts'), 'utf8'), /taxBasisPoints = 1000/);
  report.cases.push({ id: 'incremental-reference-rebuild', expected: 'pass', compiler: '6.0.3', build: incrementalBuild, runtime: incrementalApp });

  const emittedApp = path.join(patched.root, 'packages/app/dist/index.js');
  const staleHash = hash(bytes(emittedApp));
  const appSource = path.join(patched.root, 'packages/app/src/index.ts');
  fs.writeFileSync(appSource, fs.readFileSync(appSource, 'utf8').replace("currency: 'USD'", "currency: 'EUR'"));
  const failedRebuild = build(patched.root, '6.0.3');
  reject(failedRebuild, [2322]);
  assert.equal(hash(bytes(emittedApp)), staleHash, 'noEmitOnError should retain the old JS without accepting it');
  // Deliberately execute the stale output as a negative control, never as acceptance.
  const staleRuntime = app(patched.root);
  assert.deepEqual(staleRuntime.value, incrementalApp.value);
  const stale = { accepted: failedRebuild.exit === 0 && staleRuntime.exit === 0 };
  assert.equal(stale.accepted, false);
  report.cases.push({ id: 'stale-js-cannot-prove-build', expected: 'reject', compiler: '6.0.3', build: failedRebuild, staleRuntime, emittedJsUnchanged: true, accepted: stale.accepted });

  report.status = 'passed';
  report.completedAt = new Date().toISOString();
  console.log('PASS: TypeScript 5.9.2 -> 6.0.3, three npm workspaces, eight behavioral/build controls.');
} catch (error) {
  report.status = 'failed';
  report.error = { name: error.name, message: error.message };
  throw error;
} finally {
  if (output) {
    fs.mkdirSync(path.dirname(output), { recursive: true });
    writeJSON(output, report);
  }
  if (temporary) fs.rmSync(temporary, { recursive: true, force: true });
}
