# DepLoom npm Knowledge Factory — Batch 11 (ranks 5001–5500)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Draft and unmerged. No paid OpenAI API, Cache v2 admission, signing, deployment or merge.

## Immutable pinned input

The source-only bootstrap and committed `index.json` pin the June 2026 CSV snapshot at `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`. Five disjoint windows cover ranks 5001–5500. First package: `@financial-times/useragent_parser@1.6.3`; last: `archieml@0.5.0`.

## One registry run, then offline only

The first registry transition is a single commit that removes the source-only workflow and adds this research workflow. Inventory must verify source SHA, Git blob, physical CSV order and all five 100-row boundaries before registry jobs start. Each job only reads exact public npm metadata, has bounded retries/timeouts/response size, and uploads its original JSON as a ZIP artifact.

After the first successful registry run, independently download and hash all five original ZIPs and inner JSON. Then one atomic follow-up commit must add the immutable artifact manifest, offline verifier and tamper-negative tests. Because the manifest switches workflow jobs to archive verification, future PR synchronizations must never repeat registry requests.

## Interpretation

Pinned CSV fields and exact-version npm metadata are **not** changelogs, breaking-change evidence, codemods, compatibility tests or migration fixtures. All 500 items remain research-only; no Cache v2 admission is authorized by this batch.