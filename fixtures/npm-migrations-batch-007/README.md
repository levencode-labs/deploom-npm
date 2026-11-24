# npm migration controls, batch 007

Fixtures cover the public portion of the seventh list. The archive checks compare published Node and peer constraints, package entry points and selected React Hookz exports. The Playwright Component Testing check resolves its exact transitive core and exercises the new locator snapshot with an isolated channel. It does not install or launch browsers.

Use Node 24 and npm. Run `npm ci --ignore-scripts --no-audit --no-fund` in `p00` and `ct-accessibility`, then run `node check.cjs`.

Verify receipts independently with `python verify_facts.py archives` after downloading each exact version named in `facts.json`. The directory uses standard npm pack file names.

- [Playwright release notes](https://playwright.dev/docs/release-notes)
- [React Hookz releases](https://github.com/react-hookz/web/releases)
- [Creevey changelog](https://github.com/creevey/creevey/blob/master/CHANGELOG.md)
