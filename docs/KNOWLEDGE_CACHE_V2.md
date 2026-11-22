# DepLoom Collective Intelligence — v2-native migration knowledge

**Development-only. No production release or migration-data upload by users.**

## One producer; one reader; no automatic public contributions

- \`knowledge/v2/records.json\` is the single, maintainer-controlled corpus.
- Records describe **breaking changes, codemods, incompatibilities, playbooks
  and failure modes**; v2 does not publish microrecipe IDs.
- Every record includes machine-readable applicability, source-exact fixture
  identity, positive outcome from a reviewed fixture and a negative assertion.
- The source reference must point to an immutable **ancestor of trusted main**
  in this repository. Arbitrary external projects and agent text are never
  executed by the publisher. Public projects are studied in isolated labs;
  their findings stay DRAFT until independently reproduced in trusted fixtures.
- \`cache/shards_v2.py\` validates the closed consumer contract and first-party
  evidence before grouping content into immutable SHA-256-addressed JSON
  shards. Its root index is signed in protected \`cache-signing\` with the
  existing publisher Ed25519 key under a distinct v2 signature domain.
- Only *fixed publisher URLs* are fetched by the MCP reader, and all shards
  must be verified before one SQLite transaction activates the edition.
  Package names/versions are queried **locally**, never sent to Pages.
- Every result is \`ADVISORY_ONLY\`. A major-range candidate is deliberately
  weaker than a source-exact, previously checked version transition, and
  neither can prove another project's installation, tests or runtime.

There is **no** user opt-in contribution tool, pull_request_target admission,
LLM semantic approval workflow, or data-only auto-merge. v1 fallback
validation and the existing OSV/security and release CI are preserved.

## Evidence acceptance

A new package requires a *separate trusted fixture* under
\`fixtures/<case>/check.cjs\` with \`evidence.json\`, reviewed and merged through
ordinary unprivileged CI first. The script must independently demonstrate
the reported positive outcome and the named negative controls using a public
source-exact environment. A new record may then refer to the fixture's pinned
40-hex commit SHA and SHA-256. The validator checks the **actual Git blob**
and matching claim. No LLM output alone becomes VERIFIED.

For codemods, execution lives in a separately reviewed and tested fixture;
the distributed knowledge contains descriptive actions, not executable
scripts downloaded from the public cache. Guidance does not override scope.

## Developer smoke

With the exact pinned MCP consumer under \`build/consumer-v2\`:

\`\`\`sh
PYTHONPATH=build/consumer-v2/src:cache python -m unittest discover -s cache -v
PYTHONPATH=build/consumer-v2/src:cache python ci/test_knowledge_v2_consumer.py
\`\`\`

The independent cross-repository smoke generates a test-only signing key,
validates the pinned maintainer evidence, tests signed producer/client parity,
source-exact versus major-line matching, negative shard mutations, and
equal-revision substitution. The production signing key is never used in CI.

Do not merge the publishing workflow or promote a new release until the
entire existing Linux/Windows and package matrix remains green at exact SHA.

## PR trust-root regression

A pull-request test must validate fixture provenance against
`refs/remotes/origin/main`, **never** the untrusted PR HEAD or merge commit.
The full-history checkout is intentional: if the main ref or proof ancestry
cannot be established, the run fails. Production publication checks the exact
main commit using the protected signing workflow, after ordinary checks pass.
This prevents a contributor from introducing both an assertion and a
self-signed fake fixture receipt in one PR.
