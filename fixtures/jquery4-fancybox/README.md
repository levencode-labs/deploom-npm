# jQuery 4 and legacy Fancybox

Glance upgraded jQuery while holding Fancybox at `3.5.7`. Its old gallery depended on APIs removed in jQuery 4. The application added local compatibility helpers. This fixture verifies the same versions and tests jQuery Migrate as a separate recovery option.

- [Glance upgrade](https://github.com/fenbyfluid/glance/commit/ca0db561c5182b3abd6f840838a5055e49063605)
- [Before lock](https://github.com/fenbyfluid/glance/blob/de48257a22c30785f1cb02dee037cec8918077f4/package-lock.json) and [after lock](https://github.com/fenbyfluid/glance/blob/ca0db561c5182b3abd6f840838a5055e49063605/package-lock.json)
- [Official jQuery 4 upgrade guide](https://jquery.com/upgrade-guide/4.0/)

## Reproduce

Use Node.js 22 or newer and npm. From this directory, run:

```sh
npm ci --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

jQuery `3.7.1` opens the gallery with Fancybox `3.5.7`, renders the configured HTML, and removes the dialog on close. Under `4.0.0`, the same plugin throws `$.isArray is not a function` on open. Loading `jquery-migrate@4.0.2` after jQuery and before Fancybox restores the open, content, and close behavior.

The test uses the shipped browser scripts in an isolated jsdom window. It verifies the DOM lifecycle. Check layout, keyboard focus, and any video or media behavior in the receiving project's browser tests. Treat Migrate as temporary compatibility while upgrading or replacing the legacy plugin.
