'use strict';

const assert = require('node:assert/strict');
const older = require('./before/node_modules/mongoose');
const newer = require('./after/node_modules/mongoose');

assert.equal(older.version, '8.24.6');
assert.equal(newer.version, '9.11.3');

const message = 'Deadline cannot be after the drive date';
const eventDate = '2026-10-20T12:00:00Z';

function checkDeadline() {
  if (this.deadline > this.driveDate) {
    this.invalidate('deadline', message);
  }
}

function callbackHook(next) {
  checkDeadline.call(this);
  next();
}

function makeModel(mongoose, hook) {
  const instance = new mongoose.Mongoose();
  const schema = new instance.Schema({
    driveDate: { type: Date, required: true },
    deadline: { type: Date, required: true },
  });
  schema.pre('validate', hook);
  return instance.model('Placement', schema);
}

async function verifyValidation(Placement) {
  for (const deadline of ['2026-10-19T12:00:00Z', eventDate]) {
    await new Placement({ driveDate: eventDate, deadline }).validate();
  }
  const invalid = new Placement({ driveDate: eventDate, deadline: '2026-10-21T12:00:00Z' });
  await assert.rejects(invalid.validate(), error => {
    assert.equal(error.name, 'ValidationError');
    assert.equal(error.errors.deadline.message, message);
    return true;
  });
}

async function main() {
  await verifyValidation(makeModel(older, callbackHook));
  const Held = makeModel(newer, callbackHook);
  const valid = new Held({ driveDate: eventDate, deadline: eventDate });
  await assert.rejects(valid.validate(), /next is not a function/);
  await verifyValidation(makeModel(newer, checkDeadline));
  console.log('The Mongoose 9 pre-validate hook preserves the deadline rule and equality boundary.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
