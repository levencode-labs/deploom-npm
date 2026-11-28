# Reviewed evidence scopes and signed knowledge v3

The publisher produces two editions from the same maintainer-controlled
`knowledge/v2/records.json` corpus. The v2 edition keeps the exact legacy record
shape for existing clients. The v3 edition adds an `evidenceScope` to every
record, using the explicit review ledger in `knowledge/v3/evidence-scopes.json`.
The publisher verifies that ledger against immutable Git inputs before signing
is permitted. It does not infer evidence quality from a card title, a receipt's
`check` label, or the existence of a test script.

## What the classification says

The initial reviewed edition contains 1,525 records for 695 packages, tied to
101 pinned fixture sources and 978 retained input manifest entries. Those are
counts of records, packages, and source inputs; they are not counts of freshly
executed migrations or tested recipient projects.

| Evidence level | Records | What the reviewed assertion establishes |
| --- | ---: | --- |
| `source-pinned-metadata` | 1,103 | A fact from pinned package manifests, version metadata, or retained registry facts. It does not establish package behavior. |
| `source-inspection` | 70 | A specific assertion about retained source or declaration text, without executing the claimed behavior or compiling its use. |
| `module-load` | 124 | Loading, registration, or an export surface was checked. A successful import does not establish application behavior. |
| `typecheck` | 27 | A compiler or type checker established the recorded boundary for the fixture inputs. |
| `fixture-behavior` | 201 | The fixture exercised the claimed API, build, DOM, transformation, or runtime behavior and checked its result. |

In particular, all 818 records from `npm-github-transitions-batch-*` remain
`source-pinned-metadata`. Mixed fixtures are classified per claim: an ordinary
DOM smoke does not elevate a separate canvas peer-dependency claim, and a
manifest export assertion does not become source inspection merely because the
same fixture has other source checks.

Every v3 scope has this closed shape:

```json
{
  "schema": 1,
  "level": "typecheck",
  "retainedInputSha256": "<64 lowercase hex characters>",
  "archiveStatus": "UNKNOWN",
  "archiveReason": "MISSING_ARCHIVE_EVIDENCE",
  "projectStatus": "UNKNOWN",
  "conditionsRequired": true
}
```

This edition retains source, receipts, and fixture inputs. It does not retain
and re-attest the actual npm archive bytes for every case. An integrity string
in a lockfile or metadata receipt is not itself an archive attestation, so every
`archiveStatus` remains `UNKNOWN`. Every `projectStatus` is also `UNKNOWN`:
the fixture's outcome does not prove that a recipient project's install, build,
tests, or runtime will succeed. Applicability conditions and local project
verification remain required at every level.

The review classifies what the retained assertions and existing receipts
support. It is not a claim that all historical fixtures were executed again
during classification.

## Review ledger and retained input binding

Each ledger source names the exact existing `evidence.source` URL, its fixture
SHA-256, and one or more fixture directory roots. The manifest lists every
regular Git blob under those roots, with its path, byte count, and SHA-256.
Shared fixture helpers are included as explicit additional roots. Symlinks,
submodules, unbounded inputs, missing roots, and non-ancestor commits fail
validation.

Each record has a separate review decision:

```json
{
  "id": "<existing record id>",
  "recordSha256": "<digest of the complete legacy record>",
  "level": "fixture-behavior",
  "basis": {
    "path": "fixtures/<case>/check.cjs",
    "contains": "<literal anchor in the retained assertion>"
  }
}
```

The source anchor makes a decision easy to locate and checks that the cited
assertion still exists. A human reviewer must assess the assertion's meaning;
the anchor is not an automatic semantic classifier. Any record content change
invalidates `recordSha256`, even if its ID remains unchanged. Missing, duplicate,
unknown, or stale decisions fail closed. New records therefore require explicit
review before either edition can be published by the dual publisher.

All canonical hashes use UTF-8-compatible ASCII JSON produced by
`json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=True)`,
followed by one newline. `recordSha256` hashes that serialization of the full
legacy record. The `retainedInputSha256` hashes this object:

```json
{
  "schema": 1,
  "source": "<immutable source URL>",
  "fixtureSha256": "<actual check.cjs SHA-256>",
  "inputs": ["<complete sorted manifest for this source>"],
  "review": {"<the complete per-record decision>": "..."}
}
```

`cache/evidence_scopes.py` reproduces those inputs from exact Git objects, never
from uncommitted worktree files. Production trusts the checked main commit.
Pull-request CI trusts `refs/remotes/origin/main`; a contributor cannot add a new
fixture and admit its claims by treating the PR's own HEAD as trusted main.
The existing publisher still checks each record's positive receipt, negative
controls, exact versions, source ancestry, and fixture digest. Shared fixture
reads are memoized, while record-specific checks continue for every record.

