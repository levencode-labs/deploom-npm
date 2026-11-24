'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/@testing-library/user-event/package.json').version, '13.5.0');
assert.equal(require('./after/node_modules/@testing-library/user-event/package.json').version, '14.6.7');

const scenario = `
  const { JSDOM } = require('jsdom');
  const window = new JSDOM('<label>Amount <input></label><button>Save</button>', {
    pretendToBeVisual: true,
  }).window;
  globalThis.window = window;
  globalThis.document = window.document;
  const userEvent = require('@testing-library/user-event').default;
  const { getByRole } = require('@testing-library/dom');

  async function main() {
    const user = process.argv[1] === 'session' ? userEvent.setup({ document }) : userEvent;
    const amount = getByRole(document.body, 'textbox', { name: 'Amount' });
    const save = getByRole(document.body, 'button', { name: 'Save' });

    const typing = user.type(amount, '1.5k');
    const immediate = amount.value;
    await typing;
    const typed = amount.value;

    const tabbing = user.tab();
    const focusedImmediately = document.activeElement === save;
    await tabbing;
    console.log(JSON.stringify({
      immediate, typed, focusedImmediately, focusedAfter: document.activeElement === save,
    }));
    window.close();
  }

  main().catch(error => {
    console.error(error);
    window.close();
    process.exitCode = 1;
  });
`;

function run(arm, mode) {
  const result = spawnSync(process.execPath, ['-e', scenario, mode], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout);
}

const baseline = run('before', 'direct');
assert.deepEqual(baseline, {
  immediate: '1.5k', typed: '1.5k', focusedImmediately: true, focusedAfter: true,
});

const held = run('after', 'direct');
assert.equal(held.immediate, '');
assert.equal(held.focusedImmediately, false);
assert.equal(held.typed, baseline.typed);
assert.equal(held.focusedAfter, baseline.focusedAfter);

const migrated = run('after', 'session');
assert.equal(migrated.typed, baseline.typed);
assert.equal(migrated.focusedAfter, baseline.focusedAfter);
console.log('Awaited user-event 14 actions preserve the typed value and tab focus.');
