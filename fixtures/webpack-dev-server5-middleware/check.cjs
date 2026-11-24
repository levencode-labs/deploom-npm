'use strict';

const assert = require('node:assert/strict');
const { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { dirname, join, resolve } = require('node:path');

const arms = resolve(process.argv[2] ?? __dirname);
const work = mkdtempSync(join(arms, '.dev-server-'));
const bundleMarker = 'deploom-real-compiled-bundle';
const hookMarker = 'deploom-custom-middleware';

function loadArm(arm, expectedVersion) {
  const base = join(arms, arm);
  const load = createRequire(join(base, 'package.json'));
  const version = name => JSON.parse(readFileSync(join(base, 'node_modules', name, 'package.json'), 'utf8')).version;
  assert.equal(version('webpack'), '5.100.2');
  assert.equal(version('webpack-dev-server'), expectedVersion);
  return { webpack: load('webpack'), Server: load('webpack-dev-server') };
}

function compiler(webpack, label) {
  return webpack({
    mode: 'development',
    context: work,
    entry: './index.js',
    output: { path: join(work, label), filename: 'bundle.js' },
  });
}

function options(hooks) {
  return {
    host: '127.0.0.1', port: 0, hot: false, liveReload: false,
    static: false, client: false, webSocketServer: false,
    ...hooks,
  };
}

function intercept(req, res, next) {
  if (req.url === '/bundle.js' && req.headers['x-deploom-probe'] === 'middleware') {
    res.end(hookMarker);
    return;
  }
  next();
}

async function read(url, headers) {
  const response = await fetch(url, { headers, redirect: 'error', signal: AbortSignal.timeout(15000) });
  assert.equal(response.status, 200);
  return response.text();
}

async function run(arm, label, hooksFor) {
  let calls = 0;
  const server = new arm.Server(options(hooksFor(() => { calls++; })), compiler(arm.webpack, label));
  try {
    await server.start();
    assert.equal(calls, 1);
    const address = server.server.address();
    assert.equal(address.address, '127.0.0.1');
    const url = 'http://127.0.0.1:' + address.port + '/bundle.js';
    assert.equal(await read(url, { 'x-deploom-probe': 'middleware' }), hookMarker);
    assert.match(await read(url), new RegExp(bundleMarker));
  } finally {
    if (server.server) await server.stop();
  }
}

async function main() {
  writeFileSync(join(work, 'index.js'), 'console.log("' + bundleMarker + '");\n');
  const before = loadArm('before', '4.15.2');
  const after = loadArm('after', '5.2.2');
  const legacy = ran => ({
    onBeforeSetupMiddleware(devServer) {
      ran();
      devServer.app.use(intercept);
    },
  });
  await run(before, 'before', legacy);

  const heldCompiler = compiler(after.webpack, 'held');
  assert.throws(() => new after.Server(options(legacy(() => {})), heldCompiler),
    /unknown property .onBeforeSetupMiddleware./i);
  await new Promise((done, reject) => heldCompiler.close(error => error ? reject(error) : done()));

  await run(after, 'after', ran => ({
    setupMiddlewares(middlewares) {
      ran();
      middlewares.unshift({ name: 'deploom-probe', middleware: intercept });
      return middlewares;
    },
  }));
  console.log('webpack-dev-server 5 rejects the legacy hook; the explicit array preserves middleware and compiled-bundle behavior.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
}).finally(() => {
  assert.equal(dirname(resolve(work)), arms);
  rmSync(work, { recursive: true, force: true });
});
