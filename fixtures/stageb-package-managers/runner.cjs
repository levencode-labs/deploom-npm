'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createRequire } = require('node:module');

const spec = require('./spec.json');
const [manager, arm] = process.argv.slice(2);
assert.ok(Object.hasOwn(spec.managers, manager), 'Unknown manager');
assert.ok(Object.hasOwn(spec.arms, arm), 'Unknown arm');
const dir = path.resolve(__dirname, 'arms', `${manager}-${arm}`);
assert.equal(process.cwd(), dir, 'Runner cwd must be the selected arm');
assert.equal(process.versions.node, spec.node, 'Use the pinned Node runtime');
const armRequire = createRequire(path.join(dir, 'package.json'));
const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'package.json')));
assert.deepEqual(manifest.dependencies, spec.arms[arm]);
const resolutions = {};

function inside(parent, file) {
  const relative = path.relative(parent, file);
  return relative !== '' && relative !== '..' && !relative.startsWith(`..${path.sep}`)
    && !path.isAbsolute(relative);
}

let pnp;
if (manager === 'yarn') {
  assert.ok(process.versions.pnp, 'MANAGER_ARM_ISOLATION: Yarn PnP loader is required');
  pnp = armRequire('pnpapi');
  assert.ok(!fs.existsSync(path.join(dir, 'node_modules')), 'PnP arm must have no node_modules');
} else {
  assert.equal(process.versions.pnp, undefined, 'Unexpected PnP loader in node_modules arm');
  assert.ok(fs.existsSync(path.join(dir, 'node_modules')),
    'MANAGER_ARM_ISOLATION: selected node_modules is absent');
}

for (const [name, version] of Object.entries(spec.arms[arm])) {
  const resolved = armRequire.resolve(`${name}/package.json`);
  if (pnp) {
    const locator = pnp.findPackageLocator(resolved);
    assert.equal(locator.name, name);
    const info = pnp.getPackageInformation(locator);
    assert.ok(inside(path.join(dir, '.yarn', 'cache'), info.packageLocation),
      `MANAGER_ARM_ISOLATION: ${name} must use this arm's PnP cache`);
    assert.equal(pnp.resolveRequest(`${name}/package.json`, path.join(dir, 'package.json')), resolved);
  } else {
    const actual = fs.realpathSync(resolved);
    assert.ok(inside(fs.realpathSync(path.join(dir, 'node_modules')), actual),
      `MANAGER_ARM_ISOLATION: ${name} resolved outside the selected arm`);
  }
  assert.equal(armRequire(`${name}/package.json`).version, version,
    `Installed ${name} identity differs from the exact arm`);
  resolutions[name] = path.relative(dir, resolved).split(path.sep).join('/');
}

const prettier = armRequire('prettier');
const zod = armRequire('zod');
const input = 'const data={key:1}';
const formatted = 'const data = { key: 1 };';
const formatOptions = { parser: 'babel' };
const formatOld = source => prettier.format(source, formatOptions).trimEnd();
const formatFixed = async source => (await prettier.format(source, formatOptions)).trimEnd();
const schema = zod.object({ email: zod.string().email('Invalid email address') });
function endpoint(body, field) {
  const result = schema.safeParse(body);
  if (result.success) return { status: 200, body: result.data };
  return { status: 400, body: { error: result.error[field][0].message } };
}
const invalid = { email: 'not-an-email' };
const rejected = { status: 400, body: { error: 'Invalid email address' } };
const valid = { email: 'fixture@example.com', ignored: 'must be stripped' };
const accepted = { status: 200, body: { email: 'fixture@example.com' } };

async function main() {
  const checks = {};
  if (arm === 'before') {
    assert.equal(formatOld(input), formatted);
    assert.throws(() => formatOld('const ='), /Unexpected token/);
    assert.deepEqual(endpoint(invalid, 'errors'), rejected);
    assert.deepEqual(endpoint(valid, 'errors'), accepted);
    checks.baseline = 'passed';
  } else {
    assert.throws(() => formatOld(input), TypeError,
      'PRETTIER_OLD_SYNC_CONSUMER_FAILS');
    assert.throws(() => endpoint(invalid, 'errors'), TypeError,
      'ZOD_ERRORS_ALIAS_FAILS');
    // A successful request alone is an inadequate acceptance oracle.
    assert.deepEqual(endpoint(valid, 'errors'), accepted);
    checks.upgradedOldCode = { prettier: 'expected-TypeError', zod: 'expected-TypeError' };
    // Retain the broken APIs after the fix, so a partial/reverted repair stays red.
    assert.throws(() => prettier.format(input, formatOptions).trimEnd(), TypeError,
      'PRETTIER_OLD_SYNC_CONSUMER_FAILS');
    assert.throws(() => schema.safeParse(invalid).error.errors[0].message, TypeError,
      'ZOD_ERRORS_ALIAS_FAILS');
    checks.revertedFixNegatives = 'passed';
  }
  assert.equal(await formatFixed(input), formatted);
  await assert.rejects(formatFixed('const ='), /Unexpected token/,
    'FORMAT_INVALID_SOURCE_REJECTED');
  assert.deepEqual(endpoint(invalid, 'issues'), rejected,
    'VALIDATION_INVALID_INPUT_REJECTED');
  assert.deepEqual(endpoint(valid, 'issues'), accepted);
  assert.deepEqual(schema.safeParse(invalid).error.issues[0].path, ['email']);
  checks.fixed = 'passed';
  checks.invalidInputControls = 'passed';
  console.log(JSON.stringify({ manager, arm, versions: spec.arms[arm],
    mode: spec.managers[manager].mode, resolutions, checks,
    output: { formatted, invalidEmail: rejected, validEmail: accepted } }));
}
main().catch(error => { console.error(error); process.exitCode = 1; });
