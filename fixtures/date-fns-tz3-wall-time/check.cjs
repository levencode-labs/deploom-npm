'use strict';

const assert = require('node:assert/strict');

process.env.TZ = 'UTC';

const before = require('./before/node_modules/date-fns-tz');
const after = require('./after/node_modules/date-fns-tz');
const { format: oldFormat } = require('./before/node_modules/date-fns');
const { format: newFormat } = require('./after/node_modules/date-fns');
assert.equal(require('./before/node_modules/date-fns-tz/package.json').version, '2.0.0');
const target = require('./after/node_modules/date-fns-tz/package.json');
assert.equal(target.version, '3.2.0');
assert.equal(target.peerDependencies['date-fns'], '^3.0.0 || ^4.0.0');
assert.equal(require('./before/node_modules/date-fns/package.json').version, '2.29.3');
assert.equal(require('./after/node_modules/date-fns/package.json').version, '4.1.0');

const zone = 'Europe/Brussels';
const pattern = 'yyyy-MM-dd HH:mm';
const instants = [
  '2024-03-31T00:59:00.000Z',
  '2024-03-31T01:00:00.000Z',
  '2024-10-27T00:30:00.000Z',
  '2024-10-27T01:30:00.000Z',
].map((timestamp) => new Date(timestamp));
const expected = [
  '2024-03-31 01:59',
  '2024-03-31 03:00',
  '2024-10-27 02:30',
  '2024-10-27 02:30',
];

const baseline = instants.map((instant) => oldFormat(before.utcToZonedTime(instant, zone), pattern));
assert.deepEqual(baseline, expected);

const legacyCall = () => after.utcToZonedTime(instants[0], zone);
assert.throws(legacyCall, /utcToZonedTime is not a function/);

const migrated = instants.map((instant) => newFormat(after.toZonedTime(instant, zone), pattern));
assert.deepEqual(migrated, baseline);
console.log('date-fns-tz 3 preserves displayed Brussels wall time across both daylight-saving changes.');
