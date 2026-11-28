# TypeScript 6 across real npm project-reference workspaces

This fixture exercises one exact compiler transition, TypeScript **5.9.2 →
6.0.3**, in three local npm workspaces: `contracts → domain → app`. It performs
real clean solution builds, checks consumption of emitted declarations across
package boundaries, and executes the emitted CommonJS application. The app
prices a small invoice; its output is compared field by field.

## Exact inputs and execution

- Node.js **24.18.0**, npm **11.16.0**. The checker rejects a different toolchain.
- The fixture's `package-lock.json` pins the two TypeScript compiler aliases and
  their npm tarball integrity values. The checker invokes each compiler by its
  exact path; it does not use the ambiguous shared `.bin/tsc` alias.
- `workspace/package-lock.json` contains only the three local workspaces. Every
  fresh case runs an actual `npm ci --offline --ignore-scripts --engine-strict
  --strict-peer-deps --no-audit --no-fund`, verifies unchanged lock bytes, and
  checks that all three installed links resolve to that case's local packages.
- Each project has explicit `rootDir`, `outDir` and a private build-info file.
  Project references describe the build graph; the root references the app.
- Cases run in isolated temporary copies. No compiler outputs or mutations are
  written to the retained workspace inputs.

With the exact Node/npm installation on `PATH`, run from this directory:

```sh
npm ci --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs --output /path/outside/the/fixture/workspace-result.json
```

The report's top-level `status` is `passed` only when every control succeeds.
Expected compiler failures are reported as `expected: "reject"`, with the
actual nonzero exit and diagnostic codes. Reports include the actual toolchain,
checker hash, both lock hashes and observed application values. The retained
`observed/linux-x64.json` was produced locally with the exact toolchain; separate
Windows and Linux CI reports must qualify their own source commit and inputs.

## Reproduced failure and minimal repair

The original shared config uses `baseUrl: "."` with path targets that are
relative to that base. TypeScript 5.9.2 builds the complete graph and the emitted
application returns this invoice:

```json
{"currency":"USD","subtotalCents":2500,"taxCents":188,"totalCents":2688}
```

Keeping that config under TypeScript 6.0.3 fails with TS5101. The solution
builder continues checking downstream projects and also reports TS6305 (missing
upstream declaration output) and TS7006. Those are retained cascading failures,
not separate successful builds.

Removing `baseUrl` alone fails with TS5090 because the remaining `paths` targets
are not explicitly relative. The complete repair removes `baseUrl` and prefixes
those targets with `./`:

```diff
-    "baseUrl": ".",
     "paths": {
-      "@deploom-stageb/contracts": [ "packages/contracts/src/index.ts" ],
-      "@deploom-stageb/domain": [ "packages/domain/src/index.ts" ]
+      "@deploom-stageb/contracts": [ "./packages/contracts/src/index.ts" ],
+      "@deploom-stageb/domain": [ "./packages/domain/src/index.ts" ]
     }
```

The repaired TypeScript 6 build produces the same invoice. The application
keeps its existing Node-compatible package imports and npm workspace links;
this case does not require runtime alias rewriting. It does not use
`ignoreDeprecations`, `skipLibCheck`, a compiler downgrade or a widened dependency
range to suppress a failure.

## Controls and observed outcomes

| Case | Required result | What is checked |
| --- | --- | --- |
| TS 5.9.2 baseline | Build and application pass | Clean graph, all three local workspace links, invoice 2688, emitted declarations consumed. |
| TS 6.0.3 unchanged config | Reject: TS5101, TS6305, TS7006 | The incompatible config does not produce an accepted app build. |
| Remove only `baseUrl` | Reject: TS5090, TS6305, TS7006 | The partial repair does not preserve path-target interpretation. |
| Remove `baseUrl`, make paths relative | Build and application pass | Same invoice, separate declaration and runtime boundaries. |
| Remove app project references | Reject: TS6059, TS6307 | A fresh build cannot silently treat the other workspaces' source as part of the app. |
| Mutate emitted domain declaration | Reject: TS2739 | Making the declaration return `Promise<Receipt>` is visible to the app compiler, while the original source still returns `Receipt`. |
| Rebuild after a contracts change | Build and application pass | Changing the tax constant to 1000 updates its emitted declaration and the running app's invoice to 2750. |
| Type error with old emitted JS present | Reject: TS2322 | Old JS remains runnable and unchanged; its successful execution does not make the failed rebuild acceptable. |

Both successful clean builds ask the app compiler for its complete input file
list. The list must contain `contracts/dist/index.d.ts` and
`domain/dist/index.d.ts`, and must exclude their source files. The deliberate
declaration mismatch adds a separate negative check of that boundary.

The stale-output case deliberately executes the earlier JS as a **negative
control** after introducing an incompatible invoice currency. Its success
demonstrates why runtime-only checking is insufficient. The acceptance result
remains false because the new source did not build.

## Scope of the claim

The receipt claims a tested TypeScript 5.9.2 → 6.0.3 migration with a specific
inherited config and npm project-reference graph. It supports
`fixture-behavior`: real compiler processes and the emitted app are exercised.
It does not establish acceptance of a recipient project, package-archive
attestation, Yarn/PnP or pnpm equivalence, arbitrary module modes, asset imports,
or browser behavior. Those require their own evidence.
