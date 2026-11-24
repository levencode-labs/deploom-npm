process.env.NODE_ENV = 'production';

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { join } = require('node:path');

const v6 = createRequire(join(__dirname, 'before', 'package.json'));
const v7 = createRequire(join(__dirname, 'after', 'package.json'));
assert.equal(v6('react-router-dom/package.json').version, '6.30.3');
assert.equal(v7('react-router-dom/package.json').version, '7.18.4');

function links(load, { split = false, optedIn = false } = {}) {
  const { createElement: h } = load('react');
  const { renderToStaticMarkup } = load('react-dom/server');
  const { Link, MemoryRouter, Route, Routes } = load('react-router-dom');
  const content = h('nav', null,
    h(Link, { to: split ? '../reports' : 'reports' }, 'relative'),
    h(Link, { to: '/dashboard/reports' }, 'absolute'),
  );
  const tree = split
    ? h(Route, { path: '/dashboard' }, h(Route, { path: '*', element: content }))
    : h(Route, { path: '/dashboard/*', element: content });
  const future = optedIn ? { v7_relativeSplatPath: true } : undefined;
  const html = renderToStaticMarkup(h(MemoryRouter, {
    initialEntries: ['/dashboard/team'], future,
  }, h(Routes, null, tree)));
  return [...html.matchAll(/href="([^"]+)"/g)].map(match => match[1]);
}

const baseline = ['/dashboard/reports', '/dashboard/reports'];
const moved = ['/dashboard/team/reports', '/dashboard/reports'];
assert.deepEqual(links(v6), baseline);
assert.deepEqual(links(v6, { optedIn: true }), moved);
assert.deepEqual(links(v7), moved);
assert.deepEqual(links(v7, { split: true }), baseline);
console.log('Splitting the splat and moving the relative link up one route preserves the sibling URL.');
