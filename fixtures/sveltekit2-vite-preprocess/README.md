# Import vitePreprocess from the Svelte Vite plugin in SvelteKit 2

The pinned The Air on Earth migration moves the vitePreprocess import in svelte.config.js from @sveltejs/kit/vite to @sveltejs/vite-plugin-svelte. The pnpm lock pins SvelteKit 1.30.4 before the change and 2.70.0 after it, with the target Vite plugin at 4.0.4. The isolated npm fixture uses the locked Svelte and Vite versions for both arms.

The old import preprocesses TypeScript in a small component and Svelte compiles it. The held import fails to link on SvelteKit 2. Importing the same helper from the plugin preprocesses and compiles the typed component with the target stack.

Apply when the Svelte config imports vitePreprocess from @sveltejs/kit/vite. Declare a plugin version compatible with the target Svelte and Vite versions and change the named import. Preserve preprocessing options in the real config and compile a component that uses the affected language.

The fixture pins Node 24.18.0 and npm 11.16.0. It enables script preprocessing explicitly to exercise TypeScript transformation. It covers an isolated component, with adapters, CSS preprocessors and the full application build requiring their own verification.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned The Air on Earth SvelteKit migration](https://github.com/npbee/theaironearth/commit/b007df89b1dfe0739feac45f6c6fea6d3b9a53d3)
- [SvelteKit 2 Vite preprocessing migration](https://svelte.dev/docs/kit/migrating-to-sveltekit-2#vitepreprocess-is-no-longer-exported-from-sveltejs-kit-vite)
