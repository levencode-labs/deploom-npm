'use strict';
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync, existsSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join } = require('node:path');
const semver = require('./p00/node_modules/semver');

const versions = ['12.22.12', '14.21.3', '16.20.2', '18.20.8', '20.0.0', '20.18.3',
  '20.19.0', '20.20.0', '21.7.3', '22.0.0', '22.12.0', '22.13.0', '22.22.1', '24.0.0', '24.14.0'];
function arm(group, name, version) {
  const alias = 'v-' + version.replaceAll('.', '-');
  const groupPath = join(__dirname, group);
  const defaultPath = join(groupPath, 'node_modules', alias);
  const specialGroup = group + '-v' + version.split('.')[0];
  const probe = join(__dirname, specialGroup, 'node_modules', ...name.split('/'));
  const special = existsSync(join(probe, 'package.json'));
  const root = special ? probe : defaultPath;
  const resolve = createRequire(join(root, 'package.json'));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, name);
  assert.equal(manifest.version, version);
  return { manifest, resolve, root, cwd: special ? join(__dirname, specialGroup) : groupPath,
    importName: special ? name : alias, js: () => require(root) };
}

function child(code, arg, args = []) {
  const result = spawnSync(process.execPath, [...args, '-e', code, arg.importName], {
    encoding: 'utf8', timeout: 20000, cwd: arg.cwd,
  });
  if (result.error) throw result.error;
  return result;
}

function engine(before, after) {
  const oldRange = before.manifest.engines?.node;
  const newRange = after.manifest.engines?.node;
  if (!oldRange || !newRange) return;
  const held = versions.find(v => semver.satisfies(v, oldRange) && !semver.satisfies(v, newRange));
  if (!held) return;
  assert(!semver.satisfies(held, newRange));
  const fixed = semver.satisfies(process.versions.node, newRange) ? process.versions.node : '26.0.0';
  assert(semver.satisfies(fixed, newRange));
  return ['node-engine-floor', { held, oldRange, newRange }];
}

function command(pkg, allow = false) {
  const program = new (pkg.js().Command)().exitOverride()
    .configureOutput({ writeErr() {} }).argument('[input]');
  if (allow) program.allowExcessArguments(true);
  program.parse(['input', 'extra'], { from: 'user' });
  return program.args;
}

function legacyConsole(pkg, modern = false) {
  const vc = new (pkg.js().VirtualConsole)();
  const calls = [];
  const sink = { log: (...args) => calls.push(args) };
  if (modern) vc.forwardTo(sink, { jsdomErrors: 'none' });
  else vc.sendTo(sink, { omitJSDOMErrors: true });
  vc.emit('log', 'test');
  return calls;
}

function windowValue(pkg, options, read) {
  const { window } = new (pkg.js().JSDOM)('<!doctype html><main><p>Sample</p></main>', options);
  try {
    return read(window);
  } finally {
    window.close();
  }
}

function quietOutput(arg, dir) {
  const env = Object.fromEntries(Object.entries(process.env).filter(([name]) => !/^DOTENV_/i.test(name)));
  const file = join(dir, '.env');
  writeFileSync(file, 'DEPLOOM_TEST=loaded\n');
  const result = spawnSync(process.execPath, ['-e', String.raw`const [name,file,mode] = process.argv.slice(1);
    const processEnv = {};
    const result = require(name).config({path:file,processEnv, ...(mode === "quiet" ? {quiet:true} : {})});
    if (result.error) throw result.error;
    console.log(processEnv.DEPLOOM_TEST);
  `, arg.importName, file, 'default'], { encoding: 'utf8', timeout: 20000, cwd: arg.cwd, env });
  const quiet = spawnSync(process.execPath, ['-e',
    'const out={};require(process.argv[1]).config({path:process.argv[2],processEnv:out,quiet:true});console.log(out.DEPLOOM_TEST)',
    arg.importName, file], { encoding: 'utf8', timeout: 20000, cwd: arg.cwd, env });
  assert.equal(result.status, 0, result.stderr);
  assert.equal(quiet.status, 0, quiet.stderr);
  assert.equal(quiet.stderr.trim(), '');
  assert.equal(quiet.stdout.trim(), 'loaded');
  return { stdout: result.stdout.trim(), stderr: result.stderr.trim() };
}

module.exports = { arm, child, engine, command, legacyConsole, windowValue, quietOutput };
