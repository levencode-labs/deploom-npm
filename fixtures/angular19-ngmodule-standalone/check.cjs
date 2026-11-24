'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { mkdtempSync, rmSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

const compilerOptions = {
  target: 'ES2022',
  module: 'ES2022',
  moduleResolution: 'bundler',
  experimentalDecorators: true,
  skipLibCheck: true,
  noEmit: true,
  strict: true,
};

function compile(arm, version, explicitlyNonStandalone) {
  const root = join(__dirname, arm);
  const manifest = require(join(root, 'node_modules', '@angular', 'compiler-cli', 'package.json'));
  assert.equal(manifest.version, version);
  assert.equal(require(join(root, 'node_modules', '@angular', 'core', 'package.json')).version, version);
  assert.equal(require(join(root, 'node_modules', 'typescript', 'package.json')).version, '5.5.4');

  const ngc = join(root, 'node_modules', '@angular', 'compiler-cli', manifest.bin.ngc);
  const cwd = mkdtempSync(join(root, 'test-'));
  try {
    const metadata = ["selector: 'fixture-root'", "template: '<p>Ready</p>'"];
    if (explicitlyNonStandalone) metadata.push('standalone: false');
    writeFileSync(join(cwd, 'app.ts'), [
      "import { Component, NgModule } from '@angular/core';",
      '@Component({' + metadata.join(', ') + '})',
      'export class AppComponent {}',
      '@NgModule({declarations: [AppComponent]})',
      'export class AppModule {}',
    ].join('\n'));
    writeFileSync(join(cwd, 'tsconfig.json'), JSON.stringify({ compilerOptions, files: ['app.ts'] }));

    const result = spawnSync(process.execPath, [ngc, '-p', 'tsconfig.json'], {
      cwd, encoding: 'utf8', timeout: 30000,
    });
    if (result.error) throw result.error;
    return { status: result.status, diagnostics: result.stdout + result.stderr };
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

const oldVersion = '18.2.14';
const targetVersion = '19.2.25';
const baseline = compile('before', oldVersion, false);
assert.equal(baseline.status, 0, baseline.diagnostics);
const held = compile('after', targetVersion, false);
assert.equal(held.status, 1, held.diagnostics);
assert.match(held.diagnostics, /(?:NG6008|TS-996008):[^\n]*standalone/i);
const migrated = compile('after', targetVersion, true);
assert.equal(migrated.status, 0, migrated.diagnostics);
const preMigration = compile('before', oldVersion, true);
assert.equal(preMigration.status, 0, preMigration.diagnostics);
console.log('Angular 19 compiles the preserved NgModule declaration with standalone: false.');
