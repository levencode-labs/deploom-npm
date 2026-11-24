const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const replay = `
  const assert = require('node:assert/strict');
  const { JSDOM } = require('jsdom');
  const dom = new JSDOM('<main id="root"></main>');
  global.window = dom.window;
  global.document = dom.window.document;
  global.IS_REACT_ACT_ENVIRONMENT = true;

  const React = require('react');
  const { createRoot } = require('react-dom/client');
  const { CSSTransition } = require('react-transition-group');
  const version = process.argv[1];
  const useRef = process.argv[2] === 'ref';
  assert.equal(React.version, version);
  assert.equal(require('react-dom/package.json').version, version);
  assert.equal(require('react-transition-group/package.json').version, '4.4.5');

  const host = document.querySelector('#root');
  const root = createRoot(host);
  const nodeRef = React.createRef();
  let enterArgs;
  const render = open => React.createElement(CSSTransition, {
    ...(useRef ? { nodeRef } : {}),
    in: open, timeout: 0, classNames: 'phase', onEnter: (...args) => { enterArgs = args; },
  }, React.createElement('div', useRef ? { ref: nodeRef } : null, 'Transition marker'));

  async function advance(open) {
    await React.act(async () => root.render(render(open)));
    await React.act(async () => new Promise(resolve => setTimeout(resolve, 20)));
    return host.firstElementChild;
  }

  async function test() {
    try {
      await advance(false);
      const entered = await advance(true);
      assert.equal(entered.textContent, 'Transition marker');
      assert.ok(entered.classList.contains('phase-enter-done'), entered.className);
      if (useRef) {
        assert.equal(nodeRef.current, entered);
        assert.equal(enterArgs[0], false);
      } else {
        assert.equal(enterArgs[0], entered);
      }
      const exited = await advance(false);
      assert.ok(exited.classList.contains('phase-exit-done'), exited.className);
      console.log('DOM enter and exit completed');
    } finally {
      await React.act(async () => root.unmount());
      dom.window.close();
    }
  }
  test().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
`;

function run(stage, version, mode) {
  const result = spawnSync(process.execPath, ['-e', replay, version, mode], {
    cwd: join(__dirname, stage),
    env: { ...process.env, NODE_ENV: 'development' },
    encoding: 'utf8',
    timeout: 15000,
  });
  if (result.error) throw result.error;
  return result;
}

const baseline = run('before', '18.3.1', 'implicit');
assert.equal(baseline.status, 0, baseline.stderr);
assert.match(baseline.stdout, /DOM enter and exit completed/);
const held = run('after', '19.3.0', 'implicit');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /findDOMNode is not a function/);
const repaired = run('after', '19.3.0', 'ref');
assert.equal(repaired.status, 0, repaired.stderr);
assert.match(repaired.stdout, /DOM enter and exit completed/);
console.log('An explicit nodeRef preserves both phases on React DOM 19.');
