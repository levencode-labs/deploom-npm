const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const http = require('node:http');
const path = require('node:path');
const { createRequire } = require('node:module');
const { once } = require('node:events');
const { build } = require('esbuild');
const { chromium } = require('playwright');

assert.equal(process.version, 'v24.18.0', 'Replay requires the qualified Node version');
assert.equal(require('esbuild/package.json').version, '0.25.10');
assert.equal(require('playwright/package.json').version, '1.56.1');
const claims = [
  { package: 'react-dom', from: '18.3.1', to: '19.3.0', check: 'test', outcome: 'passed' },
  { package: 'react-router-dom', from: '6.30.3', to: '7.18.4', check: 'test', outcome: 'passed' },
];
const matrix = [
  { name: 'baseline', arm: 'before', nodeRef: false, splitRoute: false, badTransition: false, badRoute: false },
  { name: 'upgraded-unfixed', arm: 'after', nodeRef: false, splitRoute: false, badTransition: true, badRoute: true },
  { name: 'transition-fix-only', arm: 'after', nodeRef: true, splitRoute: false, badTransition: false, badRoute: true },
  { name: 'route-fix-only', arm: 'after', nodeRef: false, splitRoute: true, badTransition: true, badRoute: false },
  { name: 'both-fixes', arm: 'after', nodeRef: true, splitRoute: true, badTransition: false, badRoute: false },
];
const viewports = [
  { name: 'desktop', viewport: { width: 1280, height: 800 }, isMobile: false, hasTouch: false },
  { name: 'mobile', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
];
const args = process.argv.slice(2);
assert.ok(args.length === 0 || args.length === 2 && args[0] === '--output', 'Use --output <report.json>');
const output = path.resolve(args[1] || path.join(__dirname, 'build', 'execution.json'));
fs.mkdirSync(path.dirname(output), { recursive: true });
const digest = bytes => crypto.createHash('sha256').update(bytes).digest('hex');

function installed(arm) {
  const load = createRequire(path.join(__dirname, arm, 'package.json'));
  const exact = arm === 'before'
    ? { react: '18.3.1', 'react-dom': '18.3.1', 'react-router-dom': '6.30.3', 'react-transition-group': '4.4.5' }
    : { react: '19.3.0', 'react-dom': '19.3.0', 'react-router-dom': '7.18.4', 'react-transition-group': '4.4.5' };
  for (const [name, version] of Object.entries(exact)) assert.equal(load(`${name}/package.json`).version, version);
  return exact;
}

function sourceInputs() {
  const paths = [
    'check.cjs', 'app.jsx', 'style.css', 'package.json', 'package-lock.json',
    'before/package.json', 'before/package-lock.json', 'after/package.json', 'after/package-lock.json',
  ];
  return paths.map(name => {
    const bytes = fs.readFileSync(path.join(__dirname, name));
    return { path: name, bytes: bytes.length, sha256: digest(bytes) };
  });
}

async function buildArms() {
  const bundles = {};
  for (const arm of ['before', 'after']) {
    const result = await build({
      absWorkingDir: path.join(__dirname, arm),
      stdin: { contents: fs.readFileSync(path.join(__dirname, 'app.jsx'), 'utf8'), loader: 'jsx', resolveDir: path.join(__dirname, arm), sourcefile: 'app.jsx' },
      bundle: true, write: false, format: 'iife', platform: 'browser', target: 'chrome141', jsx: 'automatic',
      define: { 'process.env.NODE_ENV': '"development"' }, logLevel: 'silent',
    });
    assert.equal(result.outputFiles.length, 1);
    bundles[arm] = result.outputFiles[0].contents;
  }
  return bundles;
}

async function waitLocation(page, origin, expected) {
  await page.waitForURL(`${origin}${expected}`);
  // Router 7 commits its React transition after changing browser history.
  // Wait for the application's route output as well as the address bar.
  await page.waitForFunction(value => document.querySelector('[data-testid="location"]')?.textContent === value, expected);
}

async function replay(browser, origin, item, viewport, reportDirectory) {
  const { name, ...configuration } = viewport;
  const context = await browser.newContext({ ...configuration, locale: 'en-US', timezoneId: 'UTC', deviceScaleFactor: 1 });
  const page = await context.newPage();
  const errors = [];
  const unexpectedRequests = [];
  page.on('pageerror', error => errors.push(error.message));
  await context.route('**/*', route => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    unexpectedRequests.push(route.request().url());
    return route.abort();
  });
  try {
    await page.goto(`${origin}/dashboard/team`, { waitUntil: 'networkidle' });
    assert.equal(await page.getByTestId('versions').textContent(), `React ${item.arm === 'before' ? '18.3.1' : '19.3.0'}`);
    assert.equal(await page.getByTestId('route-title').textContent(), 'Team page');
    const observed = { variant: item.name, viewport: viewport.name, settings: { nodeRef: item.nodeRef, splitRoute: item.splitRoute } };
    const input = page.getByLabel('Draft title', { exact: true });
    await input.focus();
    await page.keyboard.type('Quarterly budget');
    assert.equal(await input.inputValue(), 'Quarterly budget');
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button', { name: 'Open details', exact: true }).evaluate(node => node === document.activeElement), true);

    observed.relativeHref = await page.getByTestId('reports-relative').getAttribute('href');
    observed.absoluteHref = await page.getByTestId('reports-absolute').getAttribute('href');
    assert.equal(observed.absoluteHref, '/dashboard/reports');
    if (item.badRoute) {
      assert.equal(observed.relativeHref, '/dashboard/team/reports');
    } else {
      assert.equal(observed.relativeHref, '/dashboard/reports');
    }
    await page.getByTestId('reports-relative').click();
    await waitLocation(page, origin, observed.relativeHref);
    assert.equal(await page.getByTestId('route-title').textContent(), item.badRoute ? 'Team page' : 'Reports page');
    assert.equal(await input.inputValue(), 'Quarterly budget');
    await page.goBack();
    await waitLocation(page, origin, '/dashboard/team');
    assert.equal(await input.inputValue(), 'Quarterly budget');
    await page.getByTestId('reports-absolute').click();
    await waitLocation(page, origin, '/dashboard/reports');
    assert.equal(await page.getByTestId('route-title').textContent(), 'Reports page');
    await page.goBack();
    await waitLocation(page, origin, '/dashboard/team');
    observed.navigation = item.badRoute ? 'wrong-relative-path-confirmed' : 'sibling-route-and-back-passed';
    observed.absoluteControl = 'passed';

    await input.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Space');
    if (item.badTransition) {
      await page.getByTestId('transition-error').waitFor();
      observed.transitionError = await page.getByTestId('transition-error').textContent();
      assert.match(observed.transitionError, /findDOMNode is not a function/);
      assert.equal(await page.getByTestId('panel').count(), 0);
      observed.transition = 'removed-findDOMNode-failure-confirmed';
    } else {
      await page.locator('[data-testid="panel"].phase-enter-done').waitFor();
      assert.equal(await page.getByTestId('panel').isVisible(), true);
      assert.equal(await page.getByTestId('panel').evaluate(node => getComputedStyle(node).opacity), '1');
      await page.waitForFunction(() => document.activeElement?.textContent === 'Close details');
      const entered = await page.evaluate(() => window.__observations.events.find(event => event.name === 'enter'));
      assert.equal(entered.firstArgument, item.nodeRef ? false : 'element');
      assert.equal(entered.refMatches, item.nodeRef ? true : null);
      await page.keyboard.press('Enter');
      await page.getByTestId('panel').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.textContent === 'Open details');
      assert.equal(await input.inputValue(), 'Quarterly budget');
      // Replay a second cycle to catch a ref that was replaced or detached after exit.
      await page.keyboard.press('Enter');
      await page.locator('[data-testid="panel"].phase-enter-done').waitFor();
      await page.waitForFunction(() => document.activeElement?.textContent === 'Close details');
      const screenshot = path.join('screenshots', `${item.name}-${viewport.name}.png`);
      fs.mkdirSync(path.join(reportDirectory, 'screenshots'), { recursive: true });
      await page.screenshot({ path: path.join(reportDirectory, screenshot), fullPage: true });
      observed.screenshot = { path: screenshot, sha256: digest(fs.readFileSync(path.join(reportDirectory, screenshot))) };
      await page.keyboard.press('Enter');
      await page.getByTestId('panel').waitFor({ state: 'detached' });
      await page.waitForFunction(() => document.activeElement?.textContent === 'Open details');
      observed.transition = 'two-enter-exit-cycles-passed';
      observed.focusReturn = 'open-button-after-each-exit';
      assert.deepEqual(errors, []);
    }
    assert.equal(await input.inputValue(), 'Quarterly budget');
    assert.equal(await page.getByTestId('saved-value').textContent(), 'Draft: Quarterly budget');
    observed.events = await page.evaluate(() => window.__observations.events);
    observed.boundaryErrors = await page.evaluate(() => window.__observations.errors);
    if (!item.badTransition) assert.deepEqual(observed.boundaryErrors, []);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(unexpectedRequests, []);
    observed.keyboardInputAndTabOrder = 'passed';
    observed.horizontalOverflow = false;
    observed.externalRequests = 0;
    return observed;
  } finally { await context.close(); }
}

