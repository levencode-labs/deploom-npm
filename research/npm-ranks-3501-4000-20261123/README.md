# DepLoom Knowledge Factory — batch 08 (ranks 3501–4000)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Strict pinned, read-only, anonymous public npm exact-version metadata research. **No paid API/agents, no production cache, signer, deployment or merge.**

## Source and no-repeat boundary

- June 2026 `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, `npm-top-10000.csv`, immutable Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`, verified raw SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, 6,972,515 bytes and 9,999 distinct ranked source rows. CSV **physical original ranks** only; do not rerank by live downloads.
- **Exactly 500 new identities ranks 3501–4000** in five disjoint windows 3501–3600, 3601–3700, 3701–3800, 3801–3900, 3901–4000. First `create-eslint-index@1.0.0`, last `@medusajs/inventory@2.16.0`. All pinned source identity fields are committed in `index.json` with PENDING registry checks and no migration assertions. Never resubmit ranks 1–3500 (prior research PRs #47–#53).
- Prior [authoritative terminal rank-3500 issue #9 checkpoint](https://github.com/levencode-labs/deploom-playground/issues/9#issuecomment-7108514598): **3495 exact public npm metadata / 5 historical UNKNOWN / zero production admissions**. Next cursor after rank-4000 fully reconciled = **4001**, next ChatGPT rotation at **rank 4000**.

## Isolated read-only research intake

- `batch.py inventory --download` requires exact pinned CSV bytes/SHA-256/git blob, all 9999 rows/unique names/descending order and all 500 committed rank/name/latest version/metadata fields. `python -m unittest discover -s research/npm-ranks-3501-4000-20261123 -p 'test_*.py' -v` runs offline boundary and bad-source/HTTP negatives.
- Five independent 100-rank matrix jobs run no more than two partitions in parallel, two local workers per job; 15 sec HTTP timeout, three bounded attempts, max 500KB, no redirects/proxies/cookies/credentials. Failures become explicit **UNKNOWN**, never missing-release evidence or success.
- Original read-only GitHub Actions artifacts will retain only 30 days. Completion requires original six terminal jobs, independent raw original ZIP and `part-N.json` SHA-256, all 500 rank identity/status checks, durable `registry-receipts-manifest.json` and `verify_receipts.py` offline-only attestation with tamper-negative controls, unchanged five-part matrix, final-HEAD 11/11 terminal checks and new issue #9 terminal checkpoint.
- After reconciliation `verify_receipts.py` replaces first-run npm probes on all five final-HEAD matrix legs; **never requery ranks 3501–4000**. Source exact metadata existence alone is not a breaking-change/codemod or real migration fixture. Cache v2 admissions, signing and deploy remain blocked.

## Original Batch 08 receipt reconciliation (independent, 2026-11-23)

Original anonymous public registry [workflow #45227862705](https://github.com/levencode-labs/deploom-npm/actions/runs/45227862705), code HEAD `bdf8be4607762f9b5357ffd01eb7941665f6a7db`, **6/6 terminal success**. A previous [run #45227554262](https://github.com/levencode-labs/deploom-npm/actions/runs/45227554262) failed inventory before any npm probe due to a copied 3002-vs-3502 csvLine offset; the [single boundary correction](https://github.com/levencode-labs/deploom-npm/commit/bdf8be4607762f9b5357ffd01eb7941665f6a7db) includes a tamper-negative test and preserves all five matrix legs. **No earlier ranks re-submitted.**

All five original Actions artifact ZIPs were independently downloaded into a separate verification container and their raw ZIP SHA256 and decompressed `part-N.json` SHA256 computed using Python `hashlib.sha256` and `zipfile.ZipFile`. Their 500 contiguous rank/package/version URLs and statuses match the pinned source `index.json` canonical SHA256 `b2a80b39177d99230e1216c625879cbe7d11e571edecd5bdf50db1e2bd01ce64` (Git blob `00c30c20714e53589dca5b89f6abc06f2147fd3a`). This independent verification is not attributed to Codex.

| Part | Ranks | Original artifact ID | Exact / UNKNOWN | Original ZIP SHA-256 | Inner JSON SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 0 | 3501–3600 | 14846445337 | 100 / 0 | `eb300faceb5aef3dffe4d426627f6ecd53d38d3141949ff6d226d59986b2abd4` | `e64e27b63a4905718008c5fb6f74b930b21e1f7b80f8bd70797fa1361468a2a7` |
| 1 | 3601–3700 | 14846465420 | 100 / 0 | `46f694473a04b7b4a382c5b4c55eab1b66d411882c81aba9ef3256e31c4e709f` | `185602c120af450c06c66356acc37ca518e138e54e164d802efafeee0808e2ad` |
| 2 | 3701–3800 | 14847210273 | 100 / 0 | `2aa7cd2785bf42d316ba169d6885346f249684a04b2ff1150e27ddbe34a4cdd2` | `5d608c534b657b8799e469ad4fe5e7da55b140f5da653bd18a5659e72f399773` |
| 3 | 3801–3900 | 14847095317 | 100 / 0 | `563e3b0ae256f540b135e9e250e0e9f879322c1cf0840ca645d65b7b69f6c6ef` | `5ad7d2fa9eb0973f777709357ef0da8167b5f53a9c48682531b3a9d9168080d8` |
| 4 | 3901–4000 | 14846540610 | 100 / 0 | `6ea465251c4a605b3a40ee7178ba93f1fc8009aa079e3c68a6d4196579a8de74` | `ca8ed771ec30637acb111aa3c2590245c0e02e08f84a695e5650bf9015348367` |

Batch 08 **500 exact / 0 UNKNOWN**; cumulative 1–4000 **3995 exact / 5 historical UNKNOWN**, zero admissions. [Permanent receipt manifest](registry-receipts-manifest.json), [offline-only verifier](verify_receipts.py), [tamper tests](test_receipts.py). Run `python research/npm-ranks-3501-4000-20261123/verify_receipts.py` to check committed ledger offline; optionally replay the original five ZIP files named `npm-ranks-3501-4000-part-0.zip` through `-4.zip` by adding `--artifact-dir /path/to/archives`. Final CI should preserve all five matrix parts but perform no repeat npm probes. Metadata presence is not a migration recipe or fixture acceptance.
