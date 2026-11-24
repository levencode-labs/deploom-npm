# Preserve bounded Faker integers after the datatype API removal

The pinned Daffodil migration replaces faker.datatype.number with faker.number.int at bounded integer call sites, including generated checkout values. The npm lock pins Faker 7.6.0 before and 9.8.0 after the upgrade.

The old call generates integers within the chosen range. The held call on Faker 9 fails because datatype.number is gone. The new number.int call preserves the inclusive range and repeatability when the seed is reset on the same release. The tested seed yields different sequences across the two releases.

Use number.int with explicit bounds for integer generators. Review snapshots that capture exact generated values and regenerate them deliberately when appropriate. Choose an API that preserves the actual numeric contract for old calls that rely on fractional precision or default bounds.

The fixture pins Node 24.18.0 and npm 11.16.0 and covers one seeded generator between 0 and 99. Locale changes, arbitrary seeds, fractional values and uniqueness policies require their own checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Daffodil Faker upgrade](https://github.com/graycoreio/daffodil/commit/7954a526600c303691a8e6ebd47ea6fcd1a53c0b)
- [Faker v9 breaking changes and numeric replacements](https://v9.fakerjs.dev/guide/upgrading.html)
