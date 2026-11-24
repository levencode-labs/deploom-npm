# Check the SFC compiler before switching to destructured props

The pinned json-tree-view-vue3 refactor switches from withDefaults and props access to destructuring defineProps and enables propsDestructure in the Vue plugin. The fixture follows that computed-value pattern. Vue 3.4.38 keeps the computed value reactive with the props object. With default compiler settings, destructuring on 3.4.38 leaves the value stale after the parent updates. Vue 3.5.13 updates the rendered value with the same destructured source. Setting propsDestructure to false reproduces the stale output on 3.5.13.

Inspect the effective SFC compiler version and feature settings before adopting the destructured form. Projects supporting older defaults can keep reading from the props object. Test a parent prop update and confirm computed or watched behavior after mount. When passing a reactive prop to a watch function or composable, review whether that consumer expects a getter.

The fixture uses Node 24.18.0, npm 11.16.0 and jsdom 25.0.1. It checks compiler output and DOM text updates. The complete library suite and browser behavior need their own checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned json-tree-view-vue3 refactor](https://github.com/seijikohara/json-tree-view-vue3/commit/b282d6931a62fc44e0ab945f2c56d784a0337078)
- [Vue reactive props destructure](https://vuejs.org/api/sfc-script-setup#reactive-props-destructure)
