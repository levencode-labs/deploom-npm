'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

assert.equal(require('./before/node_modules/@apollo/client/package.json').version, '3.9.5');
assert.equal(require('./after/node_modules/@apollo/client/package.json').version, '4.2.10');
assert.equal(require('./after/node_modules/rxjs/package.json').version, '7.8.2');

const scenario = `
  const assert = require('node:assert/strict');
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  const core = require('@apollo/client');
  const { ApolloProvider, useQuery } = process.argv[1] === 'split'
    ? require('@apollo/client/react')
    : core;
  const { ApolloClient, ApolloLink, InMemoryCache, gql } = core;

  const query = gql('query Greeting { greeting }');
  const cache = new InMemoryCache();
  cache.writeQuery({ query, data: { greeting: 'Hello from cache' } });
  const client = new ApolloClient({
    cache,
    link: new ApolloLink(() => { throw new Error('Unexpected network request'); }),
  });

  function Greeting() {
    const { data, loading, error } = useQuery(query, { fetchPolicy: 'cache-only' });
    assert.equal(loading, false);
    assert.equal(error, undefined);
    return React.createElement('p', null, data.greeting);
  }

  process.stdout.write(renderToStaticMarkup(
    React.createElement(ApolloProvider, { client }, React.createElement(Greeting)),
  ));
`;

function run(arm, form) {
  const result = spawnSync(process.execPath, ['-e', scenario, form], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 15000,
  });
  if (result.error) throw result.error;
  return result;
}

const baseline = run('before', 'root');
assert.equal(baseline.status, 0, baseline.stderr);
assert.equal(baseline.stdout, '<p>Hello from cache</p>');

const held = run('after', 'root');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /Element type is invalid/);
assert.equal(held.stdout, '');

const migrated = run('after', 'split');
assert.equal(migrated.status, 0, migrated.stderr);
assert.equal(migrated.stdout, baseline.stdout);
console.log('Apollo Client 4 renders the same cache-only query through its React entry point.');
