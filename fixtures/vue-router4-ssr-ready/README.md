# Wait for the requested route before Vue Router 4 SSR

The pinned Vue HackerNews server entry pushes the request URL, waits for router.onReady, and reads router.currentRoute directly. Vue Router 3.6.5 uses that sequence to render the requested page. Vue Router 4.5.1 lacks onReady, starts with an unmatched currentRoute ref, and puts the resolved route in currentRoute.value. Using createMemoryHistory, awaiting push and isReady, and reading the ref renders the same route marker.

Update the server entry that owns initial navigation. Keep direct instance reads separate from component access through useRoute. Verify a deep link that needs navigation and check the rendered HTML for its route parameter. Handle navigation failures according to the owning server's response policy.

The isolated fixture uses Vue 2.7.16 with Vue Router 3, Vue 3.5.13 with Vue Router 4, Node 24.18.0 and npm 11.16.0. It checks server-rendered output without running a server. HackerNews data loading and hydration remain separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Vue HackerNews server entry](https://github.com/vuejs/vue-hackernews-2.0/blob/98399b55c6f1da4197840ba76189795b3e95be0f/src/entry-server.js)
- [Vue Router SSR migration guide](https://router.vuejs.org/guide/migration/)
