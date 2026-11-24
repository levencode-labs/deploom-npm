'use strict';

const assert = require('node:assert/strict');
const { createRequire } = require('node:module');

const formFile = process.argv[2];
const load = createRequire(formFile);
const { JSDOM } = load('jsdom');

async function main() {
  const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
  const { window } = dom;
  globalThis.window = window;
  globalThis.document = window.document;
  Object.defineProperty(globalThis, 'navigator', { value: window.navigator, configurable: true });
  for (const key of ['Element', 'HTMLElement', 'FileList', 'MutationObserver']) {
    globalThis[key] = window[key];
  }

  // Use React 17's timer scheduler in this jsdom child.
  globalThis.MessageChannel = undefined;
  const React = load('react');
  const ReactDOM = load('react-dom');
  const { act } = load('react-dom/test-utils');
  const { default: Form } = load(formFile);
  const root = document.getElementById('root');
  const submissions = [];
  try {
    await act(async () => {
      ReactDOM.render(React.createElement(Form, { onSubmit: data => submissions.push(data) }), root);
    });
    const form = root.querySelector('form');
    const project = form.elements.namedItem('project');
    assert.equal(form.elements.namedItem('unrelated').value, 'keep');
    const submit = () => {
      form.dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true }));
    };
    await act(async () => submit());
    assert.deepEqual(submissions, []);

    await act(async () => {
      const { set } = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value');
      set.call(project, 'Orchard');
      project.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await act(async () => submit());
    assert.deepEqual(submissions, [{ project: 'Orchard' }]);
    console.log(JSON.stringify(submissions[0]));
  } finally {
    ReactDOM.unmountComponentAtNode(root);
    window.close();
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
