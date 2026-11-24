'use strict';

const assert = require('node:assert/strict');
const { once } = require('node:events');
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join, resolve } = require('node:path');

const arms = resolve(process.argv[2] ?? __dirname);
// Chokidar 3 can interpret glob metacharacters in the Windows sandbox temp path.
const work = mkdtempSync(join(arms, '.watch-'));

function loadWatcher(arm, version) {
  const root = join(arms, arm);
  const pkg = JSON.parse(readFileSync(join(root, 'node_modules', 'chokidar', 'package.json'), 'utf8'));
  assert.equal(pkg.version, version);
  return createRequire(join(root, 'package.json'))('chokidar');
}

function createFiles() {
  mkdirSync(join(work, 'sessions', 'folder.txt'), { recursive: true });
  writeFileSync(join(work, 'sessions', 'folder.txt', 'included.jsonl'), '{}\n');
  writeFileSync(join(work, 'sessions', 'folder.txt', 'excluded.md'), '# not a session\n');
  writeFileSync(join(work, 'outside.jsonl'), '{}\n');
}

async function initialEvents(chokidar, paths, ignored) {
  const files = [];
  const watcher = chokidar.watch(paths, { cwd: work, ignoreInitial: false, ignored });
  watcher.on('add', path => files.push(path.replace(/\\/g, '/')));
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), 10000);
  try {
    await once(watcher, 'ready', { signal: deadline.signal });
    return files.sort();
  } finally {
    clearTimeout(timer);
    await watcher.close();
  }
}

async function main() {
  createFiles();
  const before = loadWatcher('before', '3.6.0');
  const after = loadWatcher('after', '4.0.3');
  const glob = 'sessions/**/*.jsonl';
  const expected = ['sessions/folder.txt/included.jsonl'];

  assert.deepEqual(await initialEvents(before, glob), expected);
  const held = await initialEvents(after, glob);
  assert.deepEqual(held, []);

  const ignoreNonSessions = (path, stats) => Boolean(stats?.isFile()) && !path.endsWith('.jsonl');
  assert.deepEqual(await initialEvents(after, 'sessions', ignoreNonSessions), expected);
  console.log('Chokidar 3.6.0 discovers nested JSONL files via the glob; 4.0.3 needs the directory and file filter.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  assert.equal(dirname(resolve(work)), arms);
  rmSync(work, { recursive: true, force: true });
});
