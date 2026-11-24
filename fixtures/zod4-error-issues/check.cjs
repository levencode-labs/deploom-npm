const assert = require('node:assert/strict');
const before = require('zod-before');
const after = require('zod-after');

assert.equal(require('zod-before/package.json').version, '3.25.76');
assert.equal(require('zod-after/package.json').version, '4.6.7');

function subscribe(zod, body, field) {
  const result = zod.object({ email: zod.string().email('Invalid email address') }).safeParse(body);
  if (result.success) return { status: 200 };
  return { status: 400, body: { error: result.error[field][0]?.message ?? 'Invalid email' } };
}

const invalid = { email: 'not-an-email' };
const valid = { email: 'fixture@example.com' };
const rejected = { status: 400, body: { error: 'Invalid email address' } };
assert.deepEqual(subscribe(before, invalid, 'errors'), rejected);
assert.throws(() => subscribe(after, invalid, 'errors'), TypeError);
assert.deepEqual(subscribe(after, invalid, 'issues'), rejected);
assert.deepEqual(subscribe(before, invalid, 'issues'), rejected);
assert.deepEqual(subscribe(after, valid, 'issues'), { status: 200 });
const failure = after.object({ email: after.string().email() }).safeParse(invalid);
assert.deepEqual(failure.error.issues[0].path, ['email']);
console.log('Zod 4 issues restores the endpoint validation decision and message.');
