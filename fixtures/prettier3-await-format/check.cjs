const assert = require('node:assert/strict');
const before = require('prettier-before');
const after = require('prettier-after');

assert.equal(before.version, '2.8.8');
assert.equal(after.version, '3.0.0');

async function checkFormatResult() {
  const input = 'const data={key:1}';
  const options = { parser: 'babel' };
  const consume = code => code.trimEnd();
  const baseline = consume(before.format(input, options));
  assert.equal(baseline, 'const data = { key: 1 };');

  const pending = after.format(input, options);
  assert.equal(typeof pending.then, 'function');
  assert.throws(() => consume(pending), TypeError);
  assert.equal(consume(await pending), baseline);

  await assert.rejects(after.format('const =', options), /Unexpected token/);
  console.log('Prettier 3 returns a promise; awaiting it preserves the formatting and surfaces parse errors.');
}

checkFormatResult().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
