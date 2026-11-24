# Switch a Svelte 5 client entry point to mount

The pinned Vite Svelte starter manually constructs its root component with new App. The isolated fixture compiles the same component with Svelte 4.2.18 and 5.0.0 and replays that entry-point shape. The constructor renders and tears down the component on Svelte 4. With Svelte 5's default component API it fails. Calling mount with the existing target and props restores rendering, and unmount removes the DOM.

Inspect the actual client entry that instantiates the root component. For an empty target use mount and keep the previous target and props. If the integration manages teardown, switch it to unmount. Test startup and teardown using the owning bundler and browser. Verify hydration separately when an SSR route already provides HTML.

The fixture uses jsdom 25.0.1 with Node 24.18.0 and npm 11.16.0. It checks compiled component rendering and teardown. The complete starter, browser bundling and SSR hydration remain separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Vite starter client entry](https://github.com/vitejs/vite/blob/cf50e548d4ae7f6ed9ade507d70acbd39b4e0b93/packages/create-vite/template-svelte/src/main.js)
- [Svelte 5 migration guide](https://svelte.dev/docs/svelte/v5-migration-guide#Components-are-no-longer-classes)
