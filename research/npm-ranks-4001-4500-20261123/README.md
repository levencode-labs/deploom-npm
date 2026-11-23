# DepLoom npm Knowledge Factory — Batch 09 (ranks 4001–4500)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Open draft, unmerged. Zero paid API or agent launches, no Cache v2 production admission, signing or deployment.

## Pinned source / no-resubmission
- `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, `npm-top-10000.csv`; Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`; raw SHA256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`; 6,972,515 bytes, 9,999 unique ranks in physical CSV order.
- Exactly 500 names, ranks **4001–4500**, in 4001–4100, 4101–4200, 4201–4300, 4301–4400, 4401–4500. First `@cropper/element-handle@2.1.1`, last `tiny-cursor@2.0.1`. No ranks 1–4000 may be probed again.
- [Terminal rank-4000 checkpoint](https://github.com/levencode-labs/deploom-playground/issues/9#issuecomment-7108909002): previous **3995 exact metadata / 5 historical UNKNOWN**, zero production admissions.
- Source-only bootstrap workflow `#45230035360` verified the immutable pinned source in **5/5 completed successful jobs**, emitting each source-exact row to logs without contacting npm. Batch 09 committed `index.json` is populated from those original verified job logs. `source_bootstrap.py` is retained for reproducibility.

## Research and controls
- `batch.py inventory --download` independently verifies original byte hashes, all 9999 source rows, 500 pinned selection identities, and disjoint rank/CSV offsets.
- `test_batch.py` runs offline negative controls for invalid registry metadata, redirects, oversized responses, corrupted pins, identity mismatches and rank gaps.
- The isolated six-job `npm-ranks-4001-4500-research.yml` runs one inventory and five bounded registry partitions. Max two matrix parts parallel / two workers each; 15-second HTTP timeout, max three attempts, 500KB response limit; no proxy, redirects, cookies, credentials; uncertainty => explicit UNKNOWN.
- On the **first** valid npm run only, save five original ZIP artifacts with 30-day retention. Then independently recompute ZIP and inner JSON SHA256, verify 500 exact rank/package/version/status identities, add append-only manifest + offline-only verifier + tamper negatives, and rerun final HEAD CI **without repeating registry probes**.
- These exact version metadata records are not migration findings, fix recipes, codemod proofs or project fixtures. No trusted migration records or Cache v2 admissions.

**Status:** first registry run and reconciliation pending. Do not mark batch terminal until original 6/6 and final 11/11 checks are reconciled. Next rank **4501** only after complete terminal Batch 09; next chat rotation after terminal rank **5000**.
