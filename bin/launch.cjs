'use strict';
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const os = require('node:os');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const versionPattern = /^\d+\.\d+\.\d+(?:-[a-z0-9]+(?:\.[a-z0-9]+)*)?$/i;

function pythonBin(runtime) {
  return path.join(runtime, process.platform === 'win32' ? 'python.exe' : 'bin/python3.13');
}
function sitePackages(runtime) {
  return path.join(runtime, process.platform === 'win32' ? 'Lib/site-packages' : 'lib/python3.13/site-packages');
}

async function withLock(base, action) {
  const key = crypto.createHash('sha256').update(base.toLowerCase()).digest('hex');
  const server = net.createServer(socket => socket.destroy());
  const timeout = Date.now() + 120_000;
  for (;;) {
    try {
      await new Promise((resolve, reject) => {
        function ready() { server.off('error', failed); resolve(); }
        function failed(error) { server.off('listening', ready); reject(error); }
        server.once('error', failed);
        server.once('listening', ready);
        if (process.platform === 'win32') server.listen('\\\\.\\pipe\\deploom-' + key);
        else {
          // A loopback listener releases the lock on process death, including on macOS.
          server.listen({ host: '127.0.0.1', port: 16384 + parseInt(key.slice(0, 8), 16) % 45000 });
        }
      });
      break;
    } catch (error) {
      if (error.code !== 'EADDRINUSE' || Date.now() >= timeout) throw error;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
  try { return await action(); } finally { server.close(); }
}

function read(file, fallback) {
  try { return fs.readFileSync(file, 'utf8'); }
  catch (err) { if (err.code !== 'ENOENT') throw err; return fallback; }
}

function locations(client) {
  const home = os.homedir();
  if (client === 'codex') return {
    file: path.resolve(process.env.CODEX_HOME || path.join(home, '.codex'), 'config.toml'),
    skill: path.join(home, '.agents', 'skills', 'deploom-upgrade'),
  };
  if (client === 'claude') return {
    file: path.resolve(process.env.CLAUDE_CONFIG_DIR || home, '.claude.json'),
    skill: path.resolve(process.env.CLAUDE_CONFIG_DIR || path.join(home, '.claude'), 'skills', 'deploom-upgrade'),
  };
  if (client !== 'opencode') throw Error('Unknown client');
  const dir = process.env.OPENCODE_CONFIG_DIR || path.join(process.env.XDG_CONFIG_HOME || path.join(home, '.config'), 'opencode');
  const choices = ['opencode.json', 'opencode.jsonc'].map(name => path.join(dir, name)).filter(fs.existsSync);
  if (!process.env.OPENCODE_CONFIG && choices.length > 1) throw Error('Select a config with OPENCODE_CONFIG');
  return {
    file: path.resolve(process.env.OPENCODE_CONFIG || choices[0] || path.join(dir, 'opencode.jsonc')),
    skill: path.resolve(dir, 'skills', 'deploom-upgrade'),
  };
}

function writeAtomic(file, data) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = file + '.' + crypto.randomUUID();
  try {
    fs.writeFileSync(tmp, data, { flag: 'wx' });
    fs.renameSync(tmp, file);
  } finally { fs.rmSync(tmp, { force: true }); }
}
function checkPath(file) {
  for (let current = path.resolve(file); ; current = path.dirname(current)) {
    if (fs.lstatSync(current, { throwIfNoEntry: false })?.isSymbolicLink()) {
      throw Error('Client path contains a link: ' + current);
    }
    if (current === path.dirname(current)) break;
  }
}

function recover(profile) {
  const file = path.join(profile, 'transaction.json');
  if (!fs.existsSync(file)) return;
  const tx = JSON.parse(fs.readFileSync(file, 'utf8'));
  const expected = locations(path.basename(profile));
  checkPath(expected.file);
  checkPath(expected.skill);
  if (typeof tx.id !== 'string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(tx.id) ||
      tx.config !== expected.file || tx.skill !== expected.skill ||
      tx.stage !== expected.skill + '.stage-' + tx.id || tx.backup !== expected.skill + '.previous-' + tx.id ||
      typeof tx.hadSkill !== 'boolean' || typeof tx.hadConfig !== 'boolean' ||
      typeof tx.before !== 'string' || typeof tx.after !== 'string') {
    throw Error('Cannot recover transaction: client paths or journal changed');
  }
  const state = JSON.parse(read(path.join(profile, 'active.json'), 'null'));
  if (state?.transaction !== tx.id) {
    if (fs.existsSync(tx.backup) || (!tx.hadSkill && !fs.existsSync(tx.stage))) {
      if (fs.existsSync(tx.skill)) fs.renameSync(tx.skill, tx.stage);
      if (fs.existsSync(tx.backup)) fs.renameSync(tx.backup, tx.skill);
    }
    if (tx.before !== tx.after && read(tx.config, null) === tx.after) {
      if (tx.hadConfig) writeAtomic(tx.config, tx.before);
      else fs.unlinkSync(tx.config);
    }
  }
  fs.rmSync(tx.stage, { recursive: true, force: true });
  fs.rmSync(tx.backup, { recursive: true, force: true });
  fs.unlinkSync(file);
}
function runtimeEnvironment(base, version, source = process.env) {
  const env = { ...source, DEPLOOM_CLI_VERSION: version };
  if (env.DEPLOOM_MCP_LOCAL_CACHE_ONLY === '1') {
    // LOCAL_CACHE_ONLY already blocks network; an explicit host disable stays
    // intact, but must not be synthesized to suppress verified local knowledge.
    env.DEPLOOM_MCP_MIGRATION_OFFLINE = '1';
  }
  env.DEPLOOM_MCP_PUBLIC_ADVISORY_FALLBACK ??= '1';
  env.DEPLOOM_MCP_OSV_DIR ||= path.join(base, 'cache', 'osv');
  env.DEPLOOM_MCP_RECORDS_DIR ||= path.join(base, 'cache', 'records');
  return env;
}

async function launch(profile) {
  const base = path.resolve(profile, '../..');
  await withLock(base, async () => {
    recover(profile);
    const { version } = JSON.parse(fs.readFileSync(path.join(profile, 'active.json'), 'utf8'));
    if (typeof version !== 'string' || !versionPattern.test(version)) throw Error('Invalid active version');
    const runtime = path.join(base, 'versions', version);
    const env = runtimeEnvironment(base, version);
    const leases = path.join(base, 'running', version);
    fs.mkdirSync(leases, { recursive: true });
    const starting = path.join(leases, 'starting-' + crypto.randomUUID());
    fs.writeFileSync(starting, '', { flag: 'wx' });
    const child = spawn(pythonBin(runtime), ['-I', '-B', '-m', 'deploom_mcp'], {
      stdio: 'inherit', windowsHide: true, env,
    });
    try {
      await new Promise((resolve, reject) => {
        child.once('spawn', resolve);
        child.once('error', reject);
      });
    } catch (error) {
      fs.unlinkSync(starting);
      throw error;
    }
    const lease = path.join(leases, String(child.pid));
    fs.renameSync(starting, lease);
    child.once('exit', code => {
      fs.rmSync(lease, { force: true });
      process.exitCode = code ?? 1;
    });
  });
}

module.exports = { runtimeEnvironment, versionPattern, withLock, pythonBin, sitePackages, locations, read, writeAtomic, checkPath, recover };
if (require.main === module) launch(__dirname).catch(err => { console.error(err.message); process.exitCode = 1; });
