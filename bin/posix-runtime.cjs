'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');

const targets = {
  'linux-x64': ['x86_64-unknown-linux-gnu', 'f2d2199eb25880e07863b391cf7124e7ffa1338b0d65600dfcec117c4223a7fb'],
  'linux-arm64': ['aarch64-unknown-linux-gnu', '55c00325f7c1fddf325dfc621aabdfbbac4dc54adda224af88ec411dc12db239'],
  'darwin-arm64': ['aarch64-apple-darwin', '7a2384641584ab9984221fcb0fc9265df465922af71be71410529e2a9c3f0540'],
};
const target = process.platform + '-' + process.arch;
const site = 'lib/python3.13/site-packages';
function sha(file) {
  return crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
}
function runtimeDigest(root) {
  const tree = crypto.createHash('sha256');
  function visit(relative) {
    const directory = path.join(root, relative);
    for (const name of fs.readdirSync(directory).sort()) {
      if (!relative && name === '.deploom-install.json') continue;
      const key = path.join(relative, name);
      const file = path.join(root, key);
      const stat = fs.lstatSync(file);
      let value;
      if (stat.isSymbolicLink()) value = fs.readlinkSync(file);
      else if (stat.isDirectory()) value = '';
      else if (stat.isFile()) value = sha(file);
      else throw Error('Unexpected runtime file type: ' + key);
      tree.update(JSON.stringify([key, stat.mode, value]) + '\n');
      if (stat.isDirectory()) visit(key);
    }
  }
  visit('');
  return tree.digest('hex');
}
function run(command, args) {
  execFileSync(command, args, { stdio: 'inherit', timeout: 600_000 });
}
function checkPlatform() {
  if (!targets[target]) throw Error('Unsupported runtime platform: ' + target);
  if (process.platform === 'linux' && !process.report.getReport().header.glibcVersionRuntime) {
    throw Error('The Linux distribution requires glibc');
  }
}
function verifyArchive(pkg) {
  const meta = JSON.parse(fs.readFileSync(path.join(pkg, 'posix-offline.json'), 'utf8'));
  const archive = path.join(pkg, 'portable-runtime.tar.gz');
  if (meta.target !== target || meta.version !== JSON.parse(fs.readFileSync(path.join(pkg, 'package.json'))).version ||
      !/^[a-f0-9]{64}$/.test(meta.sha256) || sha(archive) !== meta.sha256) {
    throw Error('Offline runtime target, version or digest mismatch');
  }
  return archive;
}
function buildRuntime(dir, pkg, scratch) {
  checkPlatform();
  const [triple, digest] = targets[target];
  const offline = path.join(pkg, 'posix-offline.json');
  if (fs.existsSync(offline)) {
    run('tar', ['-xzf', verifyArchive(pkg), '-C', dir]);
  } else {
    const archive = path.join(scratch, 'python.tar.gz');
    const url = 'https://github.com/astral-sh/python-build-standalone/releases/download/20261110/cpython-3.13.18%2B20261110-' + triple + '-install_only_stripped.tar.gz';
    try {
      run('curl', ['--fail', '--silent', '--show-error', '--location', '--retry', '3', '--proto', '=https', '--proto-redir', '=https', '-o', archive, url]);
    } catch (err) {
      if (err.code !== 'ENOENT') throw err;
      const flags = [];
      if (process.env.HTTPS_PROXY || process.env.https_proxy || process.env.ALL_PROXY || process.env.all_proxy) {
        if (!process.allowedNodeEnvironmentFlags.has('--use-env-proxy') ||
            !(process.env.HTTPS_PROXY || process.env.https_proxy)) {
          throw Error('Install curl to use the configured proxy, or use the offline runtime archive');
        }
        flags.push('--use-env-proxy');
      }
      run(process.execPath, [...flags, path.join(__dirname, 'download-runtime.cjs'), url, archive]);
    }
    if (sha(archive) !== digest) throw Error('CPython archive digest mismatch');
    run('tar', ['-xzf', archive, '-C', dir, '--strip-components=1']);
    const lib = path.join(dir, site);
    fs.writeFileSync(path.join(lib, '00_deploom_runtime.pth'), 'import sys; sys.dont_write_bytecode = True\ndeploom_mcp/_core\n');
    const python = path.join(dir, 'bin/python3.13');
    const pip = ['-I', '-B', '-m', 'pip', '--isolated', '--disable-pip-version-check'];
    run(python, [...pip, 'install', '--no-input', '--index-url', 'https://pypi.org/simple/', '--only-binary=:all:',
      '--no-compile', '--require-hashes', '-r', path.join(pkg, 'bin/posix-requirements.txt')]);
    run(python, [...pip, 'check']);
    fs.copyFileSync(path.join(pkg, 'bin/Z3-LICENSE.txt'), path.join(lib, 'z3', 'Z3-LICENSE.txt'));
  }
  // pip's shebang points into the staging directory, which is renamed after verification.
  const workspace = path.join(dir, 'bin/deploom-workspace');
  fs.writeFileSync(workspace, '#!/bin/sh\nexec "$(dirname "$0")/python3.13" -I -B -m deploom_mcp.workspace_edits "$@"\n');
  fs.chmodSync(workspace, 0o755);
  run(path.join(dir, 'bin/python3.13'), ['-I', '-B', '-c', 'from deploom_mcp import server; import z3; x=z3.Int("x"); s=z3.Solver(); s.add(x==17); assert s.check()==z3.sat and s.model()[x].as_long()==17']);
}
module.exports = { buildRuntime, checkPlatform, verifyArchive, target, sha, runtimeDigest };
