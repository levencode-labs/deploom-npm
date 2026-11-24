const assert = require('node:assert/strict');
const { compilerOptions } = require('./compiler-options.json');

const baseline = require('typescript-before');
const candidate = require('typescript-after');
assert.equal(baseline.version, '5.9.2');
assert.equal(candidate.version, '6.0.3');

function targetDiagnostics(compiler, options) {
  const parsed = compiler.convertCompilerOptionsFromJson(options, __dirname);
  const program = compiler.createProgram([], { ...parsed.options, noEmit: true });
  return [...parsed.errors, ...program.getOptionsDiagnostics()]
    .filter(item => /target.*ES5/i.test(compiler.flattenDiagnosticMessageText(item.messageText, ' ')))
    .map(item => item.code);
}

for (const strict of [true, false]) {
  const options = { ...compilerOptions, strict };
  assert.equal(options.target, 'es5');
  assert.deepEqual(targetDiagnostics(baseline, options), []);
  assert.deepEqual(targetDiagnostics(candidate, options), [5107]);
  assert.deepEqual(targetDiagnostics(candidate, { ...options, target: 'es2015' }), []);
  assert.deepEqual(targetDiagnostics(candidate, { ...options, ignoreDeprecations: '6.0' }), []);
}

console.log('TypeScript 5.9.2 accepts ES5; 6.0.3 reports TS5107 in both options profiles.');
