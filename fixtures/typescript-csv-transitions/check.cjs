'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdirSync, mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

const cases = [
  {
    id: 'typescript54-enum-values',
    from: '5.3.3', to: '5.4.2', code: 2322,
    before: 'namespace Client { export enum State { Ready = 1, Stopped = 2 } } namespace Server { export enum State { Ready = 1, Stopped = 9 } } function fromServer(value: Server.State): Client.State { return value; }',
    after: 'namespace Client { export enum State { Ready = 1, Stopped = 2 } } namespace Server { export enum State { Ready = 1, Stopped = 9 } } function fromServer(value: Server.State): Client.State { return value === Server.State.Ready ? Client.State.Ready : Client.State.Stopped; }',
  },
  {
    id: 'typescript55-filter-type-predicate',
    from: '5.4.5', to: '5.5.2', code: 2345,
    before: 'const values: (number | undefined)[] = [1, undefined]; const available = values.filter(value => value !== undefined); available.push(undefined);',
    after: 'const values: (number | undefined)[] = [1, undefined]; const available: (number | undefined)[] = values.filter(value => value !== undefined); available.push(undefined);',
  },
  {
    id: 'typescript56-iterator-return',
    from: '5.5.4', to: '5.6.2', code: 2322,
    before: 'const next = new Set(["value"]).values().next(); export const first: string = next.value;',
    after: 'const next = new Set(["value"]).values().next(); export const first: string = next.done ? "" : next.value;',
  },
  {
    id: 'typescript57-uninitialized-closure',
    from: '5.6.3', to: '5.7.2', code: 2454,
    before: 'let label: string; export function readLabel() { return label.toUpperCase(); }',
    after: 'let label: string = "unknown"; export function readLabel() { return label.toUpperCase(); }',
  },
  {
    id: 'typescript58-import-attributes',
    from: '5.7.3', to: '5.8.2', code: 2880,
    before: 'import data from "./data.json" assert { type: "json" }; export default data;',
    after: 'import data from "./data.json" with { type: "json" }; export default data;',
    beforeOptions: { module: 'nodenext', resolveJsonModule: true },
  },
  {
    id: 'typescript59-buffer-source',
    from: '5.8.3', to: '5.9.2', code: 2322,
    before: 'export function blob(bytes: Uint8Array) { return new Blob([bytes]); }',
    after: 'export function blob(bytes: Uint8Array) { return new Blob([new Uint8Array(bytes)]); }',
  },
  {
    id: 'typescript7-baseurl',
    from: '6.0.2', to: '7.0.2', code: 5102,
    before: 'import { tag } from "app/config"; export default tag;',
    after: 'import { tag } from "app/config"; export default tag;',
    beforeOptions: { baseUrl: '.', ignoreDeprecations: '6.0' },
    afterOptions: { paths: { 'app/*': ['./app/*'] } },
  },
];

function compile(version, root, source, options = {}) {
  const path = require.resolve('ts-' + version.replaceAll('.', '-') + '/package.json');
  const manifest = require(path);
  assert.equal(manifest.version, version);
  writeFileSync(join(root, 'entry.mts'), source);
  writeFileSync(join(root, 'tsconfig.json'), JSON.stringify({
    compilerOptions: { strict: true, noEmit: true, target: 'es2022', types: [], pretty: false, ...options },
    files: ['entry.mts'],
  }));
  const bin = join(path, '..', manifest.bin.tsc);
  const check = spawnSync(process.execPath, [bin, '--project', join(root, 'tsconfig.json')], {
    cwd: root, encoding: 'utf8', timeout: 30000,
  });
  if (check.error) throw check.error;
  return { status: check.status, output: check.stdout + check.stderr };
}

const root = mkdtempSync(join(tmpdir(), 'deploom-ts-transitions-'));
try {
  mkdirSync(join(root, 'app'));
  writeFileSync(join(root, 'app', 'config.ts'), 'export const tag = "test";');
  writeFileSync(join(root, 'data.json'), '{"enabled":true}');
  let failures = 0;
  for (const item of cases) {
    const old = compile(item.from, root, item.before, item.beforeOptions);
    const broken = compile(item.to, root, item.before, item.beforeOptions);
    const fixed = compile(item.to, root, item.after, item.afterOptions ?? item.beforeOptions);
    try {
      assert.equal(old.status, 0, old.output);
      assert.notEqual(broken.status, 0, 'Unchanged source and config should fail.');
      assert.match(broken.output, new RegExp('error TS' + item.code + ':'));
      assert.equal(fixed.status, 0, fixed.output);
      console.log(item.id + ': baseline passes, held control reports TS' + item.code + ', fix passes');
    } catch {
      failures += 1;
      console.error(item.id, { old, broken, fixed });
    }
  }
  assert.equal(failures, 0);
} finally {
  rmSync(root, { recursive: true, force: true });
}
