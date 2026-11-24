'use strict';

const assert = require('node:assert/strict');

const { faker: before } = require('./before/node_modules/@faker-js/faker');
const { faker: after } = require('./after/node_modules/@faker-js/faker');
assert.equal(require('./before/node_modules/@faker-js/faker/package.json').version, '7.6.0');
assert.equal(require('./after/node_modules/@faker-js/faker/package.json').version, '9.8.0');

const bounds = { min: 0, max: 99 };
const legacyDraw = (faker) => faker.datatype.number(bounds);
const migratedDraw = (faker) => faker.number.int(bounds);

function sample(faker, draw) {
  faker.seed(42);
  return Array.from({ length: 8 }, () => draw(faker));
}

function verifyBounds(values) {
  for (const value of values) {
    assert.ok(Number.isInteger(value));
    assert.ok(value >= bounds.min && value <= bounds.max);
  }
}

const baseline = sample(before, legacyDraw);
verifyBounds(baseline);
assert.deepEqual(sample(before, legacyDraw), baseline);

assert.throws(() => legacyDraw(after), /datatype.number is not a function/);

const migrated = sample(after, migratedDraw);
verifyBounds(migrated);
assert.deepEqual(sample(after, migratedDraw), migrated);
assert.notDeepEqual(migrated, baseline);
console.log('Faker 9 preserves bounded integers and repeatability within the release, with a different seeded sequence.');
