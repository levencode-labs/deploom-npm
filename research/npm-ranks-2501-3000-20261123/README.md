# DepLoom Knowledge Factory — batch 06 (ranks 2501–3000)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Pinned historical source inventory and bounded anonymous npm metadata checks. **No paid API, production writes, signing, deployment, or merge.**

## Immutable source and strict non-overlap

- `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, `npm-top-10000.csv`, historical June-2026 physical order, 9,999 unique package ranks. Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`; byte SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`; 6,972,515 bytes. **Never re-rank by current downloads.**
- Strict **500 distinct ranks 2501–3000**; first `@aws-lambda-powertools/metrics@2.33.1`, last `is-wayland@0.1.0`. Five 100-item windows: 2501–2600, 2601–2700, 2701–2800, 2801–2900, 2901–3000. Each source record is pinned with its dataset latest version and original metadata, `PENDING` observation.
- Historical research PRs #47–#51 already covered ranks 1–2500, cumulative **2496 exact / 4 UNKNOWN**, zero production admissions; [terminal batch05 issue #9 checkpoint](https://github.com/levencode-labs/deploom-playground/issues/9#issuecomment-7107701753). No prior rank is eligible for resubmission. Next cursor after full reconciliation is **3001**, then rotate ChatGPT.

## Bounded first-run and acceptance

- `batch.py inventory --download` checks pinned full CSV SHA-256 + Git blob, all 9999 rows, physical ranking and every selected identity; offline tests `python -m unittest discover -s research/npm-ranks-2501-3000-20261123 -p 'test_*.py' -v` enforce negative/positive controls.
- [Read-only research workflow](../../.github/workflows/npm-ranks-2501-3000-research.yml): first source/negative gate, then five independent npm exact-version metadata partitions. Maximum two concurrent partitions × two local workers, 15 s HTTP timeout, three bounded attempts, 500 KB response cap, no redirects/ambient proxies/cookies/credentials. Every failure remains explicit UNKNOWN.
- First-run yields one 100-record JSON artifact per part, with response SHA-256, exact version and public URL, parsed peers/engines, and research-only status. GitHub artifact ZIP retention 30 days. Before terminal acceptance, independently download/decompress all five original ZIPs and pin their IDs, ZIP/JSON SHA-256, 500 exact rank/version statuses, tested SHA and workflow in an append-only `registry-receipts-manifest.json`. Add `verify_receipts.py` to verify these **offline** on final HEAD without querying prior versions again.
- Required final checks: all six original research jobs terminal, independent full receipt reconciliation, original full matrix preserved, final-HEAD research offline and ordinary CI terminal, durable issue #9 checkpoint and rotation. Official source cards initially empty; verified public metadata is not a codemod or migration fixture.

## Original ZIP and inner JSON independently reconciled — 2026-11-23

Original read-only [registry run #45221211562](https://github.com/levencode-labs/deploom-npm/actions/runs/45221211562) on exact original code SHA `0d86bb99b02fd40d5f1737bd7cc98b77b40b6230`: **all 6/6 jobs terminal SUCCESS**. Five GitHub Actions artifact ZIPs were downloaded to the independent verification container, their **raw ZIP SHA-256** checked with Python `hashlib.sha256`, `part-N.json` decompressed using `zipfile.ZipFile`, raw JSON byte SHA-256 checked separately, and all 500 ordered rank/package/version, exact public URLs, source digest, metadata-shape and UNKNOWN boundaries checked. The combined canonical identity matches the pinned source `index.json`. **These are original ZIP bytes, not a later rerun or inference from Codex.**

Five windows: **99/1, 100/0, 100/0, 100/0, 100/0** exact metadata/UNKNOWN; batch 06 **499 exact/1 UNKNOWN**. Only unresolved rank **2502 `@tailwind-core/oxide-linux-x64-gnu@4.3.0`**, `UNKNOWN_HTTP_404` (not a missing-release claim). Cumulative 1–3000 **2995 exact/5 historical UNKNOWN**. No production knowledge, first-party fixture, signer or deployment changes.

| Part | Ranks | Original artifact ID | ZIP SHA-256 | Inner JSON SHA-256 |
| --- | --- | --- | --- | --- |
| 0 | 2501–2600 | 14841126472 | `84a08b8ec07458dcb4e5d6ced8602860b8a37b1c193a97836aa391cfd7274cf9` | `9aef487f99af31f8d4ad2f6a78552d3f157c28617770345045a4f80a4f359f20` |
| 1 | 2601–2700 | 14842040602 | `a4f6fc9fc11eb67d19bd1231b674db7f9d681ff6200e01c664d9b66d5aef4ed9` | `7c00c166632586e4ef6c15ca38d747e3234c9543b56144cdb30284c4cac6ba63` |
| 2 | 2701–2800 | 14841561167 | `548aeafba9556a93a00b8b06c747c8de1c8abe8c425dab653c908a8424dc73e4` | `4cfd0dc3f3a94320573862883c6142abdfee8474d31564256f664fe106c14e18` |
| 3 | 2801–2900 | 14841171516 | `8643b6e2ccc76bcdf5dfd0c66bad84db152d9fea3858558973c61dede48ee6d5` | `38ff153cc8f822490572fb0714132eba41459f4ef4d7058047f9c8a75c545973` |
| 4 | 2901–3000 | 14839998246 | `70d053bb7a722146f6ca5598cdf4f571910bb62d7f540020585395295c827548` | `23890193ffbc8ac16985236152afb17cd2b992af006ad5d242c6253d73921167` |

Canonical identity list SHA-256 `f7ae9923aa1f3130979d533f194ab8753052a91998ea66138399f4f10ca6e5fa`; Git blob SHA-1 `3d5117ca5a8b6f27646235b6abfab3b503824c46`. The [per-rank permanent manifest](registry-receipts-manifest.json) includes all original artifact IDs, ZIP+inner JSON byte counts and hashes, statuses, source SHA and next cursor 3001.

Run `python research/npm-ranks-2501-3000-20261123/verify_receipts.py` to validate permanent attested manifest **offline, without network requests**. Optionally replay original ZIPs in a local directory with `python research/npm-ranks-2501-3000-20261123/verify_receipts.py --artifact-dir /path/to/5-zips` (archives must be `npm-ranks-2501-3000-part-0.zip` through `-4.zip`). Original GitHub artifacts expire after 30 days; keep this committed receipt hash ledger. Once reconciled, final-HEAD GitHub workflow switches from registry probing to offline-only attestation for *all five* matrix jobs; **no repeat 500 npm requests**.
