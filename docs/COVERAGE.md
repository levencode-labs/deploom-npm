# DepLoom knowledge coverage

Generated from verified inputs. [JSON](coverage-map.json).

The prepared corpus does not establish publication or installation in a local client. Guidance remains ADVISORY_ONLY; recipient-project verification is required.

| Metric | Count |
| --- | ---: |
| Records | 1530 |
| Distinct recommendations | 1530 |
| Merged records | 0 |
| Packages | 695 |
| Exact transitions | 1519 |

## Evidence levels

| Level / manager | Records | Recommendations |
| --- | ---: | ---: |
| fixture-behavior | 206 | 206 |
| module-load | 124 | 124 |
| source-inspection | 70 | 70 |
| source-pinned-metadata | 1103 | 1103 |
| typecheck | 27 | 27 |

## Package managers

| Level / manager | Records | Recommendations |
| --- | ---: | ---: |
| npm | 1528 | 1528 |
| pnpm | 3 | 3 |
| yarn | 3 | 3 |

Manager and evidence-level rows may overlap; do not sum them.

## Platforms and browsers

| Evidence | Records | Recommendations |
| --- | ---: | ---: |
| Linux | 5 | 5 |
| Windows | 5 | 5 |
| Chromium | 2 | 2 |

1525 records have no platform evidence in this map; 1528 have no browser evidence. This is unknown coverage, not incompatibility. Mobile Chromium is viewport/touch emulation; physical devices, Firefox, WebKit and macOS are not claimed.

## Data states

| State | Result | Revision |
| --- | --- | --- |
| prepared | VERIFIED_PREPARED_CORPUS | UNKNOWN |
| published | NOT_OBSERVED | UNKNOWN |
| local | NOT_OBSERVED | UNKNOWN |

v2 and v3 represent one corpus and are never added together. Supplied signed exports have their signatures and all shards verified; live website availability is not checked. OSV is separate from migration knowledge; inspect its freshness through the runtime diagnostic.

## Definitions and provenance

Recommendations merge only when package, kind, exact transitions, manager support, verbatim conditions, ordered actions and verification match. Conditions preserve the joint-migration cohort. Titles, summaries and sources do not replace these fields. nodeRef and relative navigation remain distinct recommendations. Exact transition match, evidence level and applicability to your project are separate dimensions.

- Identity: `recommendation-identity.v1`.
- Trusted ancestor: `66bc76d933cc40459a6b152d179ac2a70ee32c32`.
- Input set SHA-256: `664500b6534165d28a2dd1e4d441a7de8cd403fc7edcc356ed8246d3902cb38a`.
- v2 corpus SHA-256: `bc89d4601eea4d2a57ba87124d147c6c11ab64ed5b89bff996b438a218d520b8`.
- v3 corpus SHA-256: `1ce0090f5c0479389be7cc9efb4eaa59a0e5ea3cfe3001fcb9b7a40d479c8992`.
- Reviewed sources: 104; retained input entries: 1038.

- [Qualification run 46162323251](https://github.com/levencode-labs/deploom-npm/actions/runs/46162323251): 10 verified legs; `13ae70989bccd4db68ed1cad5df18846b903f77e5234c4f1f9ad6c72e4877fa9`.

Record counts, CI jobs and metadata checks are not a percentage of project compatibility. retainedInputSha256 does not establish that a client has the source files, full manifest or dependency archives.

## Reproduction

```sh
python cache/coverage_map.py
python cache/coverage_map.py --check
```

Run from the repository root using dependencies and the consumer pinned by `.github/actions/setup-cache-consumer`. Generation runs no migrations or network requests. CI rejects stale JSON/Markdown. To inspect downloaded publication bytes, pass `--published-dir <export>` containing v2/v3 directories; to inspect an existing client cache, pass `--local-cache <cache-root>`. Save that separate report with `--output-dir <directory>`; publication and local state are never inferred from the prepared corpus.
