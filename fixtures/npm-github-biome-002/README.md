# Verify the Biome 1.0.0 to 2.0.0 configuration migrator

The old CLI sorts a sample file and leaves the excluded generated file untouched. The target rejects the retained v1 configuration. The target's bundled `biome migrate --write` CLI moves `organizeImports` into an assist action and converts the tested exclusion to a negated include. Rerunning the target check sorts the included file. The excluded file stays byte-identical.

The test uses Node.js 24.18.0. Install the exact before and after lockfiles with `npm ci --include=optional --ignore-scripts --no-audit --no-fund --strict-peer-deps` in each arm, then run `node check.cjs`.

Review converted globs and test included and excluded files in the receiving project. [Biome v2 migration guide](https://biomejs.dev/installation/upgrade-to-biome-v2/)
