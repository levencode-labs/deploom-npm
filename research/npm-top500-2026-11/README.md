# DepLoom npm top-500, batch 01 — research only

Pinned source: [curran/npm-top-packages-dataset at 54cf58b](https://github.com/curran/npm-top-packages-dataset/tree/54cf58bc9bafa35fef1c4acf6435d667b4af47c1), file `npm-top-10000.csv`.
- Raw UTF-8 bytes: **6,972,515**, SHA-256: `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`, Git blob SHA-1: `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`.
- 9,999 source rows, 9,999 distinct names; source row order is monotonically nonincreasing by the historic download metric. Selection: **first 500 unique package names in physical CSV order**, no substitutions or popularity refresh. Ranks 1–500, subbatches 0–4 of 100. The *next* batch starts at rank 501 only after a new checkpoint.
- `index.json`: complete machine-readable 500-row **discovery inventory** with original source rank, CSV line, historic latest, historic peer dependencies, upstream repository hints and explicit unresolved verification state. These are NOT 500 migration recipes. No live npm metadata is claimed in this committed inventory.
- `official-references.json`: first-party migration documentation and exact upstream tagged manifest evidence for high-value transitions. Vite, Vitest, React Router and typescript-eslint are **not** in this ranked 500. Their reference cards are separate and do not change batch membership. React DOM, Next and Vue are inside the 500.
- `top500.py` + CI: deterministic input check, then five independent 100-package **read-only** probes to `https://registry.npmjs.org/<package>/<dataset-latest>`; bounded response size, no proxy/redirect/credentials, bounded retries and max two workers per subbatch (at most two parallel subbatches). Each job uploads machine-readable official-registry receipts with exact name/version, normalized peerDependencies, engines and SHA-256 of source response bytes. Failures are labelled UNKNOWN, not absent / compatible. Metadata receipts are research only and do not attest a migration transition.
- Reproducible local check: `python research/npm-top500-2026-11/top500.py inventory --download`. Offline check: `python research/npm-top500-2026-11/top500.py inventory --csv /path/to/pinned.csv`. Isolated tests: `python -m unittest discover -s research/npm-top500-2026-11 -p 'test_*.py'`.
- Production corpus `knowledge/v2/records.json`, consumer, publisher signer, protected Pages deploy and review gates are **unchanged**. A new v2 admission requires a separately reviewed first-party source-exact fixture and negative control in trusted `main`, then another PR for corpus admission. Neither an upstream guide nor a registry receipt is a trusted fixture.
- Baseline: npm `d5a8fb806f2c2572fce831c92fd3f2b7fe01f871`; MCP `b7ae19bab5d454d2f6d544eeaf12515f41fa6ea1`. Last observed published revision before this batch: 39 (not a claim of a new publication).

## Acceptance / continuation

Only report a subbatch as registry-screened after its uploaded receipt is checked; never call a 200 response a migration-proof pass. Keep each status including 404/429/timeout/redirect without blind retries of paid work. Cross-check official guides with exact published npm manifests before making peer/engine claims. Any guide-manifest conflict remains explicitly UNKNOWN. The workflow does not write/sign/deploy the cache, does not use paid agents, and has `contents: read` only. Count any missing artifact as UNKNOWN. No admission from PR HEAD.

Next unit of work after this checkpoint: examine rank 501, only after checking full 500 inventory, all five distinct reports, source pin and the current main/revision. Do not re-collect 1–500 merely to repeat observations.

## Completed read-only GitHub registry scan (2026-11-23)

The [actual GitHub Actions run](https://github.com/levencode-labs/deploom-npm/actions/runs/45195924677) on `18d8de683048e7f9aa8a8320f5d32d3848633f3d` completed **six of six** jobs successfully: CSV SHA-256/Git blob and 500-row selection, plus five disjoint 100-package registry probes. Four hundred ninety-eight exact anonymous npm version documents were observed; **two UNKNOWN** are retained, never converted to negative claims or admitted. See [per-rank coverage and immutable source-artifact SHA-256](registry-receipts-manifest.json).

- `concat-stream@2.0.0`, rank 253: `UNKNOWN_INVALID_METADATA`.
- `ansi-html-community@0.0.8`, rank 426: `UNKNOWN_INVALID_METADATA`.

Each [Actions artifact](https://github.com/levencode-labs/deploom-npm/actions/runs/45195924677) includes the full 100-item JSON, exact anonymous-response SHA-256, URL, `engines`, `peerDependencies`, `peerDependenciesMeta`, and explicit failure statuses. This repository stores a machine-readable artifact-ID/JSON-digest index and every rank's status. **Artifacts currently have 30-day retention; raw-response bodies and detailed per-package receipt metadata are not yet committed as immutable files**, and must not be claimed durable beyond that retention. The original pinned CSV inventory and this completion index are durable.

The original production trust boundary remains unchanged: **0 new signed v2 records, 0 new trusted fixtures, no snapshot revision increase**. The research contains evidence for public existence and some official migration *references*, but not 500 independently validated upgrade recommendations.
