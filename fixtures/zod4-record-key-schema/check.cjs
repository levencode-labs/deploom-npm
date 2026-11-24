const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const { z: before } = require('zod-before');
const { z: after } = require('zod-after');

assert.equal(require('zod-before/package.json').version, '3.25.76');
assert.equal(require('zod-after/package.json').version, '4.6.7');
assert.equal(ts.version, '6.0.3');

function diagnostics(moduleName, keys) {
  const folder = fs.mkdtempSync(path.join(__dirname, 'types-'));
  const file = path.join(folder, 'record.cts');
  try {
    fs.writeFileSync(file, [
      `import { z } from '${moduleName}';`,
      'const values = z.union([z.string(), z.number(), z.boolean(), z.null()]);',
      `export const schema = z.object({ params: z.record(${keys}values).optional().default({}) });`,
    ].join('\n'));
    const program = ts.createProgram([file], {
      module: ts.ModuleKind.Node16,
      moduleResolution: ts.ModuleResolutionKind.Node16,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
    });
    return ts.getPreEmitDiagnostics(program).map(item => item.code);
  } finally {
    fs.rmSync(file, { force: true });
    fs.rmdirSync(folder);
  }
}

assert.deepEqual(diagnostics('zod-before', ''), []);
assert.deepEqual(diagnostics('zod-after', ''), [2554]);
assert.deepEqual(diagnostics('zod-after', 'z.string(), '), []);

const values = z => z.union([z.string(), z.number(), z.boolean(), z.null()]);
const shape = (z, dictionary) => z.object({ params: dictionary.optional().default({}) });
const legacy = shape(before, before.record(values(before)));
const held = shape(after, after.record(values(after)));
const repaired = shape(after, after.record(after.string(), values(after)));
const populated = { params: { label: 'example', limit: 3, enabled: true, nullable: null } };
for (const schema of [legacy, held, repaired]) {
  assert.deepEqual(schema.parse(populated), populated);
  assert.deepEqual(schema.parse({}), { params: {} });
  assert.deepEqual(schema.parse({ params: {} }), { params: {} });
  assert.equal(schema.safeParse({ params: { invalid: [] } }).success, false);
}

console.log('Zod 4.6.7 retains the runtime overload; explicit string keys clear TS2554 and preserve parsed values.');
