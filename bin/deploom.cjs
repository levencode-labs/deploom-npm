#!/usr/bin/env node
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const { versionPattern, withLock, pythonBin, sitePackages, read, writeAtomic, checkPath, recover } = require('./launch.cjs');
const { execFileSync } = require('node:child_process');
const { prepareConfig } = require('./client-config.cjs');
const { verifyRuntime } = require('./verify-runtime.cjs');

const pkg = path.join(__dirname, '..');
const dataHome = process.platform === 'win32' ? process.env.LOCALAPPDATA || os.homedir()
  : process.env.XDG_DATA_HOME || path.join(os.homedir(), process.platform === 'darwin' ? 'Library/Application Support' : '.local/share');
const base = path.join(dataHome, 'DepLoom', 'public');
const [command, client] = process.argv.slice(2);
function versionDir(version) {
  if (!versionPattern.test(version)) throw Error('Invalid release version');
  return path.join(base, 'versions', version);
}
function prepareRuntime(version) {
  const dest = versionDir(version);
  if (process.platform !== 'win32') {
    const installer = require('./posix-runtime.cjs');
    const stamp = path.join(dest, '.deploom-install.json');
    const receipt = dir => JSON.stringify({ version, target: installer.target,
      lock: installer.sha(path.join(pkg, 'bin/posix-requirements.txt')), tree: installer.runtimeDigest(dir) });
    if (fs.existsSync(dest)) {
      if (read(stamp, null) !== receipt(dest) || !fs.existsSync(pythonBin(dest))) throw Error('Installed runtime is incomplete');
      return;
    }
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    const work = fs.mkdtempSync(dest + '-stage-');
    try {
      const runtime = path.join(work, 'runtime');
      fs.mkdirSync(runtime);
      installer.buildRuntime(runtime, pkg, work);
      fs.writeFileSync(path.join(runtime, '.deploom-install.json'), receipt(runtime), { flag: 'wx' });
      fs.renameSync(runtime, dest);
    } finally { fs.rmSync(work, { recursive: true, force: true }); }
    return;
  }
  const manifest = require('../runtime-manifest.json');
  if (manifest.cliVersion !== version) throw Error('CLI and runtime manifest differ');
  if (fs.existsSync(dest)) {
    verifyRuntime(dest, manifest);
    return;
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  const stage = fs.mkdtempSync(dest + '-stage-');
  try {
    fs.cpSync(path.join(pkg, 'runtime'), stage, { recursive: true });
    verifyRuntime(stage, manifest);
    execFileSync(path.join(stage, 'python.exe'), ['-I', '-B', '-c', 'import deploom_mcp.server'], { windowsHide: true });
    fs.renameSync(stage, dest);
  } finally { fs.rmSync(stage, { recursive: true, force: true }); }
}
function skillFiles(version) {
  return path.join(sitePackages(versionDir(version)), 'deploom_mcp/resources/skills/deploom-upgrade');
}
function preserveExtras(source, target, previous) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    const old = path.join(previous, entry.name);
    if (entry.isSymbolicLink()) throw Error('Linked Skill entry: ' + from);
    if (entry.isDirectory()) {
      fs.mkdirSync(to, { recursive: true });
      preserveExtras(from, to, old);
    } else if (!fs.existsSync(old) && entry.name !== '.deploom-skill-install.json') {
      if (!entry.isFile() || fs.existsSync(to)) throw Error('New Skill conflicts with a user file: ' + from);
      fs.copyFileSync(from, to, fs.constants.COPYFILE_EXCL);
    }
  }
}
function compareSkill(source, target) {
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const from = path.join(source, entry.name);
    const to = path.join(target, entry.name);
    const stat = fs.lstatSync(to, { throwIfNoEntry: false });
    if (entry.isDirectory() && stat?.isDirectory()) compareSkill(from, to);
    else if (!entry.isFile() || !stat?.isFile() || !fs.readFileSync(from).equals(fs.readFileSync(to))) {
      throw Error('Installed Skill has local changes: ' + to);
    }
  }
}
function installSkill(version, stage) {
  const bundle = path.join(sitePackages(versionDir(version)), 'deploom_mcp/resources/scripts/install_skill.py');
  execFileSync(pythonBin(versionDir(version)), ['-I', '-B', bundle, '--target', stage, '--force', '--verify'], { windowsHide: true });
}
function activate(profile) {
  recover(profile);
  const statePath = path.join(profile, 'active.json');
  const old = JSON.parse(read(statePath, 'null'));
  const version = command === 'rollback' ? old?.previous : require('../package.json').version;
  if (!version) throw Error('No previous release to restore');
  if (command === 'setup') prepareRuntime(version);
  const launch = path.join(profile, 'launch.cjs');
  writeAtomic(launch, fs.readFileSync(path.join(__dirname, 'launch.cjs')));
  const scratch = fs.mkdtempSync(path.join(profile, 'config-'));
  try {
    const cfg = prepareConfig(client, launch, scratch);
    checkPath(cfg.file);
    checkPath(cfg.skill);
    const hadSkill = fs.existsSync(cfg.skill);
    if (old && old.skill !== cfg.skill) throw Error('Profile Skill directory changed');
    if (hadSkill) {
      if (!old) throw Error('A Skill already exists in ' + cfg.skill);
      compareSkill(skillFiles(old.version), cfg.skill);
    }
    if (old?.version === version && hadSkill && cfg.before === cfg.after) return;
    const id = crypto.randomUUID();
    const stage = cfg.skill + '.stage-' + id;
    const backup = cfg.skill + '.previous-' + id;
    const tx = { id, skill: cfg.skill, stage, backup, hadSkill, config: cfg.file,
      hadConfig: fs.existsSync(cfg.file), before: cfg.before, after: cfg.after };
    fs.mkdirSync(path.dirname(cfg.skill), { recursive: true });
    fs.mkdirSync(stage);
    try {
      installSkill(version, stage);
      if (hadSkill) preserveExtras(cfg.skill, stage, skillFiles(old.version));
      const receiptPath = path.join(stage, '.deploom-skill-install.json');
      const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
      receipt.target = cfg.skill;
      writeAtomic(receiptPath, JSON.stringify(receipt, null, 2) + '\n');
      const beforeSave = read(cfg.file, null);
      if (beforeSave !== (tx.hadConfig ? cfg.before : null)) throw Error('Client settings changed; retry setup');
      writeAtomic(path.join(profile, 'transaction.json'), JSON.stringify(tx));
      if (hadSkill) fs.renameSync(cfg.skill, backup);
      fs.renameSync(stage, cfg.skill);
      if (cfg.before !== cfg.after) writeAtomic(cfg.file, cfg.after);
      writeAtomic(statePath, JSON.stringify({ version, previous: old?.version === version ? old.previous : old?.version,
        skill: cfg.skill, transaction: id }));
    } finally {
      recover(profile);
      fs.rmSync(stage, { recursive: true, force: true });
    }
  } finally { fs.rmSync(scratch, { recursive: true, force: true }); }
}
function collectVersions() {
  const clients = path.join(base, 'clients');
  const keep = new Set();
  for (const client of ['opencode', 'codex', 'claude']) {
    const profile = path.join(clients, client);
    if (fs.existsSync(path.join(profile, 'transaction.json'))) return;
    const state = JSON.parse(read(path.join(profile, 'active.json'), 'null'));
    if (state) {
      if (!versionPattern.test(state.version) || (state.previous && !versionPattern.test(state.previous))) return;
      keep.add(state.version);
      keep.add(state.previous);
    }
  }
  const versions = path.join(base, 'versions');
  for (const entry of fs.readdirSync(versions, { withFileTypes: true })) {
    if (!entry.isDirectory() || !versionPattern.test(entry.name) || keep.has(entry.name)) continue;
    const runs = path.join(base, 'running', entry.name);
    if (fs.existsSync(runs) && fs.readdirSync(runs).some(name => {
      // A launcher interrupted before recording its child PID cannot prove the runtime is idle.
      if (!/^[1-9]\d*$/.test(name)) return true;
      try { process.kill(Number(name), 0); return true; }
      catch (error) {
        if (error.code !== 'ESRCH') return true;
        fs.rmSync(path.join(runs, name), { force: true });
        return false;
      }
    })) continue;
    const source = versionDir(entry.name);
    if (!fs.existsSync(path.join(sitePackages(source), 'deploom_mcp/__init__.py'))) continue;
    const retired = path.join(versions, '.retired-' + crypto.randomUUID());
    try { fs.renameSync(source, retired); }
    catch (error) { if (['EBUSY', 'EPERM', 'EACCES'].includes(error.code)) continue; throw error; }
    fs.rmSync(retired, { recursive: true, force: true, maxRetries: 3 });
  }
}

