const assert = require('node:assert/strict');
const before = require('eslint-before');
const after = require('eslint-after');
assert.equal(before.Linter.version, '8.57.1');
assert.equal(after.Linter.version, '9.0.0');

function rule(getScope) {
  return {
    meta: { schema: [] },
    create(context) {
      return {
        Identifier(node) {
          if (node.name !== 'spacing' || node.parent.type !== 'BinaryExpression') return;
          let scope = getScope(context, node);
          while (scope.upper && !scope.set.has(node.name)) scope = scope.upper;
          const definition = scope.set.get(node.name)?.defs[0];
          if (typeof definition?.node.init?.value !== 'number') {
            context.report({ node, message: 'Expected numeric spacing.' });
          }
        },
      };
    },
  };
}

const original = context => context.getScope();
const repaired = (context, node) => context.sourceCode.getScope(node);
const good = 'const spacing = 5; const component = () => spacing + 2;';
const bad = 'const spacing = "large"; const component = () => spacing + 2;';

function lint(eslint, getScope, code) {
  return new eslint.Linter({ configType: 'flat' }).verify(code, [{
    languageOptions: { ecmaVersion: 2022 },
    plugins: { fixture: { rules: { check: rule(getScope) } } },
    rules: { 'fixture/check': 'error' },
  }]).map(message => message.message);
}

assert.deepEqual(lint(before, original, good), []);
assert.deepEqual(lint(before, original, bad), ['Expected numeric spacing.']);
assert.throws(() => lint(after, original, good), /context.getScope is not a function/);
assert.deepEqual(lint(after, repaired, good), []);
assert.deepEqual(lint(after, repaired, bad), ['Expected numeric spacing.']);
console.log('The node-scoped ESLint API still resolves an outer binding and reports the invalid value.');
