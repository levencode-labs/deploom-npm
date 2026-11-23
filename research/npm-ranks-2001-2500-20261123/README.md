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

## Original first-run registry receipt reconciliation — 2026-11-23

- [Original run #45217619875](https://github.com/levencode-labs/deploom-npm/actions/runs/45217619875) at **initial exact code `8998bdd1459f23eceb82bee6de8c960a83aecb5c`**, **6/6 terminal SUCCESS**, 5 independently downloaded and decompressed artifact ZIPs.
- Original results by rank partition: **100/0, 100/0, 100/0, 100/0, 100/0** (exact observed/UNKNOWN). Batch 05 **500 exact/0 UNKNOWN**; cumulative ranks 1–2500 **2496 exact/4 historical UNKNOWN**. 0 first-party fixture receipts or production v2 admissions.
- [Permanent original receipt ledger](registry-receipts-manifest.json) pins all 500 rank/name/version/status identities, exact original artifact IDs, ZIP and JSON SHA-256, byte counts, Git index integrity and cumulative totals. The original five ZIP files are archived by GitHub for 30 days.
- Use `python research/npm-ranks-2001-2500-20261123/verify_receipts.py` to validate immutable pinned attestations offline. For stronger independent replay of local original ZIPs: `python research/npm-ranks-2001-2500-20261123/verify_receipts.py --artifact-dir /path/to/original-zips`; names must be `npm-ranks-2001-2500-part-0.zip` through `-4.zip`. No network requests occur in either mode. After ledger commit, all five CI matrix jobs switch to offline verification, not 500 duplicate npm requests.
- **First-run independent ZIP/JSON digests:**

| Part | Exact ranks | Original artifact ID | JSON SHA-256 | ZIP SHA-256 |
| --- | --- | ---: | --- | --- |
| 0 | 2001–2100 | 14838378538 | `e8db54e2f9fa51d4cf98b28ecabbf5d138175213b0be558620517ea9fec073ad` | `64552b09bb3f03099f7835b85dd066bb5343a86c1d8cd4399bd5a11e287a12fa` |
| 1 | 2101–2200 | 14838972591 | `516d12d4ec30a278dbe7aefe6d7727f1c0573776a002207407b964e212bd32c0` | `175ee5097a0cace17548b15df059fd151bc817758816b75cf0053ebc4f8d39f3` |
| 2 | 2201–2300 | 14838628295 | `eebd34021a1ce456844a4e823ed7ff476c6e85535d086bc6d7568a0aebf00110` | `52c30ca5e81cf4362faedd58068f637bb4cfae6cc6bb41bf33fe56f271677bf0` |
| 3 | 2301–2400 | 14839576549 | `a926b49ae2725dfa8c033048f963d71cd48497f06930b907b064a675138b82dd` | `3e3d67de12c4641121b713b1271b700f4a0b88fa423b397e329ff421ab8972a4` |
| 4 | 2401–2500 | 14838483598 | `5132cd4eb18618bd6b5b6cc12feb0d65a0d668e3b2970a37b5f10a16863bc84c` | `bea3b146c735d495665940db6d962b20ea6dedb5d00c9ee79bb9cf3873ff874e` |

- Canonical rank/name/version listing SHA-256: `35b939522c9e1a55d6a02960d87955a46545a90f132e02e8baf92dd3ed833293`; Git blob SHA-1: `014f964247be3b0c9bf4bcad4b13b64e02dab886`.
- **Important:** original npm exact-version receipt proves only readable public version metadata. It is not a source-backed migration recipe, executed codemod or passing recipient fixture. No production records or signing/deployments are authorized by this research.
