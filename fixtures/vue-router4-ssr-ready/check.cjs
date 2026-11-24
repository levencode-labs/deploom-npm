const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const legacy = createRequire(join(__dirname, 'before', 'package.json'));
const current = createRequire(join(__dirname, 'after', 'package.json'));
const path = '/story/42';
assert.equal(legacy('vue-router/package.json').version, '3.6.5');
assert.equal(current('vue-router/package.json').version, '4.5.1');

async function before() {
  const Vue = legacy('vue');
  const VueRouter = legacy('vue-router');
  Vue.use(VueRouter);
  const router = new VueRouter({
    mode: 'abstract',
    routes: [{ path: '/story/:id', component: { render(h) { return h('p', this.$route.params.id); } } }],
  });
  const app = new Vue({ router, render: h => h('router-view') });
  const ready = new Promise((resolve, reject) => router.onReady(resolve, reject));
  await router.push(path);
  await ready;
  assert.equal(router.currentRoute.params.id, '42');
  return legacy('vue-server-renderer').createRenderer().renderToString(app);
}

async function after() {
  const { createSSRApp, h } = current('vue');
  const { RouterView, createMemoryHistory, createRouter, useRoute } = current('vue-router');
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/story/:id', component: { setup: () => () => h('p', useRoute().params.id) } }],
  });
  const app = createSSRApp({ render: () => h(RouterView) });
  app.use(router);
  assert.throws(() => router.onReady(() => {}), /router.onReady is not a function/);
  assert.equal(router.currentRoute.value.matched.length, 0);
  await router.push(path);
  await router.isReady();
  assert.equal(router.currentRoute.params, undefined);
  assert.equal(router.currentRoute.value.params.id, '42');
  return current('vue/server-renderer').renderToString(app);
}

async function check() {
  assert.match(await before(), /<p(?: [^>]+)?>42<\/p>/);
  assert.match(await after(), /<p(?: [^>]+)?>42<\/p>/);
  console.log('Both router versions render the requested route after their respective readiness gates.');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
