# DepLoom npm Knowledge Factory — Batch 12 source-only pin

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Draft and unmerged. This phase reads only the pinned public CSV; no npm registry requests, paid OpenAI API, Cache v2 admission, signing, deployment or merge.

Pinned source: `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`.

The source-only matrix emits five disjoint 100-row ranges for ranks 5501–6000. Every row is marked `PENDING`, `NOT_REQUESTED`, and `PINNED_CSV_ONLY`. The index will be assembled only from these CI outputs and independently reconciled against source lines and the pinned CSV before any registry transition.

CSV identities and package versions are not changelogs, breaking-change evidence, codemods, compatibility tests, or migration fixtures.
