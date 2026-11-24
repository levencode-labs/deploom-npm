'use strict';

const assert = require('node:assert/strict');
const before = require('./before/node_modules/graphql');
const after = require('./after/node_modules/graphql');
assert.equal(before.version, '15.8.0');
assert.equal(after.version, '16.13.2');

const sdl = 'type Query { greet(name: String!): String! }';
const source = [
  'query Unselected { greet(name: "wrong operation") }',
  'query Chosen($person: String!) { greet(name: $person) }',
].join('\n');
const rootValue = { greet: ({ name }, context) => context.prefix + ' ' + name };
const contextValue = { prefix: 'Hello' };
const variableValues = { person: 'Ada' };
const operationName = 'Chosen';

async function main() {
  const oldSchema = before.buildSchema(sdl);
  const targetSchema = after.buildSchema(sdl);
  const previous = await before.graphql(oldSchema, source, rootValue, contextValue, variableValues, operationName);
  assert.equal(previous.errors, undefined);
  assert.equal(previous.data.greet, 'Hello Ada');

  const heldCall = after.graphql(targetSchema, source, rootValue, contextValue, variableValues, operationName);
  await assert.rejects(heldCall, /GraphQL schema/);

  const request = { source, rootValue, contextValue, variableValues, operationName };
  assert.deepEqual(await before.graphql({ schema: oldSchema, ...request }), previous);
  assert.deepEqual(await after.graphql({ schema: targetSchema, ...request }), previous);
  console.log('GraphQL 16 argument object preserves the selected operation, variables and resolver context.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
