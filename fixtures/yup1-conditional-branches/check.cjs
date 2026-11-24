'use strict';

const assert = require('node:assert/strict');
const older = require('./before/node_modules/yup');
const newer = require('./after/node_modules/yup');

assert.equal(require('./before/node_modules/yup/package.json').version, '0.29.3');
assert.equal(require('./after/node_modules/yup/package.json').version, '1.7.1');

function schemaFor(yup, callbacks) {
  const buildCode = () => yup.string().oneOf(['A', 'B']);
  return yup.object({
    enabled: yup.boolean().required(),
    code: buildCode().when('enabled', {
      is: true,
      then: callbacks ? schema => schema.required() : buildCode().required(),
      otherwise: callbacks ? schema => schema.notRequired() : buildCode().notRequired(),
    }),
  });
}

const valid = { enabled: true, code: 'A' };

async function verify(schema) {
  assert.deepEqual(await schema.validate(valid), valid);
  const disabled = { enabled: false };
  assert.deepEqual(await schema.validate(disabled), disabled);
  await assert.rejects(schema.validate({ enabled: true }), error => {
    assert.equal(error.name, 'ValidationError');
    assert.equal(error.path, 'code');
    assert.match(error.message, /required/);
    return true;
  });
  for (const enabled of [true, false]) {
    await assert.rejects(schema.validate({ enabled, code: 'C' }), error => {
      assert.equal(error.name, 'ValidationError');
      assert.equal(error.path, 'code');
      assert.match(error.message, /one of/);
      return true;
    });
  }
}

async function main() {
  await verify(schemaFor(older, false));
  const held = schemaFor(newer, false);
  await assert.rejects(async () => held.validate(valid), /branch is not a function/);
  await verify(schemaFor(newer, true));
  console.log('Yup 1 branch functions retain both the conditional requirement and base value restriction.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
