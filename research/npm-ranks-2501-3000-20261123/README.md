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
