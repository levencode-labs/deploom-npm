'use strict';

const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { createRequire } = require('node:module');
const { join, resolve } = require('node:path');

const arms = resolve(process.argv[2] ?? __dirname);
const legacy = 'stylistic/color-hex-case';
const modern = '@stylistic/color-hex-case';
const upper = 'a { color: #ABC; }';
const lower = 'a { color: #abc; }';

function loadArm(name, version, plugin, pluginVersion) {
  const root = join(arms, name);
  const readManifest = pkg => JSON.parse(readFileSync(join(root, 'node_modules', pkg, 'package.json'), 'utf8'));
  assert.equal(readManifest('stylelint').version, version);
  assert.equal(readManifest(plugin).version, pluginVersion);
  const load = createRequire(join(root, 'package.json'));
  const stylelint = load('stylelint');
  return async (rule, code) => {
    const result = await stylelint.lint({
      code,
      codeFilename: join(root, 'fixture.css'),
      configBaseDir: root,
      config: { plugins: [load.resolve(plugin)], rules: { [rule]: 'lower' } },
      quietDeprecationWarnings: true,
    });
    const [file] = result.results;
    return { errored: result.errored, warnings: file.warnings };
  };
}

function rejectsUppercase(result, rule) {
  assert.equal(result.errored, true);
  assert.equal(result.warnings.length, 1, JSON.stringify(result.warnings));
  assert.equal(result.warnings[0].rule, rule);
  assert.match(result.warnings[0].text, /Expected "#ABC" to be "#abc"/);
}

async function main() {
  const before = loadArm('before', '15.10.1', 'stylelint-stylistic', '0.4.3');
  const after = loadArm('after', '16.2.0', '@stylistic/stylelint-plugin', '2.0.0');

  rejectsUppercase(await before(legacy, upper), legacy);
  rejectsUppercase(await before('color-hex-case', upper), 'color-hex-case');

  for (const rule of [legacy, 'color-hex-case']) {
    const held = await after(rule, upper);
    assert.equal(held.errored, true);
    const unknown = held.warnings.find(warning => warning.rule === rule);
    assert.match(unknown?.text ?? '', /Unknown rule /);
  }

  rejectsUppercase(await after(modern, upper), modern);
  const compliant = await after(modern, lower);
  assert.equal(compliant.errored, false);
  assert.deepEqual(compliant.warnings, []);
  console.log('Stylelint 16.2.0 rejects the old rule names; the maintained plugin preserves lower-case hex enforcement.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
