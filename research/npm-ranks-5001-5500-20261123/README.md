# DepLoom npm Knowledge Factory — Batch 11 (ranks 5001–5500)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Draft and unmerged. No paid OpenAI API, Cache v2 admission, signing, deployment or merge.

## Pinned input and one registry run

The source is pinned to `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, CSV SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`. The committed index blob is `ca9f7d2e2f659b0af0f289de341475acefdf8fb1`. The 500 contiguous rows cover ranks 5001–5500.

Original registry workflow run [#45236591264](https://github.com/levencode-labs/deploom-npm/actions/runs/45236591264) completed once, attempt 1, with all six jobs successful. It reported 499 exact public npm version metadata records and one `UNKNOWN_HTTP_404`: rank 5484, `@voyantjs/core@0.109.0`. No registry probes have been repeated.

## Original artifact integrity

The separate no-npm audit workflow [#45239960358](https://github.com/levencode-labs/deploom-npm/actions/runs/45239960358) passed. It downloaded the five original ZIPs, verified ZIP SHA-256/size and inner JSON SHA-256/size, then checked all 500 record identities, versions, ranks and statuses against the pinned index and original run. Digests and artifact URLs are recorded in `registry-receipts-manifest.json`; `verify_receipts.py --artifact-dir <directory>` replays archive byte and record checks offline.

The next PR synchronization uses the manifest-backed offline verifier for all five matrix parts; it must not make npm requests. Tamper-negative controls run with `python -m unittest discover -s research/npm-ranks-5001-5500-20261123 -p 'test_*.py' -v`.

## Interpretation

CSV rows and exact-version npm metadata do not establish changelogs, breaking changes, codemods, compatibility, or successful migrations. Batch 11 adds zero migration fixtures and zero Cache v2 records.