## Two independent signed editions

| Property | Legacy v2 | Scoped v3 |
| --- | --- | --- |
| Endpoint | `/v2/` | `/v3/` |
| Index schema | `2` | `3` |
| Shard and record schema | `2` | `2` |
| `evidenceScope` | Absent | Required on every record |
| Signature domain | `DepLoom public migration records v2` plus NUL | `DepLoom public migration records v3` plus NUL |
| Source digest | SHA-256 of exact `knowledge/v2/records.json` bytes | SHA-256 of canonical annotated corpus bytes |
| Consumer database | `signed-records-v2.sqlite` | `signed-records-v3.sqlite` |

The v3 source digest binds the complete legacy records plus their scopes, whose
retained input digests bind the review decisions and actual source inputs. It
must not be compared with the raw v2 corpus digest. The signature covers the
index digest in the edition's own domain; shard paths bind their bytes by
SHA-256. A valid signature cannot make a missing scope valid in v3, and a v3
signature cannot authorize a v2 index.

The initial annotated corpus digest is
`3009c6e9bc5dd52f1d1e04ed69426a734276ce17f6bbcd9d9fcea4bce00fb4ba`.
It changes when a reviewed record, retained input, or classification changes.
The digest and counts here describe this initial review, not a timeless gate
on future reviewed knowledge additions.

## Adding or changing knowledge

1. Merge the independently reviewed fixture, receipt, and necessary helper
   inputs into trusted main before admitting its record.
2. Inspect the assertion for the particular claim and choose its actual
   evidence level. Retain the applicable directory roots and all their inputs;
   `input_manifest(commit, roots)` can reproduce the exact manifest offline.
3. Add or update the per-record decision and its exact `recordSha256`. Choose a
   stable source anchor that identifies the reviewed assertion. Reviewing a
   declaration regex requires a different level from executing a compiler.
4. Run the negative tests and the offline signed dual-reader parity check.
   Ordinary fixture CI remains responsible for executing newly introduced
   checks; the scope ledger does not replace that gate.
5. Publish through the protected workflow only after ordinary checks pass.

The ledger has no permissive fallback level. Missing reviews must be resolved
explicitly; assigning `UNKNOWN` to all records would not complete the review.

## Verification and release order

The workflow's pinned current consumer understands v3. Its separate legacy
checkout uses the released `deploom-mcp` v0.2.33 source. With both checkouts and
the hash-locked cache dependencies available:

```sh
PYTHONPATH=build/consumer-v2/src:cache python -m unittest discover -s cache -v
PYTHONPATH=build/consumer-v2/src:cache python ci/test_knowledge_editions.py --legacy-consumer build/consumer-legacy
```

The offline parity check runs both production JavaScript signers using an
ephemeral test key. It verifies every v2 record with the old strict reader and
every annotated v3 record with the new reader, then rejects a correctly signed
but unscoped v3 mutation. It checks all pinned Git evidence and retained inputs.
It substitutes only the live npm exact-version lookup with the already admitted
identity set, so the test makes no registry requests. Production publication
retains its registry identity checks.

The compatibility matrix preserves each reader's reviewed retrieval semantics.
For React DOM `17.0.0 -> 18.3.1`, v0.2.33 excludes the separate
`18.2.0 -> 18.3.1` renderer record. The new reader can return that crossed
transition as `intermediate-transition-candidate`, always with
`requiresProjectVerification: true`; it excludes the same record for
`17.0.0 -> 18.3.0`, which has not reached the tested target. Both readers also
check exact and major-line matches, empty executable-recipe lists, public v2
fallback, and rejection of a validly signed equal-revision substitution while
preserving the previously verified cache.

Release the new MCP wheel and update the npm runtime hash locks before merging
the dual publisher. The deployment and scheduled verification jobs install that
released wheel, use one real `refresh_all` call for v1, v2, v3, and OSV, require
aggregate `READY`, and compare every deployed v3 row with the locally reproduced
reviewed corpus. Deployment verification also requires its exact requested Git
revision. Scheduled verification permits an older common data revision when
unrelated main commits have not republished the unchanged corpus, but requires
all three signed knowledge editions to share that revision and the v2/v3 source
digests to match the current source.

Archive or project evidence must never be promoted merely to make a health
check green. Cache availability, source scope, archive verification, and a
recipient project's result are separate facts.
