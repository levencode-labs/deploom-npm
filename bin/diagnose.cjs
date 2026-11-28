'use strict';
// Read the selected installed runtime. Never call setup, recover, a lock, or refresh.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { pythonBin, sitePackages, versionPattern, runtimeEnvironment } = require('./launch.cjs');
const clients = ['opencode', 'codex', 'claude'];

function readJson(file, limit = 16384) {
  const fd = fs.openSync(file, 'r');
  try {
    const buffer = Buffer.alloc(limit + 1);
    const size = fs.readSync(fd, buffer, 0, buffer.length, 0);
    if (size > limit) throw Error('Local metadata exceeds bound');
    return JSON.parse(buffer.subarray(0, size).toString('utf8'));
  } finally { fs.closeSync(fd); }
}

function expectedRelease(pkg, cliVersion) {
  const file = path.join(pkg, 'runtime-manifest.json');
  if (fs.existsSync(file)) {
    const value = readJson(file, 4000000);
    if (value.schema !== 1 || value.cliVersion !== cliVersion ||
        typeof value.mcpVersion !== 'string' || !versionPattern.test(value.mcpVersion) ||
        typeof value.coreRevision !== 'string' || !/^[a-f0-9]{40}$/.test(value.coreRevision) ||
        ('mcpWheelSha256' in value && (typeof value.mcpWheelSha256 !== 'string' || !/^[a-f0-9]{64}$/.test(value.mcpWheelSha256)))) {
      throw Error('Invalid packaged release metadata');
    }
    return { source: 'PACKAGED_RUNTIME_MANIFEST', mcpVersion: value.mcpVersion, coreRevision: value.coreRevision,
      wheelSha256: typeof value.mcpWheelSha256 === 'string' && /^[a-f0-9]{64}$/.test(value.mcpWheelSha256) ? value.mcpWheelSha256 : null };
  }
  try {
    const raw = fs.readFileSync(path.join(pkg, 'bin/posix-requirements.txt'), 'utf8');
    const match = /^deploom-mcp @ https:\/\/github\.com\/levencode-labs\/deploom-mcp\/releases\/download\/v([0-9]+\.[0-9]+\.[0-9]+)\/deploom_mcp-\1-py3-none-any\.whl --hash=sha256:[a-f0-9]{64}$/m.exec(raw);
    return { source: match ? 'PACKAGED_MCP_LOCK' : 'NOT_AVAILABLE', mcpVersion: match?.[1] || null, coreRevision: null };
  } catch { return { source: 'NOT_AVAILABLE', mcpVersion: null, coreRevision: null }; }
}

function diagnosticFailure(code, cli, selection, profiles) {
  return { ok: false, schemaVersion: 1, kind: 'installed-state', authority: 'DIAGNOSTIC_ONLY',
    readOnly: true, status: 'UNKNOWN', cli, selection, activeProfiles: profiles,
    runtime: { status: code }, sources: {}, selectedKnowledgeSnapshot: null,
    knowledgeStates: { prepared: { status: 'NOT_OBSERVED' }, published: { status: 'NOT_CHECKED' },
      local: { status: 'NOT_INSPECTED' } },
    nextActions: [{ code, action: code === 'RUNTIME_SELECTION_REQUIRED'
      ? 'Select one active profile with deploom diagnose --client codex|claude|opencode.'
      : code === 'RUNTIME_DIAGNOSTIC_UNSUPPORTED'
        ? 'Use a runtime supporting get_installed_state; this command does not install or upgrade it.'
        : 'Inspect the selected installation and repeat diagnostics after an explicitly authorized setup or repair.' }],
    requiresProjectVerification: true };
}

