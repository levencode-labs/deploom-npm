# DepLoom Knowledge Factory — batch 05 (ranks 2001–2500)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Source-exact inventory and bounded anonymous npm metadata observations; **zero paid API, zero production admission**.

## Immutable input and non-overlap

- Original historical `curran/npm-top-packages-dataset` commit `54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, file `npm-top-10000.csv`; Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`; 6,972,515 bytes, 9,999 unique physical-ranked rows, byte SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`.
- Only ranks **2001–2500 inclusive**, 500 distinct names in original June-2026 CSV physical order; first `@styled-system/variant@5.1.5`, last `@oxlint/binding-darwin-x64@1.70.0`.
- Exactly five disjoint parts: **2001–2100, 2101–2200, 2201–2300, 2301–2400, 2401–2500**. Previous batches 1–2000 ([PR #47](https://github.com/levencode-labs/deploom-npm/pull/47), [#48](https://github.com/levencode-labs/deploom-npm/pull/48), [#49](https://github.com/levencode-labs/deploom-npm/pull/49), [#50](https://github.com/levencode-labs/deploom-npm/pull/50)) are immutable history, **never resubmitted**. Continuation cursor after full reconciliation is 2501; rotate after rank 3000.
- [Durable previous checkpoint](https://github.com/levencode-labs/deploom-playground/issues/9#issuecomment-7107043319): prior 1996 exact public registry metadata, 4 UNKNOWN, zero production v2 admissions; neither count proves a migration.

## Checks and bounded workflow

- `index.json` captures every rank, package, pinned CSV latest version and selected CSV metadata, with explicit `PENDING` registry status; `batch.py inventory --download` verifies the entire CSV SHA-256, Git blob SHA-1, original physical order, row count and every selected item.
- Offline negative controls: `python -m unittest discover -s research/npm-ranks-2001-2500-20261123 -p 'test_*.py' -v`. Production read/write paths are outside this PR.
- [Separate read-only workflow](../../.github/workflows/npm-ranks-2001-2500-research.yml): one inventory gate then five bounded registry partitions (maximum two active jobs, two workers/job, 15 s HTTP timeout, three attempts, 500 KB response cap). No secrets, no ambient proxies, no redirects. Failed requests / identity mismatch / malformed response are **UNKNOWN**, not success.
- Initial execution produces five 100-record JSON artifacts, each containing canonical rank/version URL, parsed metadata, raw response SHA-256 if valid, and explicit status. GitHub retains original ZIP artifacts for 30 days. Independent reconciliation must download the original five ZIPs, validate exact 500-rank identity and both inner JSON + ZIP SHA-256, pin original workflow/commit/artifact IDs and all status counts in `registry-receipts-manifest.json`, and only then add offline `verify_receipts.py` that never re-queries submitted ranks.
- `official-references.json` initially has **no promoted transition cards**. First-party tagged source proof, frozen positive/negative target fixtures, independent review, trusted-main admission and protected signing/verified-pages gate are separately required; official references alone are **REFERENCE_ONLY**, never Cache v2 proof.

This is an isolated, draft/unmerged research branch, not a release or migration recipe.
