const assert = require('node:assert/strict');

process.env.NODE_ENV = 'development';

function elementRef(react, element) {
  const ref = Number.parseInt(react.version, 10) >= 19 ? element.props.ref : element.ref;
  return ref ?? null;
}

for (const [alias, version] of [['react17', '17.0.2'], ['react18', '18.3.1'], ['react19', '19.3.1']]) {
  const react = require(alias);
  assert.equal(react.version, version);
  const callback = () => {};
  const withRef = react.createElement('button', { ref: callback });
  const withoutRef = react.createElement('button');
  const warnings = [];
  const original = console.error;
  console.error = (...parts) => warnings.push(parts.join(' '));
  try {
    assert.equal(elementRef(react, withRef), callback);
    assert.equal(elementRef(react, withoutRef), null);
    assert.deepEqual(warnings, []);
    if (alias === 'react19') {
      assert.equal(withRef.ref, callback);
      assert.match(warnings.join('\n'), /element\.ref.*React 19/i);
    } else {
      assert.equal(withRef.props.ref, undefined);
      assert.match(warnings.join('\n'), /ref.*is not a prop/i);
    }
  } finally {
    console.error = original;
  }
}

console.log('React 18.3.1 to 19.3.1: version-specific ref reads preserve identity without warnings. React 17 control passed.');
