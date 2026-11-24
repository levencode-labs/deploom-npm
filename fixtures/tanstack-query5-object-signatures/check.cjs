const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const before = createRequire(join(__dirname, 'before', 'package.json'));
const after = createRequire(join(__dirname, 'after', 'package.json'));
assert.equal(before('@tanstack/react-query/package.json').version, '4.36.1');
assert.equal(after('@tanstack/react-query/package.json').version, '5.75.5');

const key = ['fixture', 'region'];
const fetchRegion = async () => 'north';

function render(load, client, positional) {
  const { createElement: h } = load('react');
  const { renderToString } = load('react-dom/server');
  const { QueryClientProvider, useQuery } = load('@tanstack/react-query');
  const options = { initialData: 'north', enabled: false };
  function Component() {
    const result = positional
      ? useQuery(key, fetchRegion, options)
      : useQuery({ queryKey: key, queryFn: fetchRegion, ...options });
    return h('output', null, result.data);
  }
  return renderToString(h(QueryClientProvider, { client }, h(Component)));
}

async function check() {
  const v4 = new (before('@tanstack/react-query').QueryClient)();
  const v5 = new (after('@tanstack/react-query').QueryClient)();
  try {
    assert.equal(render(before, v4, true), '<output>north</output>');
    assert.equal(await v4.fetchQuery(key, fetchRegion), 'north');
    assert.throws(() => render(after, v5, true), /only the "Object" form|Bad argument type/i);
    await assert.rejects(v5.fetchQuery(key, fetchRegion), /Missing queryFn/i);
    assert.equal(render(after, v5, false), '<output>north</output>');
    assert.equal(await v5.fetchQuery({ queryKey: key, queryFn: fetchRegion }), 'north');
    assert.equal(v5.getQueryData(key), 'north');
    assert.equal(v5.getQueryData(['unrelated']), undefined);
    console.log('Query v5 accepts the object signatures and preserves the intended cache key.');
  } finally {
    v4.clear();
    v5.clear();
  }
}

check().catch(error => { console.error(error); process.exitCode = 1; });
