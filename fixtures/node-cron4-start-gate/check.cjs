'use strict';

const assert = require('node:assert/strict');

const before = require('./before/node_modules/node-cron');
const after = require('./after/node_modules/node-cron');
assert.equal(require('./before/node_modules/node-cron/package.json').version, '3.0.3');
assert.equal(require('./after/node_modules/node-cron/package.json').version, '4.6.0');

function within(promise, stage) {
  let timer;
  const limit = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error('No cron tick during ' + stage)), 8000);
  });
  return Promise.race([promise, limit]).finally(() => clearTimeout(timer));
}

async function main() {
  const expression = '* * * * * *';
  const firstTick = {
    before: Promise.withResolvers(),
    held: Promise.withResolvers(),
    migrated: Promise.withResolvers(),
  };
  const runs = { before: 0, held: 0, migrated: 0 };
  const run = (phase) => () => {
    runs[phase] += 1;
    firstTick[phase].resolve();
  };

  const oldTask = before.schedule(expression, run('before'), { scheduled: false });
  const heldTask = after.schedule(expression, run('held'), { scheduled: false });
  const migratedTask = after.createTask(expression, run('migrated'));

  try {
    await within(firstTick.held.promise, 'pre-start control');
    assert.ok(runs.held > 0);
    assert.equal(runs.before, 0);
    assert.equal(runs.migrated, 0);
    await heldTask.stop();

    oldTask.start();
    await migratedTask.start();
    await within(Promise.all([firstTick.before.promise, firstTick.migrated.promise]), 'explicit start');
    assert.ok(runs.before > 0);
    assert.ok(runs.migrated > 0);
    console.log('node-cron 4 createTask defers callbacks until an explicit start.');
  } finally {
    await Promise.all([oldTask.stop(), heldTask.stop(), migratedTask.stop()]);
  }
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
