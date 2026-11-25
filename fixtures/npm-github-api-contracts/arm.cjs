'use strict';

const assert = require('node:assert/strict');
const { join } = require('node:path');
const { spawnSync } = require('node:child_process');
const { createRequire } = require('node:module');
const { readFileSync } = require('node:fs');

function arm(cwd, name, version, alias) {
  const req = createRequire(join(cwd, 'package.json'));
  const root = join(cwd, 'node_modules', ...alias.split('/'));
  const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));
  assert.equal(manifest.name, name);
  assert.equal(manifest.version, version);
  return {
    manifest, root, cwd,
    load: (subpath = '') => req(alias + subpath),
    resolve: (subpath = '') => req.resolve(alias + subpath),
    peer: req,
    sandbox(code, flags = []) {
      const run = spawnSync(process.execPath, [...flags, '-e', code, alias], {
        cwd, encoding: 'utf8', timeout: 15000,
      });
      if (run.error) throw run.error;
      return run;
    },
  };
}

module.exports = { arm };