async function main() {
  if (command === 'diagnose') {
    const { installedState, humanReadable } = require('./diagnose.cjs');
    const result = installedState({ pkg, base, args: process.argv.slice(3) });
    console.log(result.json ? JSON.stringify(result.report) : humanReadable(result.report));
    process.exitCode = result.exitCode;
    return;
  }
  if (command === 'diagnose-coverage') {
    const version = require('../package.json').version;
    const python = pythonBin(versionDir(version));
    if (!fs.existsSync(python)) {
      throw Error('DepLoom ' + version + ' runtime is missing. Run setup with this CLI version first.');
    }
    try {
      execFileSync(python, ['-I', '-B', '-m', 'deploom_mcp.coverage_diagnosis', ...process.argv.slice(3)],
        { stdio: 'inherit', windowsHide: true });
    } catch (error) {
      if (typeof error.status !== 'number') throw error;
      process.exitCode = error.status;
    }
    return;
  }
  if (command === 'cache' && client === 'status' && process.argv.length === 4) {
    const root = process.env.DEPLOOM_MCP_OSV_DIR || path.join(base, 'cache', 'osv');
    const result = await require('./cache-status.cjs').cacheStatus(root);
    console.log(JSON.stringify(result));
    if (!['fresh', 'expiring'].includes(result.status)) process.exitCode = 1;
    return;
  }
  const refreshCache = command === 'cache' && client === 'refresh';
  if (refreshCache && process.env.DEPLOOM_MCP_LOCAL_CACHE_ONLY === '1') {
    throw Error('Cache refresh disabled by DEPLOOM_MCP_LOCAL_CACHE_ONLY');
  }
  const clientCommand = ['setup', 'rollback'].includes(command) && ['opencode', 'codex', 'claude'].includes(client);
  if ((!refreshCache && !clientCommand) || process.argv.length !== 4) {
    throw Error('Usage: deploom <setup|rollback> <opencode|codex|claude>, deploom cache <refresh|status>, deploom diagnose [--json] [--client codex|claude|opencode], or deploom diagnose-coverage <result.json> [options]');
  }
  if (process.platform === 'win32') {
    if (process.arch !== 'x64') throw Error('Windows x64 is required');
  } else require('./posix-runtime.cjs').checkPlatform();
  const profile = path.join(base, 'clients', client);
  if (!refreshCache) fs.mkdirSync(profile, { recursive: true });
  await withLock(base, async () => {
    if (refreshCache) {
      const version = require('../package.json').version;
      prepareRuntime(version);
      execFileSync(pythonBin(versionDir(version)),
        ['-I', '-B', '-m', 'deploom_mcp.public_cache', path.join(base, 'cache', 'osv')],
        { stdio: 'inherit', windowsHide: true });
      return;
    }
    activate(profile);
    console.log('DepLoom ready for ' + client + '. Restart the client to load the Skill.');
    collectVersions();
  });
}
main().catch(err => { console.error(err.message); process.exitCode = 1; });
