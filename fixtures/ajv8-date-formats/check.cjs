'use strict';

const assert = require('node:assert/strict');

const Ajv6 = require('./before/node_modules/ajv');
const Ajv8 = require('./after/node_modules/ajv');
const addFormats = require('./after/node_modules/ajv-formats');
assert.equal(require('./before/node_modules/ajv/package.json').version, '6.15.0');
assert.equal(require('./after/node_modules/ajv/package.json').version, '8.20.0');
assert.equal(require('./after/node_modules/ajv-formats/package.json').version, '3.0.1');

const schema = {
  type: 'object',
  properties: { date: { type: 'string', format: 'date' } },
  required: ['date'],
};
const valid = { date: '2024-02-29' };
const invalid = { date: 'not-a-date' };
const impossible = { date: '2023-02-29' };

function checkDate(validate) {
  assert.equal(validate(valid), true);
  assert.equal(validate(invalid), false);
  assert.equal(validate.errors[0].keyword, 'format');
}

const baseline = new Ajv6().compile(schema);
checkDate(baseline);
assert.equal(baseline(impossible), true);
assert.throws(() => new Ajv8().compile(schema), /unknown format "date"/);
const migrated = addFormats(new Ajv8()).compile(schema);
checkDate(migrated);
assert.equal(migrated(impossible), false);
assert.equal(migrated.errors[0].keyword, 'format');

const lax = new Ajv8({ strict: false, logger: false }).compile(schema);
assert.equal(lax(invalid), true);
const withoutFormat = { ...schema, properties: { date: { type: 'string' } } };
assert.equal(new Ajv8().compile(withoutFormat)(valid), true);
console.log('Ajv 8 with ajv-formats validates the date field and rejects impossible leap days.');
