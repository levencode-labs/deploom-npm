'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join, resolve } = require('node:path');
const esbuild = require('./after/node_modules/esbuild');
const ts = require('./after/node_modules/typescript');

assert.equal(require('./before/node_modules/date-fns/package.json').version, '2.30.0');
assert.equal(require('./after/node_modules/date-fns/package.json').version, '3.6.0');
assert.equal(esbuild.version, '0.25.12');

const defaultImports = `
import differenceInMinutes from 'date-fns/differenceInMinutes';
import format from 'date-fns/format';
import formatDistanceStrict from 'date-fns/formatDistanceStrict';
`;
const namedImports = "import { differenceInMinutes, format, formatDistanceStrict } from 'date-fns';";
const application = `
const start = new Date(2024, 6, 16, 13, 30);
const end = new Date(2024, 6, 16, 14, 15);
console.log(JSON.stringify({
  display: format(start, 'yyyy-MM-dd HH:mm'),
  minutes: differenceInMinutes(end, start),
  distance: formatDistanceStrict(end, start, { unit: 'minute' }),
}));
`;

function bundle(arm, imports) {
  return esbuild.buildSync({
    stdin: {
      contents: imports + '\n' + application,
      resolveDir: join(__dirname, arm),
      sourcefile: 'notification.js',
    },
    bundle: true,
    write: false,
    platform: 'neutral',
    mainFields: ['module', 'main'],
    format: 'cjs',
    logLevel: 'silent',
  }).outputFiles[0].text;
}

function diagnostics(arm, imports) {
  const entry = join(__dirname, arm, 'notification.ts');
  const options = {
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    allowSyntheticDefaultImports: false,
    strict: true,
    noEmit: true,
    skipLibCheck: true,
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const getSourceFile = host.getSourceFile;
  host.getSourceFile = (file, ...args) => {
    if (resolve(file) === entry) {
      return ts.createSourceFile(file, imports + '\n' + application, args[0]);
    }
    return getSourceFile(file, ...args);
  };
  return ts.getPreEmitDiagnostics(ts.createProgram([entry], options, host))
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}

function verify(code) {
  const result = spawnSync(process.execPath, ['-'], {
    input: code, encoding: 'utf8', timeout: 15_000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    display: '2024-07-16 13:30',
    minutes: 45,
    distance: '45 minutes',
  });
}

assert.deepEqual(diagnostics('before', defaultImports), []);
const held = diagnostics('after', defaultImports);
assert.equal(held.length, 3, held.join('\n'));
for (const diagnostic of held) {
  assert.match(diagnostic, /has no default export/i);
}
verify(bundle('before', defaultImports));
verify(bundle('after', defaultImports));

for (const arm of ['before', 'after']) {
  assert.deepEqual(diagnostics(arm, namedImports), []);
  verify(bundle(arm, namedImports));
}
console.log('Named imports satisfy both declaration sets and preserve packed notification output.');
