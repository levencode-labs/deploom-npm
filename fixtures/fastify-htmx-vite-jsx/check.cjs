const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { mkdtemp, readdir, rm } = require('node:fs/promises');
const inject = require('@rollup/plugin-inject');

async function main() {
  const root = __dirname;
  const scratch = await mkdtemp(path.join(root, '.deploom-check-'));
  const cases = [
    ['vite7', '7.3.6', 'exact', true],
    ['vite8', '8.1.5', 'exact', 'build-reject'],
    ['vite7', '7.3.6', 'explicit-classic', true],
    ['vite8', '8.1.5', 'explicit-classic', true],
    ['vite8', '8.1.5', 'oxc', true],
    ['vite7', '7.3.6', 'oxc', false],
  ];
  try {
    for (const [alias, version, configStyle, valid] of cases) {
      const vite = await import(alias);
      assert.equal(vite.version, version);
      const outDir = path.join(scratch, alias + '-' + configStyle);
      const factory = 'Html.createElement';
      const fragment = 'Html.Fragment';
      const plugin = {
        name: 'fastify-htmx-jsx-options-control',
        config(config) {
          if (configStyle === 'oxc') {
            config.oxc = { jsx: { runtime: 'classic', pragma: factory, pragmaFrag: fragment } };
          } else {
            config.esbuild = { jsxFactory: factory, jsxFragment: fragment };
            if (configStyle === 'explicit-classic') config.esbuild.jsx = 'transform';
          }
        },
      };
      const build = () => vite.build({
        root,
        configFile: false,
        logLevel: 'silent',
        plugins: [inject({ Html: '@kitajs/html' }), plugin],
        build: {
          outDir,
          minify: false,
          lib: { entry: path.join(root, 'input.jsx'), name: 'Example', formats: ['es'], fileName: 'entry' },
          rollupOptions: { external: ['@kitajs/html'] },
        },
      });
      if (valid === 'build-reject') {
        await assert.rejects(build(), /react\/jsx-runtime/);
        console.log(JSON.stringify({version,configStyle,build:'react/jsx-runtime unresolved'}));
        continue;
      }
      await build();
      const outputs = (await readdir(outDir)).filter(file => file.endsWith('.js') || file.endsWith('.mjs'));
      assert.equal(outputs.length, 1);
      const load = () => import(pathToFileURL(path.join(outDir, outputs[0])));
      if (valid) assert.equal((await load()).value, '<b>deploom</b>');
      else await assert.rejects(load(), /React is not defined/);
      console.log(JSON.stringify({version,configStyle,build:'pass',fixtureRuntime:valid?'renders exact HTML':'React is not defined'}));
    }
  } finally {
    assert.equal(path.dirname(scratch), root);
    assert(path.basename(scratch).startsWith('.deploom-check-'));
    await rm(scratch, { recursive: true });
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
