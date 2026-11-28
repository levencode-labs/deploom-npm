# Stage B: practical migration evidence

Stage B adds executable, source-pinned migration evidence for coupled package
updates, package-manager differences, TypeScript workspaces, and browser user
flows. Each admitted claim needs a working baseline, an observed failure on
the upgraded dependencies, a minimal repair, an independent negative control,
and an assertion about the resulting application behavior.

## Fixed scope

| Suite | Exact transition | What the fixture must establish |
| --- | --- | --- |
| Coupled React browser app | React and React DOM 18.3.1 to 19.3.0; React Router DOM 6.30.3 to 7.18.4; React Transition Group remains 4.4.5 | Open/close transitions, nested relative navigation/back, and value/focus persistence in Chromium. The unfixed target and each partial fix distinguish the two migration defects. Both desktop and mobile viewports run all arms. |
| Package-manager portability | Prettier 2.8.8 to 3.0.0; Zod 3.25.76 to 4.6.7 | Observe the broken API use and the repaired behavior separately under npm, Yarn PnP, and pnpm. Malformed inputs still fail. A poisoned parent package must not satisfy an isolated arm's dependency resolution. |
| TypeScript workspaces | TypeScript 5.9.2 to 6.0.3 | Build contracts, domain, and app projects; consume emitted declarations and execute emitted JavaScript. Check the configuration repair, missing-reference and declaration negatives, an incremental dependency rebuild, and stale output after a failed build. |

The checker and README in each `fixtures/stageb-*` directory describe exact
inputs, expected diagnostics, and reproduction commands. Original fixture
coverage remains in place.

## Toolchain and matrix

Node is exactly **24.18.0**, with its bundled npm **11.16.0**. The portability
fixture additionally retains hash-locked npm **11.16.0**, Yarn **4.12.0**, and
pnpm **10.29.3** tools. Yarn runs its real Plug'n'Play loaders. Browser tools are
Playwright **1.56.1** and esbuild **0.25.10**, with the Chromium revision selected
by that Playwright package. Each browser report records the actual executable
hash and browser version.

The required matrix is fixed before qualification:

| Suite | Linux | Windows | Required legs |
| --- | --- | --- | ---: |
| Package managers | npm, Yarn PnP, pnpm | npm, Yarn PnP, pnpm | 6 |
| TypeScript workspaces | Full case set | Full case set | 2 |
| Coupled React browser app | All arms and both viewports | All arms and both viewports | 2 |
| **Total** | | | **10** |

The workflow uses `ubuntu-22.04` and `windows-latest`, exact Node/Python
versions, immutable dependency installation, and `fail-fast: false`. Runner
images are hosted images rather than archived operating-system images. The
matrix is not narrowed after a failed run.

## Execution receipts and acceptance

`Stage B practical migrations` checks out the exact PR head or pushed main
commit. After a checker passes, `ci/stage_b_receipts.py capture` binds its JSON
report to:

- The exact source commit and GitHub workflow run/attempt.
- The complete regular Git input blobs for its fixture, including every lock.
- The report's exact byte length and SHA-256.
- The exact Node version and operating-system family.

It rejects tracked input changes during execution. Browser screenshots and
the complete case reports are retained as workflow artifacts. The final
workflow job independently recomputes the Git inputs and report hashes and
requires all ten unique legs from the same source and workflow run. Missing,
duplicate, relabelled, or modified evidence fails verification. The small
receipt-transport tests use explicitly synthetic reports and are not migration
evidence.

Receipt hashing proves byte identity. The successful GitHub jobs and inspected
fixture assertions establish execution; a standalone JSON file is not an
execution attestation. Acceptance must cite the actual run and retained
artifacts, including an unsuccessful original run if a fix was required.

## Knowledge admission and release

Executable fixtures and their reviewed claims must reach trusted main before
knowledge records cite their immutable source. Public knowledge keeps the
existing advisory record contract. A coupled migration states the complete
tested package cohort in its conditions, and package-manager coverage is
limited to the managers actually executed for that claim.

After fixture acceptance, the Stage B knowledge change can add its records and
explicit v3 evidence reviews to the pending publisher. The existing v2 and v3
signers and readers must pass their full compatibility checks. Package and
public-data releases are a separate, deferred action.

Passing these fixtures supports `fixture-behavior` evidence for their reviewed
claims. It does not establish acceptance of a recipient project. The knowledge
records retain `projectStatus: UNKNOWN`, required applicability conditions,
and the existing archive-evidence policy.

## Qualified source and prepared knowledge

[PR #154](https://github.com/levencode-labs/deploom-npm/pull/154) was merged as
`66bc76d933cc40459a6b152d179ac2a70ee32c32` after all six PR/push workflows passed.
Its source tree equals the qualified fixture revision
`d90fd3f01dbf84778222b7e3ba1c11f22e89b2dc`. The complete Stage B
[qualification run](https://github.com/levencode-labs/deploom-npm/actions/runs/46162323251)
passed all ten Linux/Windows legs and aggregate verification: 12 package-manager
case executions, 16 workspace scenarios, and 20 browser scenarios.

The [qualification record](qualification/qualification.md) retains all eleven
original artifact ZIPs, all reports and receipts, twelve browser screenshots,
the failed original Windows setup run, and commands for independent offline
verification. [The manifest](qualification/manifest.json) binds the exact
artifact IDs, Git inputs and hashes. The Python availability correction kept
every matrix leg and fixture assertion intact.

Five new records are prepared in the pending publisher branch:

| Record | Verified managers |
| --- | --- |
| `stageb-prettier3-async-package-managers` | npm, Yarn PnP, pnpm |
| `stageb-zod4-issues-package-managers` | npm, Yarn PnP, pnpm |
| `stageb-typescript6-composite-workspace` | npm |
| `stageb-react-dom19-coupled-browser-transition` | npm |
| `stageb-react-router7-coupled-browser-splat` | npm |

The original 1,525 records and their scopes remain unchanged. The prepared
corpus contains **1,530 records across 695 packages**, with **104 reviewed
fixture sources** and **1,038 retained input entries**. All five additions have
the reviewed `fixture-behavior` level, increasing that level from 201 to 206
records. Archive and recipient-project outcomes remain `UNKNOWN`.

The complete offline publisher/reader check passed all 1,530 records through
the real production signers and separately pinned legacy v2/current v3 source
consumers. It also passed **45 new lookup checks** across legacy v2, current v2
and current v3: 27 supported exact queries and 18 unsupported-manager exclusions.
The old query, signature-domain, equal-revision and missing-scope controls stay
in place. [Actual stdout](knowledge-parity.jsonl) and its
[input identities](knowledge-parity-inputs.json) are retained. The test replaces
only the live registry identity probe; publication keeps that separate gate.

| Prepared bytes | SHA-256 |
| --- | --- |
| Raw v2 corpus | `bc89d4601eea4d2a57ba87124d147c6c11ab64ed5b89bff996b438a218d520b8` |
| Annotated v3 corpus | `1ce0090f5c0479389be7cc9efb4eaa59a0e5ea3cfe3001fcb9b7a40d479c8992` |
| Explicit review ledger | `1ae7d699a8dce222bc52b534c657508d93bae40c91ffa84ef2d6c6bd3ab92d4a` |

Package and Stage B public-data releases are deferred. The prepared knowledge
is held in [publisher PR #151](https://github.com/levencode-labs/deploom-npm/pull/151),
so the fixture merge alone does not publish the new records. The existing
release-wheel gate still applies before that publisher reaches main.