function installedState({ pkg, base, args, env = process.env }) {
  let json = false;
  let client = null;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--json' && !json) json = true;
    else if (args[i] === '--client' && client === null && clients.includes(args[i + 1])) client = args[++i];
    else throw Error('Usage: deploom diagnose [--json] [--client codex|claude|opencode]');
  }
  const version = require(path.join(pkg, 'package.json')).version;
  const cli = { version, source: 'RUNNING_NPM_CLI' };
  const profiles = {};
  for (const name of clients) {
    try {
      const profile = path.join(base, 'clients', name);
      const active = readJson(path.join(profile, 'active.json'));
      profiles[name] = { version: typeof active.version === 'string' && versionPattern.test(active.version)
        ? active.version : null, pendingTransaction: fs.existsSync(path.join(profile, 'transaction.json')) };
    } catch (error) {
      if (error.code !== 'ENOENT') profiles[name] = { version: null, status: 'INVALID_PROFILE' };
    }
  }
  let selectedVersion = version;
  let source = 'CLI_VERSION_RUNTIME';
  if (client !== null) {
    selectedVersion = profiles[client]?.version || null;
    source = 'SELECTED_ACTIVE_PROFILE';
  } else if (Object.keys(profiles).length) {
    const versions = new Set(Object.values(profiles).map(row => row.version));
    selectedVersion = versions.size === 1 && !versions.has(null) ? [...versions][0] : null;
    source = 'COMMON_ACTIVE_PROFILE';
  }
  const selection = { source, client, version: selectedVersion };
  const fail = code => ({ report: diagnosticFailure(code, cli, selection, profiles), json, exitCode: 1 });
  if (selectedVersion === null) return fail(client === null ? 'RUNTIME_SELECTION_REQUIRED' : 'ACTIVE_PROFILE_UNAVAILABLE');
  const runtime = path.join(base, 'versions', selectedVersion);
  const python = pythonBin(runtime);
  if (!fs.existsSync(python)) return fail('RUNTIME_UNAVAILABLE');
  const diagnostic = path.join(sitePackages(runtime), 'deploom_mcp/installed_diagnostics.py');
  if (!fs.existsSync(diagnostic)) return fail('RUNTIME_DIAGNOSTIC_UNSUPPORTED');
  const runtimeEnv = runtimeEnvironment(base, selectedVersion, env);
  const argv = ['-I', '-B', '-m', 'deploom_mcp.installed_diagnostics', '--json', '--cli-version', version,
    '--osv-directory', runtimeEnv.DEPLOOM_MCP_OSV_DIR,
    '--records-directory', runtimeEnv.DEPLOOM_MCP_RECORDS_DIR];
  let expected;
  try { expected = selectedVersion === version ? expectedRelease(pkg, version) : { source: 'NOT_AVAILABLE_FOR_SELECTED_PROFILE', mcpVersion: null, coreRevision: null }; }
  catch { return fail('PACKAGED_RELEASE_METADATA_INVALID'); }
  if (expected.mcpVersion) argv.push('--expected-mcp-version', expected.mcpVersion);
  if (expected.coreRevision) argv.push('--expected-core-revision', expected.coreRevision);
  let raw, exitCode = 0;
  try {
    raw = execFileSync(python, argv, { encoding: 'utf8', maxBuffer: 65536, timeout: 30000,
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'], env: runtimeEnv });
  } catch (error) {
    if (![1, 2].includes(error.status) || !error.stdout) return fail('RUNTIME_DIAGNOSTIC_FAILED');
    raw = String(error.stdout);
    exitCode = error.status;
  }
  try {
    const report = JSON.parse(raw);
    if (report?.kind !== 'installed-state' || report.schemaVersion !== 1 || report.readOnly !== true ||
        typeof report.runtime !== 'object' || typeof report.sources !== 'object' || !Array.isArray(report.nextActions)) {
      return fail('RUNTIME_DIAGNOSTIC_INVALID');
    }
    report.cli = cli;
    report.selection = selection;
    report.activeProfiles = profiles;
    report.expectedRelease = expected;
    if (expected.wheelSha256) {
      report.runtime.expectedPins ||= {};
      const observed = report.runtime.installOrigin?.archiveSha256;
      report.runtime.expectedPins.wheel = !observed ? 'NOT_OBSERVED' :
        observed === expected.wheelSha256 ? 'MATCH' : 'MISMATCH';
      if (observed && observed !== expected.wheelSha256) {
        report.ok = false;
        report.status = 'INCOMPATIBLE';
        report.runtime.status = 'INCOMPATIBLE';
        report.runtime.reasons = [...(report.runtime.reasons || []), 'CLI_MCP_WHEEL_DIGEST_MISMATCH'];
        report.nextActions.push({ code: 'CLI_MCP_WHEEL_DIGEST_MISMATCH',
          action: 'Compare the installed archive digest with the selected package release before acceptance.' });
        exitCode = 2;
      }
    }
    return { report, json, exitCode: report.ok ? exitCode : Math.max(1, exitCode) };
  } catch { return fail('RUNTIME_DIAGNOSTIC_INVALID'); }
}

function humanReadable(report) {
  const r = report.runtime;
  const lines = [`DepLoom installed state: ${report.status}`,
    `CLI ${report.cli.version}; selected runtime ${report.selection.version || 'unknown'} (${report.selection.source})`,
    `MCP ${r.mcpVersion || 'unknown'}; Core ${r.coreVersion || 'unknown'}; ${r.loadingSource || r.status}`];
  lines.push(`Install origin: ${r.installOrigin?.kind || 'UNKNOWN'} (installer metadata; publication not checked)`);
  if (r.coreRevision) lines.push(`Core pin: ${r.coreRevision} (${r.coreIntegrity})`);
  for (const [name, row] of Object.entries(report.sources)) {
    const id = row.revision === undefined ? (row.edition || '') : `revision ${row.revision}`;
    lines.push(`${name}: ${row.status} ${id}; ${row.freshness || row.reason || 'unknown'}; last refresh ${row.lastRefresh?.status || 'NOT_RECORDED'}`);
  }
  for (const [name, row] of Object.entries(report.activeProfiles)) {
    lines.push(`${name}: ${row.version || 'unknown'}${row.pendingTransaction ? ' (pending recovery; unchanged)' : ''}`);
  }
  lines.push('Publisher current edition: not checked. Prepared corpus: not observed.');
  lines.push(...report.nextActions.map(item => `Next: ${item.action}`));
  lines.push('Project verification is still required: check conditions, build, tests and affected user flows.');
  return lines.join('\n');
}

module.exports = { installedState, humanReadable };
