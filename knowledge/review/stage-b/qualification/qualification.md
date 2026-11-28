# Stage B CI qualification record

The source revision below passed the complete Stage B matrix and all PR gates, including the Windows archive installation check. PR #154 was merged into main as `66bc76d933cc40459a6b152d179ac2a70ee32c32`, whose source tree is identical to the qualified PR source. Package and Stage B public-data releases remain deferred.

## Source and execution

- Repository: `levencode-labs/deploom-npm`, [PR #154](https://github.com/levencode-labs/deploom-npm/pull/154).
- Exact source commit: `d90fd3f01dbf84778222b7e3ba1c11f22e89b2dc`.
- Source tree: `038d003cc51614e25d51ae872899b7eaed6d28f7`.
- [Successful workflow run 46162323251](https://github.com/levencode-labs/deploom-npm/actions/runs/46162323251), attempt 1, completed `2026-11-28T15:57:01Z`.
- [Aggregate job 141032731930](https://github.com/levencode-labs/deploom-npm/actions/runs/46162323251/job/141032731930) passed all eight receipt-transport controls and verified all ten original execution reports against the source's Git inputs.

## Coverage and scenario counts

Every row ran on both `ubuntu-22.04` and `windows-latest`, on x64 with Node `24.18.0` and the CI Python pin `3.13.9`.

| Suite | Execution legs | Report-level scenarios per leg | Total |
|---|---:|---:|---:|
| npm `11.16.0`, Yarn `4.12.0` PnP, pnpm `10.29.3` isolated node_modules | 6 | 2 | 12 |
| TypeScript workspaces | 2 | 8 | 16 |
| Coupled React browser migration | 2 | 10 | 20 |
| **Total** | **10** | | **48** |

The 48 executions count the actual report rows, not distinct migration rules or every nested assertion. Package-manager rows each include baseline success, upgraded old-code failure, the minimal repair, reverted-fix and invalid-input controls, plus resolution-isolation checks. They cover Prettier `2.8.8 → 3.0.0` and Zod `3.25.76 → 4.6.7`. TypeScript `5.9.2 → 6.0.3` covers eight build, declaration, runtime and negative-control scenarios per OS.

UI qualification uses React/React DOM `18.3.1 → 19.3.0`, React Router DOM `6.30.3 → 7.18.4`, and React Transition Group `4.4.5`. Five variants run at desktop `1280×800` and emulated mobile `390×844`: baseline, upgraded-unfixed, transition-fix-only, route-fix-only and both-fixes. Playwright `1.56.1`, esbuild `0.25.10`, and Chromium headless shell `141.0.7390.37`, revision `1194`, are pinned. Reported browser-binary digests distinguish the two OS builds.

## Retained originals and verification

`zips/` contains all **11 original GitHub artifact ZIPs**. `artifacts/` contains their complete **33 extracted files**: ten execution reports, ten receipts, one aggregate acceptance report and twelve PNG screenshots. Original report bytes, including Windows path separators, are preserved. `manifest.json` maps every artifact ID and API digest to its ZIP, members and observed scenario identifiers. No temporary download URLs or credentials are retained.

Independent retention verification matched all 11 ZIP SHA-256 values and sizes to the GitHub API, checked ZIP integrity, compared every extracted file byte-for-byte with its ZIP member, and matched all twelve screenshot digests to the UI reports. Re-running the source-bound receipt verifier over the retained copies reproduced the original acceptance **byte-for-byte**:

```text
13ae70989bccd4db68ed1cad5df18846b903f77e5234c4f1f9ad6c72e4877fa9
```

The original GitHub acceptance ZIP has SHA-256 `679687117b76adf0d9c4ba517b4e5962187116227eb1576b795354df748359d6`. `SHA256SUMS` covers every retained file except itself. Preserve the ZIPs as well as the extracted members so their GitHub artifact digests remain independently checkable after hosted artifacts expire.

## Reproduce the offline acceptance check

Run these commands from the repository root, with this bundle retained at `knowledge/review/stage-b/qualification/`. Use the [receipt verifier from the qualified commit](https://github.com/levencode-labs/deploom-npm/blob/d90fd3f01dbf84778222b7e3ba1c11f22e89b2dc/ci/stage_b_receipts.py) in a checkout containing that Git commit and its fixture blobs. Python `3.13.9` matches CI. The verifier reads Git inputs and retained reports; it does not install dependencies or execute the migrations again.

```sh
(cd knowledge/review/stage-b/qualification && sha256sum --check SHA256SUMS)
python ci/stage_b_receipts.py verify knowledge/review/stage-b/qualification/artifacts \
  --commit d90fd3f01dbf84778222b7e3ba1c11f22e89b2dc \
  --run-id 46162323251 --output /tmp/stage-b-acceptance-recomputed.json
cmp /tmp/stage-b-acceptance-recomputed.json \
  knowledge/review/stage-b/qualification/artifacts/stageb-acceptance/stage-b-acceptance.json
```

## Qualification history

[Original run 46162090316](https://github.com/levencode-labs/deploom-npm/actions/runs/46162090316), source `1ad16200cf2b07c60d2bf7532bc65afc4269a8f6`, passed all five Ubuntu legs. All five Windows legs failed before fixture execution because setup-python could not find Python `3.12.14` for Windows x64. The original error was: “The version '3.12.14' with architecture 'x64' was not found for Windows 2025.” The aggregate correctly rejected that incomplete matrix.

The [official Python artifact manifest](https://raw.githubusercontent.com/actions/python-versions/main/versions-manifest.json) supplied `3.13.9` for both Windows x64 and Ubuntu 22.04 x64. The only source change was four Python-pin replacements in the workflow. The OS/manager matrix and all fixture assertions were unchanged. A fresh full run produced the successful evidence retained here; the failed run is not counted as Windows qualification. Original failed job IDs are recorded in `manifest.json`.

## Limits

This evidence demonstrates the pinned synthetic fixtures and their explicit controls. Recipient-project acceptance remains unknown. The successful [pre-merge Windows archive check](https://github.com/levencode-labs/deploom-npm/actions/runs/46162323221) is a separate repository gate and does not broaden these migration claims. Browser coverage is Chromium only; mobile results use viewport/touch emulation, without physical-device coverage. No macOS, Firefox or WebKit qualification is claimed. Offline hash verification establishes retained-byte integrity; execution provenance comes from the identified GitHub run. Re-executing fixtures additionally requires their committed sources and locks, package-manager tools, dependencies and pinned browser distribution.
