const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const initialEnv = process.env.DEPLOOM_FIXTURE_DATABASE_URL;
const newUrl = 'postgresql://fixture@127.0.0.1:1/unused';
const schema = url => 'datasource db {\n  provider = "postgresql"\n'
  + (url ? '  url = env("DEPLOOM_FIXTURE_DATABASE_URL")\n' : '')
  + '}\nmodel Review {\n  id Int @id\n}\n';
const config = 'import { defineConfig } from "prisma/config";\n'
  + 'const url = process.env.DEPLOOM_FIXTURE_DATABASE_URL;\n'
  + 'export default defineConfig({ schema: "schema.prisma", ...(url ? { datasource: { url } } : {}) });\n';

function load(stage, version) {
  const cwd = join(__dirname, stage);
  const at = createRequire(join(cwd, 'package.json'));
  const manifest = pkg => JSON.parse(readFileSync(join(cwd, 'node_modules', pkg, 'package.json'), 'utf8'));
  assert.equal(manifest('prisma').version, version);
  assert.equal(manifest('@prisma/prisma-schema-wasm').version, manifest('@prisma/engines-version').version);
  return { cwd, validate: at('@prisma/prisma-schema-wasm').validate, loadConfig: at('@prisma/config').loadConfigFromFile };
}

function params(source) {
  return JSON.stringify({ prismaSchema: [['schema.prisma', source]], noColor: true });
}

async function checkConfig(prisma, databaseUrl) {
  const dir = mkdtempSync(join(prisma.cwd, 'prisma-config-'));
  const file = join(dir, 'prisma.config.ts');
  writeFileSync(file, config);
  if (databaseUrl) process.env.DEPLOOM_FIXTURE_DATABASE_URL = databaseUrl;
  else delete process.env.DEPLOOM_FIXTURE_DATABASE_URL;
  try {
    const loaded = await prisma.loadConfig({ configFile: file, configRoot: dir });
    assert.equal(loaded.error, undefined, JSON.stringify(loaded.error));
    assert.equal(loaded.config.schema, join(dir, 'schema.prisma'));
    assert.equal(loaded.config.datasource?.url, databaseUrl);
  } finally {
    if (initialEnv === undefined) delete process.env.DEPLOOM_FIXTURE_DATABASE_URL;
    else process.env.DEPLOOM_FIXTURE_DATABASE_URL = initialEnv;
    unlinkSync(file);
    rmdirSync(dir);
  }
}

async function check() {
  const before = load('before', '6.19.3');
  const after = load('after', '7.10.0');
  assert.doesNotThrow(() => before.validate(params(schema(true))));
  assert.throws(() => after.validate(params(schema(true))), /datasource property.*url.*no longer supported/i);
  assert.doesNotThrow(() => after.validate(params(schema(false))));
  await checkConfig(after, newUrl);
  await checkConfig(after, undefined);
  console.log('Prisma 7 schema validation passes with the URL moved to the loaded CLI config.');
}

check().catch(error => { console.error(error); process.exitCode = 1; });
