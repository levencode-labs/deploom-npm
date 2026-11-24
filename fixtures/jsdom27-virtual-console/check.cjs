const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');

function arm(name, version) {
  const load = createRequire(join(__dirname, name, 'package.json'));
  assert.equal(load('jsdom/package.json').version, version);
  return load('jsdom');
}

function replay({ JSDOM, VirtualConsole }, connect) {
  const logs = [];
  const forwardedErrors = [];
  const detectedErrors = [];
  const sink = {
    log: (...args) => logs.push(args),
    error: (error) => forwardedErrors.push(String(error)),
  };
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', (error) => detectedErrors.push(error.message));
  connect(virtualConsole, sink);

  const { window } = new JSDOM('<!doctype html>', { virtualConsole, runScripts: 'outside-only' });
  try {
    window.console.log('fixture page message', 7);
    window.scrollTo(0, 0);
  } finally {
    window.close();
  }
  assert.deepEqual(logs, [['fixture page message', 7]]);
  assert.equal(detectedErrors.length, 1);
  assert.match(detectedErrors[0], /scrollTo/);
  return forwardedErrors;
}

const before = arm('before', '26.1.0');
const after = arm('after', '27.0.0');
const legacy = (virtualConsole, sink) => virtualConsole.sendTo(sink, { omitJSDOMErrors: true });

assert.deepEqual(replay(before, legacy), []);
assert.throws(() => replay(after, legacy), /sendTo is not a function/);
const renameOnly = replay(after, (virtualConsole, sink) =>
  virtualConsole.forwardTo(sink, { omitJSDOMErrors: true }));
assert.equal(renameOnly.length, 1);
assert.match(renameOnly[0], /scrollTo/);
assert.deepEqual(replay(after, (virtualConsole, sink) =>
  virtualConsole.forwardTo(sink, { jsdomErrors: 'none' })), []);
console.log('The v27 method and option preserve page logs, the explicit listener, and the suppressed default error output.');
