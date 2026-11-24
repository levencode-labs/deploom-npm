const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdtempSync, rmdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const legacy = 'config.headers = { "X-Fixture-Mode": "probe" };';
const repaired = 'config.headers.set("X-Fixture-Mode", "probe");';

function load(stage, version) {
  const root = join(__dirname, stage);
  const at = createRequire(join(root, 'package.json'));
  const client = at('axios');
  assert.equal(client.VERSION, version);
  return { root, client, ts: at('typescript') };
}

function diagnostics({ root, ts }, change) {
  const scratch = mkdtempSync(join(root, 'typecheck-'));
  const entry = join(scratch, 'entry.ts');
  const source = "import axios from 'axios';\naxios.interceptors.request.use(config => {\n"
    + change + '\nreturn config;\n});';
  writeFileSync(entry, source);
  try {
    assert.equal(ts.version, '5.9.2');
    const options = {
      module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler,
      target: ts.ScriptTarget.ES2022, strict: true, noEmit: true, types: [],
    };
    return ts.getPreEmitDiagnostics(ts.createProgram([entry], options)).map(diagnostic => diagnostic.code);
  } finally {
    unlinkSync(entry);
    rmdirSync(scratch);
  }
}

async function sent(axios, update) {
  let received;
  const client = axios.create({
    adapter: async config => {
      received = config.headers;
      return { status: 200, statusText: 'OK', headers: {}, data: { success: true }, config };
    },
  });
  client.interceptors.request.use(config => {
    update(config);
    return config;
  });
  const response = await client.get('/fixture', { headers: { 'X-Fixture-Trace': 'caller' } });
  assert.deepEqual(response.data, { success: true });
  return received;
}

async function check() {
  const before = load('before', '0.23.0');
  const after = load('after', '1.21.0');
  assert.deepEqual(diagnostics(before, legacy), []);
  assert.deepEqual(diagnostics(after, legacy), [2322]);
  assert.deepEqual(diagnostics(after, repaired), []);
  const old = await sent(before.client, config => { config.headers = { 'X-Fixture-Mode': 'probe' }; });
  assert.equal(old['X-Fixture-Mode'], 'probe');
  assert.equal(old['X-Fixture-Trace'], undefined);
  const current = await sent(after.client, config => { config.headers.set('X-Fixture-Mode', 'probe'); });
  assert.equal(current.get('X-Fixture-Mode'), 'probe');
  assert.equal(current.get('X-Fixture-Trace'), 'caller');
  console.log('AxiosHeaders.set typechecks and preserves caller headers through the adapter.');
}

check().catch(error => { console.error(error); process.exitCode = 1; });
