# DepLoom npm Knowledge Factory — Batch 12 (ranks 5501–6000)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Draft and unmerged. No paid OpenAI API, Cache v2 admission, signing, deployment or merge.

## Immutable source and one bounded registry run

The source-only workflow pinned `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`. The committed index covers exactly ranks 5501–6000 in five disjoint 100-row windows. First package: `@wdio/sync@7.27.0`; last: `@appsignal/nodejs@3.8.1`.

This atomic transition replaces the source-only workflow with a bounded registry matrix. Inventory and offline negative/boundary tests must pass before any registry job begins. The first registry run may read exact public npm metadata once. Afterward, original ZIP/JSON artifact bytes must be independently verified and a manifest + offline verifier + tamper negatives committed atomically before any later PR synchronization. The manifest switches all five matrix jobs to offline verification; it must prevent repeated npm requests.

## Interpretation

Pinned CSV rows and exact-version npm metadata are not changelogs, breaking-change evidence, codemods, compatibility tests or migration fixtures. All items remain research only; no Cache v2 admission is authorized.
