const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');
const { JSDOM } = require('jsdom');

const sources = Object.fromEntries(
  ['jquery3', 'jquery', 'jquery-migrate', '@fancyapps/fancybox'].map((name) =>
    [name, readFileSync(require.resolve(name), 'utf8')]),
);

function scenario(jquery, version, useMigrate, check) {
  const dom = new JSDOM('<!doctype html><html><body></body></html>', {
    runScripts: 'outside-only',
    url: 'https://example.test/',
  });
  const { window } = dom;
  try {
    window.scrollTo = () => {};
    window.eval(sources[jquery]);
    const $ = window.jQuery;
    assert.equal($.fn.jquery, version);
    $.migrateMute = true;
    if (useMigrate) {
      window.eval(sources['jquery-migrate']);
      assert.equal($.migrateVersion, '4.0.2');
    }
    window.eval(sources['@fancyapps/fancybox']);
    assert.equal($.fancybox.version, '3.5.7');
    check($, window.document);
  } finally {
    window.close();
  }
}

function open($) {
  return $.fancybox.open(
    [{ type: 'html', src: '<p id="probe">fixture gallery content</p>' }],
    { animationDuration: 0, transitionDuration: 0, hash: false },
  );
}

function verifyGallery($, document) {
  const instance = open($);
  assert.ok(instance);
  assert.equal(document.querySelector('.fancybox-content #probe')?.textContent,
    'fixture gallery content');
  instance.close(false, 0);
  assert.equal(document.querySelector('.fancybox-container'), null);
}

scenario('jquery3', '3.7.1', false, verifyGallery);
scenario('jquery', '4.0.0', false, ($) => {
  assert.throws(() => open($),
    { name: 'TypeError', message: '$.isArray is not a function' });
});
scenario('jquery', '4.0.0', true, verifyGallery);
console.log('Fancybox 3 opens and closes on jQuery 3 and on jQuery 4 with Migrate loaded first');
