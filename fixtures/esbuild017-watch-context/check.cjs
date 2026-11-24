'use strict';

const assert = require('node:assert/strict');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');
const { setTimeout: delay } = require('node:timers/promises');

const old = require('./before/node_modules/esbuild');
const target = require('./after/node_modules/esbuild');
assert.equal(old.version, '0.15.6');
assert.equal(target.version, '0.17.0');

function watchOptions(cwd, builds) {
  return {
    absWorkingDir: cwd,
    entryPoints: ['entry.js'],
    bundle: true,
    write: false,
    logLevel: 'silent',
    plugins: [{
      name: 'record-builds',
      setup(build) {
        build.onEnd((result) => { builds.push(result); });
      },
    }],
  };
}

async function outputAt(builds, index) {
  const expires = Date.now() + 12000;
  while (builds.length <= index && Date.now() < expires) {
    await delay(50);
  }
  assert.ok(builds[index], 'Watch build did not finish');
  assert.deepEqual(builds[index].errors, []);
  assert.equal(builds[index].outputFiles.length, 1);
  return builds[index].outputFiles[0].text;
}

async function exercise(workingDir, start) {
  const entry = join(workingDir, 'entry.js');
  const builds = [];
  writeFileSync(entry, 'console.log("fixture-before");\n');
  const stop = await start(watchOptions(workingDir, builds));
  try {
    assert.match(await outputAt(builds, 0), /fixture-before/);
    writeFileSync(entry, 'console.log("fixture-after-edit");\n');
    assert.match(await outputAt(builds, 1), /fixture-after-edit/);
  } finally {
    await stop();
  }
}

async function main() {
  const cwd = mkdtempSync(join(tmpdir(), 'deploom-esbuild-watch-'));
  try {
    await exercise(cwd, async (options) => {
      const build = await old.build({ ...options, watch: true });
      return () => build.stop();
    });

    await assert.rejects(target.build({ ...watchOptions(cwd, []), watch: true }), /Invalid option.*"watch"/);
    await exercise(cwd, async (options) => {
      const context = await target.context(options);
      try {
        await context.watch();
        return () => context.dispose();
      } catch (error) {
        await context.dispose();
        throw error;
      }
    });

    const oneShot = await target.build(watchOptions(cwd, []));
    assert.match(oneShot.outputFiles[0].text, /fixture-after-edit/);
    console.log('esbuild 0.17 watch context rebuilds after a real file change and the one-shot build still passes.');
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
