'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { download } = require('../bin/download-runtime.cjs');

test('runtime download follows HTTPS redirects and writes exact bytes', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'runtime-download-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const urls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(options.redirect, 'manual');
    urls.push(url);
    return urls.length === 1 ? Response.redirect('https://assets.example/file') : new Response('runtime');
  });
  const file = path.join(dir, 'archive');
  await download('https://release.example/file', file);
  assert.deepEqual(urls, ['https://release.example/file', 'https://assets.example/file']);
  assert.equal(fs.readFileSync(file, 'utf8'), 'runtime');
});

test('installer without curl uses Node and checks the archive before extraction', {
  skip: process.platform === 'win32' || !['arm64', 'x64'].includes(process.arch)
}, t => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'no-curl-'));
  t.after(() => fs.rmSync(temp, { recursive: true, force: true }));
  const commands = [];
  t.mock.method(require('node:child_process'), 'execFileSync', (command, args) => {
    commands.push(command);
    if (command === 'curl') throw Object.assign(Error('missing curl'), { code: 'ENOENT' });
    assert.equal(command, process.execPath);
    assert.equal(path.basename(args.at(-3)), 'download-runtime.cjs');
    fs.writeFileSync(args.at(-1), 'unexpected bytes');
  });
  for (const key of ['HTTPS_PROXY', 'https_proxy', 'ALL_PROXY', 'all_proxy']) {
    const prior = process.env[key];
    delete process.env[key];
    if (prior !== undefined) t.after(() => { process.env[key] = prior; });
  }
  const modulePath = require.resolve('../bin/posix-runtime.cjs');
  delete require.cache[modulePath];
  try {
    const { buildRuntime } = require(modulePath);
    assert.throws(() => buildRuntime(temp, temp, temp), /archive digest mismatch/);
    assert.deepEqual(commands, ['curl', process.execPath]);
  } finally {
    delete require.cache[modulePath];
  }
});

test('runtime download refuses a downgrade before requesting the redirect', async t => {
  const fetch = t.mock.method(globalThis, 'fetch', async () => Response.redirect('http://assets.example/file'));
  await assert.rejects(download('https://release.example/file', ''), /requires HTTPS/);
  assert.equal(fetch.mock.callCount(), 1);
});
