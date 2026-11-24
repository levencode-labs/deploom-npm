# Preserve displayed wall time with toZonedTime in date-fns-tz 3

The pinned Port of Bruges migration renames utcToZonedTime to toZonedTime at Europe/Brussels schedule call sites. The npm lock pairs date-fns-tz 2.0.0 with date-fns 2.29.3 before the change and date-fns-tz 3.2.0 with date-fns 4.1.0 after it.

An offline npm 11.16.0 lockfile-only install with strict peers returned ERESOLVE when date-fns remained at 2.29.3. date-fns-tz 3.2.0 declares date-fns ^3.0.0 || ^4.0.0. The locked 4.1.0 pair installs and is used for the target replay.

The old name is missing from the target package. The new helper and the upgraded formatter render the same spring transition from 01:59 to 03:00 and the same two 02:30 values at distinct autumn instants. Compare wall-time output separately from the original UTC instant.

Replace the old utcToZonedTime import and call with toZonedTime. Include a compatible date-fns resolution if the project still uses 2.x. To reproduce the peer conflict in a scratch project, run npm install --package-lock-only --ignore-scripts --strict-peer-deps date-fns@2.29.3 date-fns-tz@3.2.0. Check local-time formatting around both daylight-saving boundaries in the project's time zone. Keep the UTC instant available for ordering or identity where local time can repeat.

The replay pins Node 24.18.0 and npm 11.16.0 and runs in a UTC process time zone. It covers forward conversion and formatting for Brussels. Parsing ambiguous local input, other locales and the full schedule UI require separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Port of Bruges time zone migration](https://github.com/eliaslecomte/portdebruges.eu/commit/328b9d49cff70d07445e58927ac05820a4b64b63)
- [date-fns-tz 3 migration release](https://github.com/marnusw/date-fns-tz/releases/tag/v3.0.0)
