const assert = require('node:assert/strict')
const { spawnSync } = require('node:child_process')
const { createHash } = require('node:crypto')
const fs = require('node:fs')
const path = require('node:path')

const viteVersion = '7.3.6'
const methods = ['mock', 'unmock', 'hoisted']
const files = [
  'dependency.js', 'nested-mock.test.js', 'nested-unmock.test.js',
  'nested-hoisted.test.js', 'valid-hoisted-controls.test.js',
  'valid-unmock.test.js', 'valid-dynamic.test.js', 'vitest.config.mjs',
]
const hash = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex')
const json = (file) => JSON.parse(fs.readFileSync(file, 'utf8'))
const own = (dir, name) => path.join(__dirname, dir, name)
const manifest = (dir, name) => own(dir, 'node_modules/' + name + '/package.json')
const identities = []
const results = []

function run(dir, selection) {
  const argv = [own(dir, 'node_modules/vitest/vitest.mjs'), 'run', '--cache=false', '--config', 'vitest.config.mjs', selection]
  const cwd = own(dir, '.')
  const run = spawnSync(process.execPath, argv, { cwd, encoding: 'utf8', timeout: 60000 })
  if (run.error) throw run.error
  const output = run.stdout + run.stderr
  results.push({ dir, argv, cwd, exitCode: run.status, output })
  return { status: run.status, output }
}

for (const [dir, vitestVersion] of [['v4', '4.1.10'], ['v5', '5.0.0']]) {
  const lockPath = own(dir, 'package-lock.json')
  const lock = json(lockPath)
  const vitestPath = manifest(dir, 'vitest')
  const vitePath = manifest(dir, 'vite')
  const viteFromVitest = require.resolve('vite/package.json', { paths: [path.dirname(vitestPath)] })
  assert.equal(json(vitestPath).version, vitestVersion)
  assert.equal(json(vitePath).version, viteVersion)
  assert.equal(fs.realpathSync(viteFromVitest), fs.realpathSync(vitePath))
  for (const [pkg, version] of [['vite', viteVersion], ['vitest', vitestVersion], ['@vitest/mocker', vitestVersion]]) {
    const locked = lock.packages['node_modules/' + pkg]
    assert.equal(locked.version, version)
    assert.match(locked.integrity, /^sha512-/)
    assert.equal(new URL(locked.resolved).hostname, 'registry.npmjs.org')
  }
  for (const file of files) assert.equal(hash(own(dir, file)), hash(own('v4', file)), file)
  identities.push({
    dir, runtime: { vitest: vitestVersion, vite: viteVersion, viteFromVitest, mocker: json(manifest(dir, '@vitest/mocker')).version },
    lockSha256: hash(lockPath),
    manifestSha256: hash(own(dir, 'package.json')),
  })
}

const baseline = run('v4', 'nested-')
assert.equal(baseline.status, 0)
assert.match(baseline.output, /Tests\s+3 passed/)
for (const method of methods) assert.ok(baseline.output.includes('Warning: A vi.' + method + '('))
const held = run('v5', 'nested-')
assert.equal(held.status, 1)
assert.match(held.output, /Test Files\s+3 failed/)
assert.match(held.output, /Tests\s+no tests/)
assert.equal((held.output.match(/Plugin: vitest:mocks/g) || []).length, 3)
assert.equal((held.output.match(/was defined outside of the module's top level scope/g) || []).length, 3)
for (const method of methods) assert.ok(held.output.includes('- vi.' + method + '('))
for (const dir of ['v4', 'v5']) {
  const valid = run(dir, 'valid-')
  assert.equal(valid.status, 0)
  assert.match(valid.output, /Tests\s+3 passed/)
  assert.doesNotMatch(valid.output, /not at the top level|outside of the module's top level scope/)
}

process.stdout.write(JSON.stringify({
  node: process.version, platform: process.platform + '-' + process.arch,
  checkSha256: hash(__filename), identities, results,
  fileSha256: Object.fromEntries(files.map((name) => [name, hash(own('v4', name))])),
}, null, 2) + '\n')
