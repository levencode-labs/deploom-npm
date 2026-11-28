# Stage A release continuation

The owner authorized the Core → MCP → signed knowledge → npm release on
2026-11-28. This supersedes the earlier deferral recorded in Stage B history.
The historical qualification reports are unchanged.

## Current external blocker

Read-only GitHub and Git checks on 2026-11-28 found:

| Component | Exact accepted source | Tag | Observed state |
| --- | --- | --- | --- |
| Core 0.1.22 | `8c65fc7311062169d1b1e058c5463a39efaed3d9` | `v0.1.22` | Ref absent (GitHub GET 404 and no `git ls-remote` match) |
| MCP 0.2.34 | `0c990137e3b713f944cd7a053f04d0e8470af337` | `v0.2.34` | Ref absent (GitHub GET 404 and no `git ls-remote` match) |

Core exact-main [CI 46156871283](https://github.com/levencode-labs/deploom-core/actions/runs/46156871283)
and MCP exact-main [CI 46157811628](https://github.com/levencode-labs/deploom-mcp/actions/runs/46157811628)
and [native audit 46157811553](https://github.com/levencode-labs/deploom-mcp/actions/runs/46157811553)
are successful. No component-release workflow exists at either accepted SHA.
The latest published MCP remains 0.2.33. The npm registry returns E404 for
`@levencode/deploom@0.2.31`; recheck availability immediately before release.

The current execution environment can read public Git repositories. Its
authenticated GitHub connector can save files, commits and pull requests but
has no annotated-tag creation or workflow-dispatch operation. The read-only
push authorization probe (`git push --dry-run origin HEAD:refs/heads/main`)
failed with:

```text
fatal: could not read Username for 'https://github.com': No such device or address
```

The missing capability is authenticated creation/push of the two annotated
tags (or the equivalent GitHub Git-data API operation). No credential or global
configuration change was attempted. No tag was moved, replacement release was
invented, or release check bypassed. Neither this document nor a source-based
test is evidence that MCP 0.2.34 has been published or installed.

## Gates prepared in this PR

The Pages workflow now checks the signed candidate **before** its deployment:

1. Install the new runtime using the published wheel URL and SHA-256 lock.
2. Require MCP 0.2.34 and its exact accepted MCP/Core revisions. Reject source,
   editable or local-wheel installs, `PYTHONPATH`, incorrect wheel-origin
   metadata and modified installed package/Core bytes.
3. Execute the original pinned R01 security tests and R02 single/batch/plan
   policy tests with production imports from that installed wheel only. R01
   uses isolated loopback HTTP. Public network access is forbidden.
4. Preserve full production-signer parity for all 1,530 records and all 45
   Stage B queries, including unsupported managers, signature domains,
   signed missing scopes and equal-revision replacement negatives. Both the
   new runtime and separate legacy 0.2.33 reader must be installed wheels.
5. Read the actual production-signed candidate with both installed readers,
   compare every row to the reviewed corpus, and verify revisions, source
   digests and signature domains.
6. Only then deploy Pages. The existing post-deployment real `refresh_all`
   gate now verifies installed runtime identity too; it separately requires
   OSV/v1/v2/v3 readiness and the OSV expiry boundary.

The lock intentionally remains on 0.2.33 until an actual 0.2.34 wheel exists.
Consequently the new installed guard currently returns
`STAGE_A_RELEASE_LOCK_NOT_READY`. This is a release blocker, not a skipped or
successful installed-wheel acceptance. The existing Windows/POSIX package
matrix remains intact. Before acceptance, its locks and Windows candidate
source must be updated to the actual qualified runtime and the complete
matrix rerun on the final head; previous archive success does not establish
installation of MCP 0.2.34.

## Resume with authenticated tag creation

Recheck remote tags and exact-main gates immediately before creating anything.
For an absent tag, use the accepted source directly; the version has already
been bumped. Do not run the helper that prepares another patch release.

```sh
# In deploom-core, after rechecking no existing v0.1.22 ref:
git tag -a v0.1.22 8c65fc7311062169d1b1e058c5463a39efaed3d9 -m 'Release v0.1.22'
git push origin refs/tags/v0.1.22
# Wait for the existing Component release workflow and verify its public assets.

# Then in deploom-mcp, after rechecking no existing v0.2.34 ref:
git tag -a v0.2.34 0c990137e3b713f944cd7a053f04d0e8470af337 -m 'Release v0.2.34'
git push origin refs/tags/v0.2.34
```

If a tag already exists, verify its annotated tag object and target; never
force or replace it. The existing component workflows qualify exact main CI,
build and smoke immutable assets, and publish Core before MCP is advanced.

After MCP publication, independently hash the downloaded wheel and compare
`RELEASE-EVIDENCE.json`, `SHA256SUMS.txt` and GitHub asset digests. Set actual
URL/hash/version/Core revision in `ci/mcp-release.json` and
`bin/posix-requirements.txt`; preserve the Windows dependency lock and exact
`cvss==3.6` hash. Check the Windows test candidate selects the accepted source
or released wheel rather than its older development pin. Recheck that npm
0.2.31 is free before bumping `package.json`.

Run full package and installed-candidate gates on the final head. Merge this
publisher only after those prerequisites pass, then require successful
signed-data deployment/readback before creating `npm-v0.2.31`. The npm release
workflow retains Windows, Linux x64/ARM64, macOS, offline start, client
activation, recovery, rollback and registry readback gates.

## Local continuation verification

The guard negative tests pass. Full source parity still passes all 1,530
records and 45 lookups with every existing signature/revision negative. See
`source-parity.jsonl`: its explicit `installedRuntime: null` prevents this
source test from being confused with released-wheel acceptance. Tool versions
for this continuation were Python 3.13.5, Node 24.22.3 and the unchanged 39
hash-locked POSIX dependencies; Stage B's original exact Node/OS matrix is
retained separately and was not rerun or relabelled here.

`installed-legacy-source-current-parity.jsonl` additionally passes the same
1,530-row/45-query matrix with the old 0.2.33 **published wheel installed** in
a separate environment. That reader passed all 15 of its Stage B queries,
cross-domain rejection and equal-revision rejection. The current 0.2.34 side
still uses accepted source; the aggregate explicitly retains
`installedRuntime: null`.

The first legacy attempt correctly stopped at
`INSTALLED_WHEEL_ORIGIN_HASH_MISMATCH`: `uv pip` verified the hash lock but
retained an empty `archive_info` in `direct_url.json`. The original failure is
saved in `legacy-origin-negative.txt`. Reinstalling the same locked published
wheel with pip 25.0.1 retained both matching origin hashes and the unchanged
full matrix passed. The origin guard was not relaxed to accept missing or
conflicting provenance.

```sh
python -m unittest discover -s ci -p test_installed_release_guard.py -v
# Developer/source parity only; this command is not installed-wheel acceptance:
PYTHONPATH=/absolute/deploom-mcp/src python ci/test_knowledge_editions.py \
  --legacy-consumer /absolute/deploom-mcp-at-73e4bcc
```

Release acceptance uses `ci/qualify_installed_release.py`,
`ci/test_knowledge_editions.py --installed-lock ... --legacy-python ...`, and
`ci/verify_signed_candidate.py` without any source `PYTHONPATH`, followed by
`ci/verify_public_data.py` against the deployed site.
