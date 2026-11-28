'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pythonBin, sitePackages } = require('../bin/launch.cjs');
const cli = path.join(__dirname, '../bin/deploom.cjs');
const version = require('../package.json').version;

function fixture(t) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'deploom-installed-diagnostic-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const data = path.join(root, 'data');
  const base = path.join(data, 'DepLoom/public');
  const env = { ...process.env, XDG_DATA_HOME: data, LOCALAPPDATA: data };
  const run = (args, harness) => spawnSync(process.execPath,
    [...(harness ? ['--require', harness] : []), cli, 'diagnose', ...args], { env, encoding: 'utf8' });
  function runtime(v = version, diagnostics = true) {
    const directory = path.join(base, 'versions', v);
    const python = pythonBin(directory);
    fs.mkdirSync(path.dirname(python), { recursive: true });
    fs.writeFileSync(python, '');
    if (diagnostics) {
      const module = path.join(sitePackages(directory), 'deploom_mcp/installed_diagnostics.py');
      fs.mkdirSync(path.dirname(module), { recursive: true });
      fs.writeFileSync(module, '# fixture');
    }
    return python;
  }
  function profile(name, v, pending = false) {
    const dir = path.join(base, 'clients', name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'active.json'), JSON.stringify({ version: v, skill: 'secret-private-config' }));
    if (pending) fs.writeFileSync(path.join(dir, 'transaction.json'), 'secret-pending-transaction');
  }
  function harness(source) {
    const file = path.join(root, 'preload.cjs');
    fs.writeFileSync(file, source + `
      const fs = require('node:fs');
      for (const name of ['mkdirSync', 'writeFileSync', 'renameSync', 'rmSync', 'unlinkSync']) {
        fs[name] = () => { throw Error('diagnostic mutated the filesystem'); };
      }
      require('node:net').createServer = () => { throw Error('diagnostic acquired a lock'); };
      require('node:https').get = () => { throw Error('diagnostic requested network'); };
    `);
    return file;
  }
  return { root, data, base, env, run, runtime, profile, harness };
}

function successfulProbe(expectedPython, expectedVersion) {
  return `
    const assert = require('node:assert/strict');
    require('node:child_process').execFileSync = (command, args, options) => {
      assert.equal(command, ${JSON.stringify(expectedPython)});
      assert.deepEqual(args.slice(0, 6), ['-I', '-B', '-m', 'deploom_mcp.installed_diagnostics', '--json', '--cli-version']);
      assert.equal(args[6], ${JSON.stringify(version)});
      assert.equal(options.env.DEPLOOM_CLI_VERSION, ${JSON.stringify(expectedVersion)});
      assert.equal(options.stdio[0], 'ignore');
      assert.equal(options.maxBuffer, 65536);
      assert.ok(args.includes('--osv-directory'));
      assert.ok(args.includes('--records-directory'));
      return JSON.stringify({ok:true, schemaVersion:1, kind:'installed-state', readOnly:true,
        authority:'DIAGNOSTIC_ONLY', status:'READY', runtime:{mcpVersion:'0.2.34',coreVersion:'0.1.22',
        status:'READY',loadingSource:'INSTALLED_WHEEL'}, sources:{}, nextActions:[]});
    };`;
}

test('missing runtime returns structured local status and creates nothing', t => {
  const f = fixture(t);
  const result = f.run(['--json']);
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).runtime.status, 'RUNTIME_UNAVAILABLE');
  assert.equal(fs.existsSync(f.data), false);
});

test('diagnostic invokes only the selected installed runtime with isolation and no writes', t => {
  const f = fixture(t);
  const python = f.runtime();
  f.profile('codex', version, true);
  const pending = path.join(f.base, 'clients/codex/transaction.json');
  const before = fs.readFileSync(pending);
  const result = f.run(['--client', 'codex', '--json'], f.harness(successfulProbe(python, version)));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.selection.source, 'SELECTED_ACTIVE_PROFILE');
  assert.equal(report.activeProfiles.codex.pendingTransaction, true);
  assert.equal(report.cli.version, version);
  assert.equal(report.runtime.mcpVersion, '0.2.34');
  assert.equal(report.runtime.loadingSource, 'INSTALLED_WHEEL');
  assert.equal(fs.readFileSync(pending).equals(before), true);
  assert.doesNotMatch(result.stdout, /secret-private-config|secret-pending-transaction/);
});

