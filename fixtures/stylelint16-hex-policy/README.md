# Preserve hex color casing when upgrading Stylelint 16

Wikimedia's shared configuration moved from Stylelint `15.10.1` and `stylelint-stylistic@0.4.3` to Stylelint `16.2.0` and `@stylistic/stylelint-plugin@2.0.0`. It kept its lowercase hex policy by renaming `stylistic/color-hex-case` to `@stylistic/color-hex-case`. The fixture lockfiles contain only the dependencies used by this test, with versions and integrity values taken from the upstream locks.

- [Wikimedia migration](https://github.com/wikimedia/stylelint-config-wikimedia/commit/7f2a8d109b28a866a1a1bdd9739cdebdcdd351b0)
- [Before lock](https://github.com/wikimedia/stylelint-config-wikimedia/blob/395240a6c87bf6c9be7cc9da743a03e9ac64c5e6/package-lock.json) and [after lock](https://github.com/wikimedia/stylelint-config-wikimedia/blob/7f2a8d109b28a866a1a1bdd9739cdebdcdd351b0/package-lock.json)
- [Stylelint 16 migration guide](https://stylelint.io/migration-guide/to-16/)

## Reproduce

From this directory, use Node.js 22 or newer and npm.

```sh
npm ci --prefix before --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

On 15.10.1, both the legacy plug-in rule and the deprecated core rule flag an uppercase hex value. With the target plug-in installed, both old names produce unknown-rule diagnostics on 16.2.0. The updated rule still flags uppercase and allows lowercase. The checker exercises a local CSS sample and this individual rule. Run the receiving repository's full lint task to verify other rules, presets and file kinds.
