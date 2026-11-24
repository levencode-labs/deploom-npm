const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

function compile(arm, version, declaration, checks = '') {
  const root = path.join(__dirname, arm);
  const ts = require(path.join(root, 'node_modules/typescript'));
  assert.equal(ts.version, '5.9.2');
  assert.equal(require(path.join(root, 'node_modules/vitest/package.json')).version, version);
  assert.equal(require(path.join(root, 'node_modules/vite/package.json')).version, '7.1.3');
  const folder = fs.mkdtempSync(path.join(root, 'type-probe-'));
  const file = path.join(folder, 'matcher.mts');
  try {
    fs.writeFileSync(file, `
      import { expect } from 'vitest';
      import { z, type Schema } from 'zod';
      interface CustomMatchers<Result> {
        toMatchSchema(schema: Schema): Result;
      }
      declare module 'vitest' {
        ${declaration}
      }
      const ordinary = expect('sample').toMatchSchema(z.string());
      ${checks}
    `);
    const program = ts.createProgram([file], {
      module: ts.ModuleKind.NodeNext,
      moduleResolution: ts.ModuleResolutionKind.NodeNext,
      target: ts.ScriptTarget.ES2022,
      strict: true,
      noEmit: true,
      skipLibCheck: true,
      types: [],
    });
    const diagnostics = ts.getPreEmitDiagnostics(program);
    return diagnostics.map(item => ({
      code: item.code,
      message: ts.flattenDiagnosticMessageText(item.messageText, ' '),
    }));
  } finally {
    fs.rmSync(file, { force: true });
    fs.rmdirSync(folder);
  }
}

const original = 'interface Matchers<T> extends CustomMatchers<T> {}';
const migrated = 'interface Matchers<R, T> extends CustomMatchers<R> {}';
assert.deepEqual(compile('before', '3.2.4', original), []);
const beforePatched = compile('before', '3.2.4', migrated);
assert.ok(beforePatched.some(item => item.code === 2428), JSON.stringify(beforePatched));
const held = compile('after', '5.0.0', original);
assert.ok(held.some(item => item.code === 2428), JSON.stringify(held));
const checks = `
  type Equal<A, B> = (<T>() => T extends A ? 1 : 2) extends
    (<T>() => T extends B ? 1 : 2) ? true : false;
  type Assert<A extends true> = A;
  const promised = expect(Promise.resolve('sample')).resolves.toMatchSchema(z.string());
  type Sync = Assert<Equal<typeof ordinary, void>>;
  type Async = Assert<Equal<typeof promised, Promise<void>>>;
  expect({ value: 'sample' }).toEqual({ value: expect.toMatchSchema(z.string()) });
  // @ts-expect-error The custom matcher still needs a Zod schema
  expect('sample').toMatchSchema('invalid');
`;
assert.deepEqual(compile('after', '5.0.0', migrated, checks), []);
console.log('Matcher declaration merges on the intended major; Vitest 5 preserves sync, promise, and asymmetric types.');
