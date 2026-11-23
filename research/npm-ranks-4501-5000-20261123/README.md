# DepLoom npm Knowledge Factory — Batch 10 (ranks 4501–5000)

**RESEARCH_ONLY_NOT_V2_ADMISSION.** Draft and unmerged. No paid API, Cache v2 admission, signing or deployment.

## Immutable pinned input

- Original `curran/npm-top-packages-dataset@54cf58bc9bafa35fef1c4acf6435d667b4af47c1`, `npm-top-10000.csv`; raw SHA256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, Git blob `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`, 6,972,515 bytes / 9,999 unique names, rank by CSV physical order. Source-only workflow [#45232102766](https://github.com/levencode-labs/deploom-npm/actions/runs/45232102766) **5/5 success**; exact 500 pinned rows produced from logs, not reranked live.
- Five windows: 4501–4600; 4601–4700; 4701–4800; 4801–4900; 4901–5000. First `@pagefind/windows-x64@1.5.2`, last `@zkochan/boxen@5.1.2`. All status PENDING, no production admission.
- Prior [terminal Batch 09](https://github.com/levencode-labs/deploom-playground/issues/9#issuecomment-7109257996) cumulative 4494 exact metadata / 6 historical UNKNOWN through rank 4500; never repeat those ranks.

## Registry and terminal gate

- `batch.py inventory --download` verifies SHA256, git blob SHA1, row order and all 500 source rows. Offline HTTP negative controls, boundary checks, no redirects or ambient proxy, no credentials/cookies, 15s HTTP timeout, 3 attempts, max 500KB per registry reply. Matrix max two partitions parallel with two local workers each. Unknown means UNKNOWN, never inferred absence.
- Execute **only one original registry workflow**; no further edits until five original ZIP artifacts are produced. This source-to-registry transition uses a single atomic tree commit and retires the source-only workflow, avoiding Batch 09's duplicate-probe PR synchronizations.
- Then independently download and hash the original ZIP+inner JSON, verify all 500 identities/statuses, append immutable receipt manifest, offline-only verifier and tamper-negative tests in **one atomic commit** to preserve no repeat npm probes. Final HEAD 11/11 ordinary checks + research 6/6 offline pass before issue #9 terminal checkpoint.
- All observations are exact-version npm **metadata, not breaking-change proofs, codemods, or migration fixtures**. Cache v2 and signing/deployment/merge remain prohibited. Next rank 5001 only after terminal completion; rotate chat at rank 5000.
