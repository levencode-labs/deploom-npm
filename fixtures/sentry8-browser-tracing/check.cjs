'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { join } = require('node:path');

const legacyPackage = require('./before/node_modules/@sentry/react/package.json');
assert.equal(legacyPackage.version, '7.120.4');
assert.equal(legacyPackage.peerDependencies.react, '15.x || 16.x || 17.x || 18.x');
assert.equal(require('./before/node_modules/@sentry/tracing/package.json').version, '7.120.4');
const targetPackage = require('./after/node_modules/@sentry/react/package.json');
assert.equal(targetPackage.version, '8.55.2');
assert.equal(targetPackage.peerDependencies.react, '^16.14.0 || 17.x || 18.x || 19.x');

const scenario = `
  const assert = require('node:assert/strict');
  const { JSDOM } = require('jsdom');
  const { window } = new JSDOM('<p>Migration</p>', {
    url: 'https://fixture.invalid/', pretendToBeVisual: true,
  });
  Object.assign(globalThis, {
    window,
    document: window.document,
    location: window.location,
    history: window.history,
  });

  let networkCalls = 0;
  const blockNetwork = () => {
    networkCalls += 1;
    throw new Error('Unexpected network transport');
  };
  globalThis.fetch = blockNetwork;
  window.fetch = blockNetwork;
  const Sentry = require('@sentry/react');

  async function main() {
    try {
      const requestTracing = { traceFetch: false, traceXHR: false };
      const tracing = process.argv[1] === 'factory'
        ? Sentry.browserTracingIntegration({
          ...requestTracing, instrumentPageLoad: false, instrumentNavigation: false,
        })
        : new (require('@sentry/tracing').Integrations.BrowserTracing)({
          ...requestTracing, startTransactionOnPageLoad: false, startTransactionOnLocationChange: false,
        });
      const items = [];
      Sentry.init({
        dsn: 'https://fixture@example.invalid/1',
        defaultIntegrations: false,
        autoSessionTracking: false,
        integrations: [tracing],
        transport: () => ({
          send(envelope) {
            items.push(...envelope[1]);
            return Promise.resolve({ statusCode: 200 });
          },
          flush() {
            return Promise.resolve(true);
          },
        }),
      });
      const client = Sentry.getClient();
      const registered = client.getIntegrationByName('BrowserTracing');
      assert.equal(registered, tracing);
      Sentry.captureMessage('fixture event');
      assert.equal(await Sentry.flush(2000), true);
      const messages = items.filter(([header]) => header.type === 'event').map(([, payload]) => payload.message);
      process.stdout.write(JSON.stringify({ integration: registered.name, messages, networkCalls }));
    } finally {
      try {
        if (Sentry.getClient()) await Sentry.close(2000);
      } finally {
        window.close();
      }
    }
  }

  main().catch(error => {
    console.error(error);
    process.exitCode = 1;
  });
`;

function run(arm, form) {
  const result = spawnSync(process.execPath, ['-e', scenario, form], {
    cwd: join(__dirname, arm), encoding: 'utf8', timeout: 12000,
  });
  if (result.error) throw new Error(result.stderr || result.stdout, { cause: result.error });
  return result;
}

const baseline = run('before', 'constructor');
assert.equal(baseline.status, 0, baseline.stderr);
assert.deepEqual(JSON.parse(baseline.stdout), {
  integration: 'BrowserTracing', messages: ['fixture event'], networkCalls: 0,
});

const held = run('after', 'constructor');
assert.equal(held.status, 1, held.stderr);
assert.match(held.stderr, /Cannot find module '@sentry\/tracing'/);

const migrated = run('after', 'factory');
assert.equal(migrated.status, 0, migrated.stderr);
assert.deepEqual(JSON.parse(migrated.stdout), JSON.parse(baseline.stdout));
console.log('Sentry 8 registers BrowserTracing and captures the same test event with the local transport.');
