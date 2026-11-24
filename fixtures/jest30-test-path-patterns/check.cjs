const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function run(arm, version, ...args) {
  const base = path.join(__dirname, arm);
  assert.equal(require(path.join(base, 'node_modules/jest/package.json')).version, version);
  const project = fs.mkdtempSync(path.join(base, 'project-'));
  try {
    fs.writeFileSync(path.join(project, 'selected.test.cjs'),
      "test('selected', () => expect(2 + 2).toBe(4));\n");
    fs.writeFileSync(path.join(project, 'excluded.test.cjs'),
      "test('excluded', () => expect('out of scope').toBe('selected'));\n");
    const config = JSON.stringify({ rootDir: project, testMatch: ['**/*.test.cjs'], cache: false });
    const bin = path.join(base, 'node_modules/jest/bin/jest.js');
    const result = spawnSync(process.execPath, [bin, '--runInBand', '--json', '--config', config, ...args],
      { cwd: project, encoding: 'utf8', timeout: 20000 });
    if (result.error) throw result.error;
    return result;
  } finally {
    const resolved = fs.realpathSync(project);
    assert.equal(path.dirname(resolved), fs.realpathSync(base));
    assert.match(path.basename(resolved), /^project-[A-Za-z0-9]+$/);
    fs.rmSync(resolved, { recursive: true, force: true });
  }
}

const pattern = 'selected\\.test\\.cjs$';
const before = run('before', '29.7.0', '--testPathPattern', pattern);
assert.equal(before.status, 0, before.stderr);
const held = run('after', '30.5.2', '--testPathPattern', pattern);
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /testPathPattern.*replaced.*testPathPatterns/si);
const repaired = run('after', '30.5.2', '--testPathPatterns', pattern);
assert.equal(repaired.status, 0, repaired.stderr);
for (const result of [before, repaired]) {
  const report = JSON.parse(result.stdout);
  assert.equal(report.numTotalTests, 1);
  assert.equal(report.numPassedTests, 1);
  assert.equal(path.basename(report.testResults[0].name), 'selected.test.cjs');
}
const widened = run('after', '30.5.2');
assert.equal(widened.status, 1);
assert.equal(JSON.parse(widened.stdout).numFailedTests, 1);
console.log('Both supported filters run one passing test; the singular flag and widened selection fail.');