async function main() {
  const versions = { before: installed('before'), after: installed('after') };
  const inputs = sourceInputs();
  const bundles = await buildArms();
  const style = fs.readFileSync(path.join(__dirname, 'style.css'), 'utf8');
  let active;
  const server = http.createServer((request, response) => {
    response.setHeader('Cache-Control', 'no-store');
    if (request.url === '/fixture.js') {
      response.setHeader('Content-Type', 'text/javascript');
      response.end(bundles[active.arm]);
    } else {
      response.setHeader('Content-Type', 'text/html; charset=utf-8');
      response.end(`<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>DepLoom browser evidence</title><style>${style}</style><body><div id="root"></div><script>window.__fixture=${JSON.stringify({ nodeRef: active.nodeRef, splitRoute: active.splitRoute })}</script><script src="/fixture.js"></script></body></html>`);
    }
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  // Pin the same Chromium Headless Shell that Playwright uses for its default
  // headless launch. Resolve it explicitly so the report hashes the binary
  // actually executed, not the separate full Chrome executable.
  assert.ok(['linux', 'win32'].includes(process.platform), 'Qualified browser platforms: Linux and Windows');
  const chromeRoot = path.dirname(path.dirname(chromium.executablePath()));
  assert.equal(path.basename(chromeRoot), 'chromium-1194');
  const executablePath = path.join(path.dirname(chromeRoot), 'chromium_headless_shell-1194',
    process.platform === 'win32' ? 'chrome-win' : 'chrome-linux',
    process.platform === 'win32' ? 'headless_shell.exe' : 'headless_shell');
  let browser;
  const results = [];
  try {
    browser = await chromium.launch({ executablePath, headless: true });
    assert.equal(browser.version(), '141.0.7390.37');
    for (const item of matrix) {
      active = item;
      for (const viewport of viewports) {
        results.push(await replay(browser, origin, item, viewport, path.dirname(output)));
        console.log(`PASS ${item.name} ${viewport.name}`);
      }
    }
    const report = {
      schema: 1, fixture: 'stageb-react-ui', status: 'passed', outcome: 'passed',
      node: process.version, platform: process.platform, architecture: process.arch,
      tools: { playwright: '1.56.1', esbuild: '0.25.10', browser: browser.version(), browserDistribution: 'chromium-headless-shell', browserRevision: '1194', browserBinarySha256: digest(fs.readFileSync(executablePath)) },
      packages: versions, inputs, bundleSha256: Object.fromEntries(Object.entries(bundles).map(([key, bytes]) => [key, digest(bytes)])),
      claims, results,
      limitations: ['Synthetic application, not recipient-project acceptance.', 'Chromium only; mobile is a Chromium viewport emulation, not a physical device.'],
    };
    fs.writeFileSync(output, JSON.stringify(report, null, 2) + '\n');
    console.log(`Wrote ${output}`);
  } finally {
    if (browser) await browser.close();
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
