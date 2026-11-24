# Chokidar 4 glob watchers

Pi Kanban switched from passing a glob to `chokidar.watch()` to watching a directory with a file-extension filter. This fixture uses exactly Chokidar `3.6.0` and `4.0.3` and the dependency entries those versions used in the public project locks.

- [Migration commit and source change](https://github.com/NikiforovAll/pi-kanban/commit/d232c7436f33e811abece0ce16a5f65f2d1c5317)
- [Before lock](https://github.com/NikiforovAll/pi-kanban/blob/c72afc224f519ecb24a725f1b6e4df83ee6e9cb6/package-lock.json) and [after lock](https://github.com/NikiforovAll/pi-kanban/blob/d232c7436f33e811abece0ce16a5f65f2d1c5317/package-lock.json)
- [Chokidar 4.0.0 release notes](https://github.com/paulmillr/chokidar/releases/tag/4.0.0)

## Reproduce

From this directory, use Node.js 22 or newer and npm.

```sh
npm ci --prefix before --ignore-scripts --strict-peer-deps --no-audit --no-fund
npm ci --prefix after --ignore-scripts --strict-peer-deps --no-audit --no-fund
node check.cjs
```

The checker collects initial `add` events up to the actual `ready` notification. The 3.6.0 glob sees the nested JSONL file. The same glob silently reports zero matches on 4.0.3. Watching the directory and ignoring nonmatching files recovers the original result, including a matching file under a folder with a nonmatching extension. The expected result excludes both an unrelated extension and a matching file outside the watched root.

This verifies initial discovery and filter behavior for a suffix glob. For applications that react to tree changes, test live create, edit and removal events in the target environment. Review path-sensitive or more complex glob semantics before adapting the filter.
