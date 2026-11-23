const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

const yarn = path.resolve(process.argv[2]);
const packageName = '@prisma/client';
const versions = ['6.19.0', '7.0.0', '7.3.0'];
const template = readFileSync(path.join(__dirname, 'schema.prisma'), 'utf8');
const schemaId = 'UserPermissionRole';
const results = new Map();

function run(cwd, cmd, args, env) {
  const result = spawnSync(process.execPath, [cmd, ...args], {
    cwd, env, stdio: 'inherit', timeout: 120000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `${cwd}: ${args.join(' ')}`);
}

for (const version of versions) {
  const cwd = path.join(__dirname, version);
  run(cwd, yarn, ['install', '--immutable', '--mode=skip-build'], process.env);
  assert.equal(require(path.join(cwd, 'node_modules', packageName, 'package.json')).version, version);
  assert.equal(require(path.join(cwd, 'node_modules/prisma/package.json')).version, version);

  const sourceDir = mkdtempSync(path.join(cwd, 'source-'));
  const schemaPath = path.join(sourceDir, 'schema.prisma');
  const env = { ...process.env, CHECKPOINT_DISABLE: '1' };
  const schemaEngine = process.env[`DEPLOOM_SCHEMA_ENGINE_${version.replaceAll('.', '_')}`];
  if (schemaEngine) env.PRISMA_SCHEMA_ENGINE_BINARY = schemaEngine;
  delete env.PRISMA_QUERY_ENGINE_LIBRARY;
  let source = template;
  if (version === '6.19.0') {
    const nativeEngine = process.env.DEPLOOM_PRISMA6_QUERY_ENGINE;
    if (nativeEngine) env.PRISMA_QUERY_ENGINE_LIBRARY = nativeEngine;
    source = source.replace('provider = "postgresql"', 'provider = "postgresql"\n  url = env("PRISMA_DATABASE_URL")');
    env.PRISMA_DATABASE_URL = 'postgresql://fixture@127.0.0.1:1/unused';
  }
  writeFileSync(schemaPath, source, { flag: 'wx' });
  run(cwd, path.join(cwd, 'node_modules/prisma/build/index.js'), ['generate', '--schema', schemaPath], env);
  const emitted = readFileSync(path.join(sourceDir, 'generated/enums.ts'), 'utf8');
  const members = emitted.match(new RegExp(`${schemaId}\\s*=\\s*\\{\\s*ADMIN:\\s*['"]([a-z]+)['"],?\\s*USER:\\s*['"]([a-z]+)['"],?\\s*\\}`, 'i'));
  assert.ok(members, `Missing generated ${schemaId} on ${version}`);
  results.set(version, { ADMIN: members[1], USER: members[2] });
}

const baseline = results.get('6.19.0');
const initial = results.get('7.0.0');
const restored = results.get('7.3.0');
assert.deepEqual(baseline, { ADMIN: 'ADMIN', USER: 'USER' });
assert.deepEqual(initial, { ADMIN: 'admin', USER: 'user' });
assert.notDeepEqual(initial, baseline);
assert.deepEqual(restored, baseline);
console.log(JSON.stringify({ enum: schemaId, versions: Object.fromEntries(results) }));
