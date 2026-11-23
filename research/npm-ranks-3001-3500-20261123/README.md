# DepLoom Knowledge Factory — batch 07 (ranks 3001–3500)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Bounded, anonymous public npm exact-version metadata research only; no paid API/agents, trusted fixtures, production cache/signatures/deployments or merges.

## Pinned inventory scope

- Original June-2026 physical-ranked `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, `npm-top-10000.csv`, Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`, byte SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, size 6,972,515 bytes; 9999 unique physical source rows. **No re-ranking of current npm downloads**.
- Strict **ranks 3001–3500 only**, 500 distinct package names in original order; first `@reflink/reflink-linux-x64-musl@0.1.19`, last `browserify-fs@1.0.0`. Five non-overlapping windows 3001–3100, 3101–3200, 3201–3300, 3301–3400, 3401–3500.
- Prior [terminal rank 3000 checkpoint in issue #9](https://github.com/levencode-labs/deploom-playground/issues/9#issuecomment-7108102644): ranks 1–3000 = **2995 exact public metadata, 5 historical UNKNOWN, zero production admissions**. Source history is append-only. **Never re-submit 1–3000** (research draft PRs #47–#52).
- Follow-up cursor after full batch 07 terminal reconciliation: **3501**; next ChatGPT rotation at rank **4000**.

## Read-only workflow and acceptance

- `index.json` contains all 500 rank/name/latest-version and historical CSV metadata rows, explicit `PENDING` version checks and no upgrade conclusions. Run `python -m unittest discover -s research/npm-ranks-3001-3500-20261123 -p 'test_*.py' -v` for pinned row/disjoint rank/negative HTTP cases. Run `python research/npm-ranks-3001-3500-20261123/batch.py inventory --download` to verify entire pinned CSV SHA-256/Git blob and source order before registry reads.
- `.github/workflows/npm-ranks-3001-3500-research.yml` is isolated (read-only token, pinned Actions) and runs 1 full-source inventory job followed by 5 independent matrix jobs of 100 records (max 2 partitions in parallel, 2 workers each, 15 s request timeout, 3 bounded attempts, max 500 KB response; no credentials/proxy/redirects). Network/HTTP/identity issues become explicit `UNKNOWN`, not success.
- Original first-run GitHub artifacts each contain 100 exact-rank observations, public URL, raw metadata response SHA-256 when valid, status, parsed peers/engines; original ZIP retention 30 days. Terminal admission requires independently downloading/decompressing all 5 original ZIPs, pinning exact artifact IDs and raw ZIP + JSON SHA-256, all 500 rank identities, UNKNOWN boundaries and original run code SHA in a durable `registry-receipts-manifest.json`. Add `verify_receipts.py` for final-HEAD **offline-only** checks without repeat registry queries.
- Full original six jobs and all ordinary CI required terminal SUCCESS at final HEAD, without shrinking the matrix after failure. Write terminal append-only issue #9 checkpoint before proceeding to rank 3501.
- Upstream source research cards begin empty and are `REFERENCE_ONLY`. Public npm metadata existence is not breaking-change proof, codemod or recipient project migration acceptance; production Cache v2, signing and Pages remain blocked.

## Original receipt reconciliation — independently verified 2026-11-23

Original read-only [workflow #45223949277](https://github.com/levencode-labs/deploom-npm/actions/runs/45223949277) on exactly `7cb9d271b3f61f4ce758cc45e5f3ecad7b78fdaa`: **6/6 terminal success (attempt 1)**. All five original Actions artifact ZIPs were downloaded through the GitHub connector into a separate verification container; raw ZIP SHA-256 was calculated with Python `hashlib.sha256`, each `part-N.json` opened using `zipfile.ZipFile`, and its raw byte SHA-256 independently calculated. The canonical 500 rank/package/version SHA-256 computed from the original ZIPs **equals** the independently retrieved original GitHub pinned `index.json`, for all five separate 100-rank partitions and as a whole. Every archived row has exact public registry URL, matching source pin, expected identity and research-only status. This is not an agent inference or rerun of 500 npm queries.

| Part | Ranks | Exact / UNKNOWN | Original artifact ID | Raw ZIP SHA-256 | Extracted JSON SHA-256 |
| --- | --- | --- | --- | --- | --- |
| 0 | 3001–3100 | 100 / 0 | 14840933104 | `92a9df6d68175a8bf6d730aba705c286b1e53904d436e42318fba495b6955589` | `596278eccfc4c6cd5bcf06fa5cf5689c505285fff8ddd7df71a21d26bdb1d2ff` |
| 1 | 3101–3200 | 100 / 0 | 14842291564 | `7706625fcdf5b19ab3a1b19742b22ae5e65a41847ae417fdbb692fdd72441afc` | `9bc9abe9a97212cc10c885c8ac3c2d41a6ae3fc03ce0cfeb6e5f44a0687c06c1` |
| 2 | 3201–3300 | 100 / 0 | 14840713246 | `d08216ccd11e2477329a2bed6ce967eaa935f9a03aab4ff259b10c6eae1450d3` | `ad28aa736718a29d69a9f62397fedd86db9d8c0b634c40b6c95747fd15f96498` |
| 3 | 3301–3400 | 100 / 0 | 14842003875 | `f49334268f0c06db295b24b17ff63fd184ad5f9296835ed088611d457d032137` | `48edfa31a4bfac9d468a8c4ba05c14439269246abfa32954cc7a95ba6edddc55` |
| 4 | 3401–3500 | 100 / 0 | 14840558786 | `a7121e5174ee1e630dadd77a2640126f158580562abf155c76dfb262cb0d9549` | `9d23d0b22f3af18ed1b05dc14f4b2c662a62db3d4004823eeda4f7245ed72fa6` |

**Batch 07 = 500 exact public metadata / 0 UNKNOWN**; cumulative ranks **1–3500 = 3495 exact / 5 historical UNKNOWN**, zero production admissions. Full canonical 500 rank/name/version SHA-256 `c441dca9a74ce28baee3f7b9dcc868471c8a83c25225554b2bcccdbb8d144f50`, Git blob SHA-1 `5e404d27b372c58eddd2e2cc49cdba5d8fe939c7`. Permanent per-rank digest/receipt ledger: [registry-receipts-manifest.json](registry-receipts-manifest.json). To verify archive attestation without network, run `python research/npm-ranks-3001-3500-20261123/verify_receipts.py`; for archived original ZIPs named `npm-ranks-3001-3500-part-0.zip` through `-4.zip`, add `--artifact-dir /path/to/five-zips`. CI switches to offline-only manifest checks after receipt commit. **Metadata existence is not a trusted migration fixture, codemod or success proof**.
