# Vite library stylesheet filenames

This fixture checks Vite 5.4.2 and 8.3.8 with the same synthetic library input. Use Node.js 24 and npm 11. The last argument is an existing scratch directory for emitted files.

```sh
npm ci --ignore-scripts
node check.cjs node_modules/vite5/dist/node/index.js node_modules/vite8/dist/node/index.js /path/to/scratch
```

The baseline emits `style.css`. The held target emits the package-named stylesheet, leaving the old consumer path missing. Setting `build.lib.cssFileName` restores that path. The fixture also checks the fallback to a string `build.lib.fileName` and an ordinary HTML build's separate asset naming. Each stylesheet must still contain the same positioning rule.

The Vite 6 migration guide documents when the default changed. This fixture proves the exact pair above. It does not establish browser support or build behavior for other versions.

- [Vite 6 migration guide](https://v6.vite.dev/guide/migration.html#customize-css-output-file-name-in-library-mode)
- [Pinned receiving project's content build config](https://github.com/antfu-collective/vitesse-webext/blob/d237f4c00f1ac2cae9ea2b3d5dd93dd64d465073/vite.config.content.mts)
