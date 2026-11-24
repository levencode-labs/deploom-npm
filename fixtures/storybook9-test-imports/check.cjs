'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/storybook/package.json').version, '8.6.18');
assert.equal(require('./before/node_modules/@storybook/test/package.json').version, '8.6.15');
assert.equal(require('./after/node_modules/storybook/package.json').version, '9.1.20');

const interaction = `
  import assert from 'node:assert/strict';
  import { JSDOM } from 'jsdom';

  const dom = new JSDOM('<button>Save</button><output role="status">Idle</output>');
  try {
    globalThis.window = dom.window;
    globalThis.document = dom.window.document;
    const { expect, fn, userEvent, within } = await import(process.argv[1]);
    const canvas = within(document.body);
    const button = canvas.getByRole('button', { name: 'Save' });
    const status = canvas.getByRole('status');
    const save = fn(() => { status.textContent = 'Saved'; });
    button.addEventListener('click', save);
    await expect(save).not.toHaveBeenCalled();
    await userEvent.setup({ document }).click(button);
    await expect(save).toHaveBeenCalledTimes(1);
    assert.equal(status.textContent, 'Saved');
    console.log(status.textContent);
  } finally {
    dom.window.close();
  }
`;

function run(arm, specifier) {
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', interaction, specifier], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15_000,
  });
  if (result.error) throw result.error;
  return result;
}

const baseline = run('before', '@storybook/test');
assert.equal(baseline.status, 0, baseline.stderr);
assert.equal(baseline.stdout.trim(), 'Saved');

const held = run('after', '@storybook/test');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /ERR_MODULE_NOT_FOUND/);
assert.match(held.stderr, /Cannot find package '@storybook\/test'/);

const repaired = run('after', 'storybook/test');
assert.equal(repaired.status, 0, repaired.stderr);
assert.equal(repaired.stdout.trim(), baseline.stdout.trim());
console.log('Storybook 9 test imports preserve the mock, accessible query and click assertion.');
