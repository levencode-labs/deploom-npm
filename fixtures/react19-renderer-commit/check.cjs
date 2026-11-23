const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const path = require('node:path');

// Static host-tree timing case from Jest aa88f7cf0bfc7a3a2efbfcab97914886b22d4454.
const cases = {
  baseline: { version: '18.3.1', lock: '8fa99b15057f711450611f231127c3984c1e59a851fbfdce4b681c6829c0502a' },
  target: { version: '19.3.0', lock: 'c77a6822020577eba01974698f588609a23b776914075424b0e5960f4c24bcd8' },
};

function verifyLock(cwd, expected) {
  const lock = readFileSync(path.join(cwd, 'package-lock.json'), 'utf8');
  assert.equal(createHash('sha256').update(lock.replace(/\r\n/g, '\n')).digest('hex'), expected);
  return lock;
}

async function checkRenderer(name) {
  const load = createRequire(path.join(__dirname, name, 'package.json'));
  const React = load('react');
  const renderer = load('react-test-renderer');
  assert.equal(React.version, cases[name].version);
  assert.equal(load('react-test-renderer/package.json').version, React.version);

  const tree = React.createElement('div', { className: 'fixture' }, React.createElement('span', null, 'child'));
  const expected = {
    type: 'div', props: { className: 'fixture' },
    children: [{ type: 'span', props: {}, children: ['child'] }],
  };
  const immediate = renderer.create(tree).toJSON();
  assert.deepEqual(immediate, name === 'target' ? null : expected);

  let instance;
  let timer;
  try {
    await new Promise((resolve, reject) => {
      timer = setTimeout(() => reject(new Error('Static host tree did not commit')), 5000);
      function CommitSignal() {
        React.useLayoutEffect(resolve, []);
        return tree;
      }
      instance = renderer.create(React.createElement(CommitSignal));
    });
  } finally {
    clearTimeout(timer);
  }

  assert.deepEqual(instance.toJSON(), expected);
  console.log(`${React.version} ${process.env.NODE_ENV}: immediate JSON and committed tree verified`);
}

function run(executable, args, options) {
  const child = spawnSync(executable, args, { stdio: 'inherit', timeout: 120000, ...options });
  if (child.error) throw child.error;
  assert.equal(child.status, 0);
}

function runFixture() {
  const windows = process.platform === 'win32';
  const npm = windows ? process.env.ComSpec || 'cmd.exe' : 'npm';
  const flags = ['ci', '--registry=https://registry.npmjs.org/', '--ignore-scripts', '--strict-peer-deps', '--no-audit', '--no-fund'];
  for (const [name, { lock }] of Object.entries(cases)) {
    const cwd = path.join(__dirname, name);
    const before = verifyLock(cwd, lock);
    run(npm, windows ? ['/d', '/c', 'npm.cmd', ...flags] : flags, { cwd });
    assert.equal(verifyLock(cwd, lock), before);
    for (const NODE_ENV of ['development', 'production']) {
      run(process.execPath, [__filename, name], { env: { ...process.env, NODE_ENV } });
    }
  }
}

if (process.argv[2]) {
  checkRenderer(process.argv[2]).catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
} else {
  runFixture();
}
