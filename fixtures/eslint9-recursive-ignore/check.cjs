const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { ESLint: Before } = require('eslint-before');
const { ESLint: After } = require('eslint-after');

assert.equal(Before.version, '8.57.1');
assert.equal(After.version, '9.0.0');

async function checkIgnorePatterns() {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'deploom-eslint-ignore-'));
  const ignoreFile = path.join(cwd, '.eslintignore');
  const configFile = path.join(cwd, '.eslintrc.json');
  try {
    fs.writeFileSync(ignoreFile, 'coverage\nnode_modules\n');
    fs.writeFileSync(configFile, '{"root":true,"env":{"node":true}}\n');

    const probes = ['coverage/report.js', 'test/coverage/report.js', 'src/covered.js'];
    const classify = linter => Promise.all(probes.map(file => linter.isPathIgnored(file)));
    const legacy = await classify(new Before({ cwd }));
    assert.deepEqual(legacy, [true, true, false]);
    await assert.rejects(classify(new After({ cwd })), /Could not find config file/);

    fs.unlinkSync(ignoreFile);
    const flat = pattern => new After({
      cwd,
      overrideConfigFile: true,
      overrideConfig: [{ ignores: [pattern] }],
    });
    const wrong = await classify(flat('coverage/'));
    assert.deepEqual(wrong, [true, false, false]);
    const repaired = await classify(flat('**/coverage/'));
    assert.deepEqual(repaired, legacy);
    console.log(JSON.stringify({ probes, legacy, wrong, repaired }));
  } finally {
    fs.rmSync(ignoreFile, { force: true });
    fs.rmSync(configFile, { force: true });
    fs.rmdirSync(cwd);
  }
}

checkIgnorePatterns().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
