# DepLoom npm ranked discovery — batch 02 (ranks 501–1000)

RESEARCH_ONLY_NOT_V2_ADMISSION. No production data or signed publisher changes.

## Immutable input
Source repository: [curran/npm-top-packages-dataset](https://github.com/curran/npm-top-packages-dataset/tree/54cf58bc9bafa35fef1c4acf6435d667b4af47c1) at exact commit `54cf58bc9bafa35fef1c4acf6435d667b4af47c1`. CSV `npm-top-10000.csv` has **6,972,515 bytes**; SHA-256 `8099b3adae50e7136749baa0aaca2e3e53061b69835f323eefcbb97559990d82`; Git blob SHA-1 `0d45bc4b8bdd2a8016e582af7fef6f3d0f310272`. Historical downloads, not current popularity; no refresh.

Selection: first 1000 unique public npm package names in CSV physical order, **select only ranks 501–1000**, five disjoint 100-row parts: 0→501–600, 1→601–700, 2→701–800, 3→801–900, 4→901–1000. The last first-batch rank is 500, so no duplicate selection or paid run. Beginning is `docx` at rank 501; end `@dual-bundle/import-meta-resolve` at rank 1000. Next start is **1001** only after reconciliation and chat rotation.

## Execution and interpretation
`index.json` contains exactly 500 rows with ranked package identities, original June-2026 snapshot metadata (historic latest, peers, dependencies), and **PENDING** verification. `batch.py inventory --download` checks source bytes, both hashes, all 9999 rows and selected 500 against CSV. Run `python -m unittest discover -s research/npm-ranks-0501-1000-20261123 -p 'test_*.py'` offline. For local fixture input: `batch.py inventory --csv /path/to/pinned.csv`.

The GitHub research workflow runs a pinned-CSV inventory job then 5 research-only registry probes in **max two parallel subbatches**, each with **max two workers**. It fetches the CSV's exact npm version, no npm install, no site crawler, no credentials, no proxy/redirect. On success it saves response SHA-256, exact package/version identity, `engines`, `peerDependencies`, `peerDependenciesMeta`, on failure `UNKNOWN_*` with no false absence or compatibility claim. Each 100-row JSON artifact has 30-day retention. An exact metadata observation is NOT proof of an upgrade, compatibility, passing CI, or recommended migration.

Official changelogs/migration guides and tagged upstream manifests belong only to separate `official-references.json` with explicit source and unknown boundaries. No model recommendation is admitted as VERIFIED. `knowledge/v2/records.json` unchanged. Future production additions require a separately merged first-party exact fixture with negative controls, schema/provenance/admission checks, protected signed publication, and MCP verified-pages verification.

Batch 01 source: [PR #47](https://github.com/levencode-labs/deploom-npm/pull/47), terminal 500/500 screened, 498 exact metadata, 2 UNKNOWN, 0 production admission. Independent issue [#9](https://github.com/levencode-labs/deploom-playground/issues/9) tracks cumulative 1000 and rotation.

## Source-backed official migration references

The [four scoped research cards](official-references.json) cover selected ranked packages @vitejs/plugin-vue (#721), vue-router (#723), @angular/core (#792, with companion Angular packages), and @mui/x-date-pickers (#863). For Vite Plugin Vue 5→6, Vue Router 4→5 and MUI Pickers 8→9, the repo records exact before/after upstream tag commits, Git blob SHA-1 of both manifests, engines and peerDependencies; the Angular 21→22 guide card explicitly marks missing tag, version and metadata evidence UNKNOWN. The MUI v9 official codemod is documented, **not executed**, with no pinned codemod executable and unsupported spread cases. None of this implies current package latest, compatible projects or signed v2 admission.