test('a common active version is selected even when the invoking CLI is newer', t => {
  const f = fixture(t);
  const old = '0.2.29';
  const python = f.runtime(old);
  f.profile('codex', old);
  f.profile('claude', old);
  const result = f.run(['--json'], f.harness(successfulProbe(python, old)));
  assert.equal(result.status, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.selection.version, old);
  assert.equal(report.selection.source, 'COMMON_ACTIVE_PROFILE');
  assert.equal(report.cli.version, version);
});

test('different active versions require an explicit profile without inspecting arbitrary config', t => {
  const f = fixture(t);
  f.profile('codex', '0.2.29');
  f.profile('claude', version);
  const result = f.run(['--json'], f.harness(`require('node:child_process').execFileSync = () => { throw Error('unexpected runtime'); };`));
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).runtime.status, 'RUNTIME_SELECTION_REQUIRED');
  assert.doesNotMatch(result.stdout, /secret-private-config/);
});

test('old runtime is explicit and human output gives a concrete next step', t => {
  const f = fixture(t);
  f.runtime(version, false);
  const result = f.run([]);
  assert.equal(result.status, 1);
  assert.match(result.stdout, /RUNTIME_DIAGNOSTIC_UNSUPPORTED/);
  assert.match(result.stdout, /get_installed_state/);
  assert.match(result.stdout, /Project verification is still required/);
  assert.equal(result.stderr, '');
});

test('runtime stderr and malformed output cannot leak credentials', t => {
  const f = fixture(t);
  f.runtime();
  const result = f.run(['--json'], f.harness(`require('node:child_process').execFileSync = () => {
    throw Object.assign(new Error('credential-should-not-leak'), {status:2, stdout:'credential-should-not-leak', stderr:'secret'});
  };`));
  assert.equal(result.status, 1);
  assert.equal(JSON.parse(result.stdout).runtime.status, 'RUNTIME_DIAGNOSTIC_INVALID');
  assert.doesNotMatch(result.stdout + result.stderr, /credential-should-not-leak|secret/);
});

test('invalid arguments never initialize a runtime', t => {
  const f = fixture(t);
  const result = f.run(['--client', 'unknown']);
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Usage: deploom diagnose/);
  assert.equal(fs.existsSync(f.data), false);
});


test('packaged release pins are passed to the installed diagnostic when available', t => {
  const f = fixture(t);
  const python = f.runtime();
  const pkg = path.join(f.root, 'package');
  fs.mkdirSync(pkg);
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(pkg, 'runtime-manifest.json'), JSON.stringify({
    schema: 1, cliVersion: version, mcpVersion: '0.2.34', coreRevision: 'a'.repeat(40), mcpWheelSha256: 'c'.repeat(64) }));
  const source = successfulProbe(python, version).replace("return JSON.stringify", `
    assert.equal(args[args.indexOf('--expected-mcp-version') + 1], '0.2.34');
    assert.equal(args[args.indexOf('--expected-core-revision') + 1], 'a'.repeat(40));
    return JSON.stringify`);
  const harness = f.harness(source);
  const module = path.join(__dirname, '../bin/diagnose.cjs');
  const runner = `const value = require(${JSON.stringify(module)}).installedState({
    pkg:${JSON.stringify(pkg)},base:${JSON.stringify(f.base)},args:['--json']});
    console.log(JSON.stringify(value.report)); process.exitCode=value.exitCode;`;
  const result = spawnSync(process.execPath, ['--require', harness, '-e', runner], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(JSON.parse(result.stdout).expectedRelease.source, 'PACKAGED_RUNTIME_MANIFEST');
  assert.equal(JSON.parse(result.stdout).expectedRelease.coreRevision, 'a'.repeat(40));
  assert.equal(JSON.parse(result.stdout).runtime.expectedPins.wheel, 'NOT_OBSERVED');
});

