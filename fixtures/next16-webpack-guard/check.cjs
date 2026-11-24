const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { readFileSync } = require('node:fs');
const { join } = require('node:path');

function build(stage, version, mode, flags = []) {
  const cwd = join(__dirname, stage);
  const next = join(cwd, 'node_modules', 'next');
  assert.equal(JSON.parse(readFileSync(join(next, 'package.json'), 'utf8')).version, version);
  const result = spawnSync(process.execPath, [join(next, 'dist', 'bin', 'next'), 'build', ...flags], {
    cwd,
    env: { ...process.env, CI: 'true', NEXT_TELEMETRY_DISABLED: '1', FIXTURE_BUNDLER_MODE: mode },
    encoding: 'utf8',
    timeout: 90000,
  });
  if (result.error) throw result.error;
  return { ...result, text: result.stdout + result.stderr, cwd };
}

function assertExport(result, mode) {
  assert.equal(result.status, 0, result.text);
  const html = readFileSync(join(result.cwd, '.next-' + mode, 'server', 'app', 'index.html'), 'utf8');
  assert.ok(html.includes('<main>dependency-bundler-alias-control</main>'), html.slice(0, 600));
}

const baseline = build('before', '15.5.6', 'baseline');
assertExport(baseline, 'baseline');

const held = build('after', '16.4.5', 'held');
assert.equal(held.status, 1, held.text);
assert.match(held.text, /webpack.{0,10} config and no .{0,5}turbopack/i);

const repaired = build('after', '16.4.5', 'webpack', ['--webpack']);
assertExport(repaired, 'webpack');

const dual = build('after', '16.4.5', 'dual');
assertExport(dual, 'dual');
console.log('Next 15 default, Next 16 explicit Webpack, and Next 16 with a dual config build the same alias.');
