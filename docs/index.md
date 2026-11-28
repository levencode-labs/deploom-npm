# DepLoom public data

The [OSV pointer](v1/osv.json) identifies the active immutable release of the public npm advisory database. Follow its `manifest` URL for the compressed SQLite filename, hash, schema version, row count and source timestamp.

The [history](v1/history.json) and [recipes](v1/knowledge.json) are public, reviewed data sets. Clients request the same files regardless of project dependencies.

## Migration knowledge coverage

See the reproducible [coverage map](COVERAGE.md), [карту покрытия на русском](COVERAGE.ru.md)
and [machine-readable JSON](coverage-map.json). Counts come from one reviewed corpus, with
separate evidence levels and verified qualification scope; v2/v3 are not counted twice.