test('cache-only mode keeps verified local knowledge enabled and preserves explicit host disable', () => {
  const { runtimeEnvironment } = require('../bin/launch.cjs');
  const initial = { DEPLOOM_MCP_LOCAL_CACHE_ONLY: '1' };
  const selected = runtimeEnvironment('/unused/readonly-base', version, initial);
  assert.equal(selected.DEPLOOM_MCP_LOCAL_CACHE_ONLY, '1');
  assert.equal(selected.DEPLOOM_MCP_MIGRATION_OFFLINE, '1');
  assert.equal(selected.DEPLOOM_MCP_DISABLE_EXTERNAL_EVIDENCE, undefined,
    'cache-only must block network without also disabling verified cached knowledge');
  assert.deepEqual(initial, { DEPLOOM_MCP_LOCAL_CACHE_ONLY: '1' });
  const restricted = runtimeEnvironment('/unused/readonly-base', version,
    { ...initial, DEPLOOM_MCP_DISABLE_EXTERNAL_EVIDENCE: '1' });
  assert.equal(restricted.DEPLOOM_MCP_DISABLE_EXTERNAL_EVIDENCE, '1');
});


test('an observed wheel archive digest must match the packaged expected digest', t => {
  const f = fixture(t);
  const python = f.runtime();
  const pkg = path.join(f.root, 'package');
  fs.mkdirSync(pkg);
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(pkg, 'runtime-manifest.json'), JSON.stringify({ schema: 1, cliVersion: version,
    mcpVersion: '0.2.34', coreRevision: 'a'.repeat(40), mcpWheelSha256: 'a'.repeat(64) }));
  const source = successfulProbe(python, version).replace("loadingSource:'INSTALLED_WHEEL'",
    "loadingSource:'INSTALLED_WHEEL',installOrigin:{archiveSha256:'b'.repeat(64)}");
  const module = path.join(__dirname, '../bin/diagnose.cjs');
  const runner = `const value = require(${JSON.stringify(module)}).installedState({
    pkg:${JSON.stringify(pkg)},base:${JSON.stringify(f.base)},args:['--json']});
    console.log(JSON.stringify(value.report)); process.exitCode=value.exitCode;`;
  const result = spawnSync(process.execPath, ['--require', f.harness(source), '-e', runner], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 2, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.runtime.expectedPins.wheel, 'MISMATCH');
  assert.equal(report.status, 'INCOMPATIBLE');
  assert.ok(report.runtime.reasons.includes('CLI_MCP_WHEEL_DIGEST_MISMATCH'));
});


test('malformed packaged wheel hash is not silently treated as an absent expected pin', t => {
  const f = fixture(t);
  f.runtime();
  const pkg = path.join(f.root, 'package');
  fs.mkdirSync(pkg);
  fs.writeFileSync(path.join(pkg, 'package.json'), JSON.stringify({ version }));
  fs.writeFileSync(path.join(pkg, 'runtime-manifest.json'), JSON.stringify({ schema: 1, cliVersion: version,
    mcpVersion: '0.2.34', coreRevision: 'a'.repeat(40), mcpWheelSha256: 'invalid-secret-hash' }));
  const module = path.join(__dirname, '../bin/diagnose.cjs');
  const runner = `const value = require(${JSON.stringify(module)}).installedState({
    pkg:${JSON.stringify(pkg)},base:${JSON.stringify(f.base)},args:['--json']});
    console.log(JSON.stringify(value.report)); process.exitCode=value.exitCode;`;
  const harness = f.harness("require('node:child_process').execFileSync = () => { throw Error('unexpected runtime'); };");
  const result = spawnSync(process.execPath, ['--require', harness, '-e', runner], { env: f.env, encoding: 'utf8' });
  assert.equal(result.status, 1, result.stderr);
  assert.equal(JSON.parse(result.stdout).runtime.status, 'PACKAGED_RELEASE_METADATA_INVALID');
  assert.doesNotMatch(result.stdout + result.stderr, /invalid-secret-hash/);
});
