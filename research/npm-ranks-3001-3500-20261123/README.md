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
