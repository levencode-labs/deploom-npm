# Stage C coverage-map validation

The coverage map is implemented on top of publisher source `b03d1549373db4fb9353bafbd66cda0f7af793ca`. [The machine receipt](coverage-validation.json) binds tested implementation, generated files and exact stdout bytes. Local tooling was Python 3.13.5, Node 24.22.3, Git 2.56.1, cryptography 50.0.2 and jsonschema 4.26.0. Node ran only the production signing programs in synthetic parity checks; no pinned Stage B migration fixture was re-executed. It uses the pinned source consumer for C tests; it is **not** an installed-wheel release acceptance.

- All 37 cache tests passed, including 14 new coverage checks.
- Full generation was repeated and compared byte-for-byte; `--check` passed for JSON, English and Russian documents.
- Production signer parity preserved all 1,530 records and all 45 Stage B queries through legacy v2/current v2/current v3. Signature-domain, equal-revision and signed missing-scope negatives rejected as before. No registry requests were made.
- Counts are 1,530 records, 1,530 conservative distinct recommendations, 695 packages and 1,519 exact transitions. The current corpus has no verbatim-equivalent guidance under the reviewed identity; synthetic duplicates verify aggregation without inventing a reduction.
- Platform coverage claims are limited to the five source-bound Stage B cards on Linux and Windows; only the two browser cards claim Chromium. Complete retained ZIP/member hashes and all ten receipt legs are reverified before these counts are produced.
- Prepared, publication export and installed local cache are separate. The default map observes only prepared inputs. Explicit export/cache inputs verify all signatures and shards without a refresh; current live website availability remains unobserved.

## Reproduce

Use the consumer and hash-locked dependencies from `.github/actions/setup-cache-consumer`, with `PYTHONPATH` pointing to that pinned source and `cache`. Run from the repository root:

```sh
python -m unittest discover -s cache -v
python cache/coverage_map.py --check
python ci/test_knowledge_editions.py --legacy-consumer <checkout-at-73e4bcc04ec2a2c3aa85008a94b3a6958a03012d>
```

The Stage C change does not change package versions, release tags, installer locks, corpus rows or evidence scopes. New mandatory checks reject stale coverage documentation during public-data CI and before Pages preparation. Hosted CI at the eventual exact PR head is recorded separately.
