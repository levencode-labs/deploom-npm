# Move esbuild watch builds to a disposable context

The pinned Obsidian Tasks migration separates its one-shot build from watch mode. Its package and Yarn lock pin esbuild 0.15.6 before the change and 0.17.0 after it. The isolated fixture uses those releases through npm.

The old watch API emits an initial bundle and rebuilds after a real file edit. esbuild 0.17 rejects the held build({watch: true}) call. The new context.watch() observes the same edit, and context.dispose() stops its watcher at teardown. A one-shot build remains available through build() without a watch option.

Apply when crossing 0.17.0 from an earlier release and an affected build() call passes watch. Create a context, call watch(), and dispose the context on shutdown. Keep normal one-shot paths on build(). Verify an initial build and a real edit-driven rebuild. A call to watch() alone does not prove that the initial output is ready.

The replay pins Node 24.18.0 and npm 11.16.0. It uses the matching esbuild optional platform binary, with dependency install scripts disabled. It exercises local file watching on one input. Plugin behavior, live reload and complex watch graphs need their own verification.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Obsidian Tasks esbuild migration](https://github.com/obsidian-tasks-group/obsidian-tasks/commit/56fdb86b51df51705436cd3d28ae58345e1408cb)
- [esbuild 0.17 watch API changes](https://github.com/evanw/esbuild/releases/tag/v0.17.0)
