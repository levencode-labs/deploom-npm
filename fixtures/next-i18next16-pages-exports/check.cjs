const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { mkdirSync, mkdtempSync, readFileSync, rmdirSync, unlinkSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join } = require('node:path');

function load(stage, version) {
  const cwd = join(__dirname, stage);
  assert.equal(JSON.parse(readFileSync(join(cwd, 'node_modules', 'next-i18next', 'package.json'), 'utf8')).version, version);
  return createRequire(join(cwd, 'package.json'));
}

const before = load('before', '15.4.2');
const after = load('after', '16.5.1');
assert.equal(typeof before('next-i18next').appWithTranslation, 'function');
assert.equal(after('next-i18next').appWithTranslation, undefined);
assert.throws(() => after('next-i18next/serverSideTranslations'), { code: 'ERR_PACKAGE_PATH_NOT_EXPORTED' });
assert.equal(typeof after('next-i18next/pages').appWithTranslation, 'function');

const localePath = mkdtempSync(join(tmpdir(), 'deploom-next-i18next-'));
const locale = join(localePath, 'en');
const localeFile = join(locale, 'common.json');
mkdirSync(locale);
writeFileSync(localeFile, '{"title":"Local pages translation"}');

async function check() {
  try {
    const options = { i18n: { defaultLocale: 'en', locales: ['en'] }, localePath };
    const baseline = before('next-i18next/serverSideTranslations').serverSideTranslations;
    const repaired = after('next-i18next/pages/serverSideTranslations').serverSideTranslations;
    for (const loadTranslations of [baseline, repaired]) {
      const props = await loadTranslations('en', ['common'], options);
      assert.equal(props._nextI18Next.initialI18nStore.en.common.title, 'Local pages translation');
    }
    console.log('The Pages Router imports retain the local SSR namespace on next-i18next 16.');
  } finally {
    unlinkSync(localeFile);
    rmdirSync(locale);
    rmdirSync(localePath);
  }
}

check().catch(error => { console.error(error); process.exitCode = 1; });
