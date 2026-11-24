# npm migration controls, batch 005

The fixture checks 100 exact package pairs. Its controls use published Node and peer constraints, selected shipped option schemas and module declarations, and an isolated Happy DOM loader test. Each successful record states the condition observed in the fixture.

Run on Node.js 24.18.0 with npm 11.16.0. Run `npm ci --ignore-scripts --no-audit --no-fund` in both `p00` and `happy-esm`, then run `node check.cjs` from this directory.

For an independent archive replay, place the packages named in `facts.json` into `archives` using npm pack names. Use `python verify_facts.py archives` with Python 3.11 or later to verify archive SHA-512, manifest and selected files.

## Upstream migration material

- [Storybook 8](https://storybook.js.org/docs/8/migration-guide)
- [Stylelint 16](https://stylelint.io/migration-guide/to-16/)
- [webpack-dev-server 5](https://github.com/webpack/webpack-dev-server/blob/main/migration-v5.md)
- [jQuery 4](https://jquery.com/upgrade-guide/4.0/)
- [Puppeteer changelog](https://pptr.dev/CHANGELOG)
- [Happy DOM releases](https://github.com/capricorn86/happy-dom/releases)
- [qrcode.react changelog](https://github.com/zpao/qrcode.react/blob/trunk/CHANGELOG.md)
