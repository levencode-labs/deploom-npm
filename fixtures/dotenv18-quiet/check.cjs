const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const child = `
  const [name, version, file, mode] = process.argv.slice(1);
  require('node:assert/strict').equal(require(name + '/package.json').version, version);
  const processEnv = {};
  const result = require(name).config({ path: file, processEnv, ...(mode === 'quiet' ? { quiet: true } : {}) });
  if (result.error) throw result.error;
  console.log(JSON.stringify({ value: processEnv.DEPLOOM_FIXTURE_VALUE }));
`;
const root = mkdtempSync(join(tmpdir(), 'deploom-dotenv-'));
const path = join(root, 'fixture.env');
writeFileSync(path, 'DEPLOOM_FIXTURE_VALUE=loaded\n');
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !/^(DOTENV_|NODE_OPTIONS$)/i.test(key)));

function run(name, version, mode) {
  const result = spawnSync(process.execPath, ['-e', child, name, version, path, mode], {
    cwd: __dirname, env, encoding: 'utf8', timeout: 15000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { value: 'loaded' });
  return result.stderr;
}

try {
  assert.equal(run('dotenv-before', '16.6.1', 'default'), '');
  const held = run('dotenv-after', '18.0.8', 'default');
  assert.match(held, /injected env/i);
  assert.equal(run('dotenv-after', '18.0.8', 'quiet'), '');
  console.log('Quiet mode suppresses the new stderr banner and preserves the loaded value.');
} finally {
  unlinkSync(path);
  rmdirSync(root);
}
