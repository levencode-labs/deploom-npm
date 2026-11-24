# Coordinate Vite 8 with the Vue plugin

The pinned vite-plugin-pwa Vue Router example loads @vitejs/plugin-vue. Its workspace lock pairs Vite 5.0.10 with Vue plugin 4.5.0 and Vue 3.3.8. Holding plugin 4.5.0 while changing Vite to 8.3.8 fails strict npm resolution with ERESOLVE on the plugin's Vite peer. Plugin 6.0.7 accepts Vite 8. With it, the repaired example builds a minimal Vue single-file component while keeping Vue 3.3.8 fixed. The baseline pair builds the same component.

Check each affected workspace's Vite plugins and their exact peer ranges even if the root Vite peer already accepts the target. Upgrade Vite and its Vue plugin together when the installed Vue plugin excludes the target, or defer the Vite target if a required plugin cannot move. Check the target Node engine before installing (Vite 8.3.8 declares ^20.19.0 or >=22.12.0). Run the owner's strict install and build. For PWA apps, also verify the service worker and offline behavior.

The isolated npm fixture uses Node 24.18.0 and npm 11.16.0. It covers peer resolution and Vue component compilation. The upstream pnpm workspace, PWA plugin, service worker and browser flow need their own checks.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Vue Router example at 355cf3dd](https://github.com/vite-pwa/vite-plugin-pwa/blob/355cf3dd283ca50da3ac4759501e9c3312a3da91/examples/vue-router/vite.config.ts)
- [Pinned pnpm lock at 355cf3dd](https://github.com/vite-pwa/vite-plugin-pwa/blob/355cf3dd283ca50da3ac4759501e9c3312a3da91/pnpm-lock.yaml)
- [Vue plugin 6.0.7 peer range](https://github.com/vitejs/vite-plugin-vue/blob/plugin-vue@6.0.7/packages/plugin-vue/package.json)
