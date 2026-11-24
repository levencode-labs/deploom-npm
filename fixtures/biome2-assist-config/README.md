# Migrate Biome import organization and excluded files with the v2 CLI

The pinned JSONPath JS upgrade moves organizeImports into an assist action and translates the file exclusions to files.includes. Its npm lock pins Biome 1.9.4 and 2.0.4.

The fixture runs the old CLI on a sample project. It sorts the selected imports and leaves a generated file unchanged. The v2 CLI rejects the held config. Running the pinned local Biome 2 CLI with migrate --write in a temporary fixture moves the option and translates the exclusion. A subsequent Biome 2 check sorts the selected imports while preserving the generated file byte for byte.

Apply when a Biome 1 config uses organizeImports and files.ignore. Run biome migrate --write from the affected config root with the verified target CLI and review the converted globs. Check an included source and an excluded generated source. Biome 2 may sort other import groups differently, so sample the project's real ordering conventions.

The reproduction pins Node 24.18.0 and npm 11.16.0 and uses the matching optional CLI binaries. It exercises one nested generated exclusion and relative import sorting. Workspace overrides, VCS ignores and other lint or format changes require their own checks.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned JSONPath JS Biome migration](https://github.com/ashphy/jsonpath-js/commit/04cbbbac25d09c9d6b55c4fe9ba1ea812cfee377)
- [Biome v2 configuration migration guide](https://biomejs.dev/installation/upgrade-to-biome-v2/)
