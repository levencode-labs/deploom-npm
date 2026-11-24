'use strict';

const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

const before = require('./before/node_modules/astro/package.json');
const after = require('./after/node_modules/astro/package.json');
assert.equal(before.version, '5.18.2');
assert.equal(after.version, '6.4.8');

const legacyConfig = `
  import { defineCollection, z } from 'astro:content';
  const posts = defineCollection({ type: 'content', schema: z.object({ title: z.string() }) });
  export const collections = { posts };
`;
const layerConfig = `
  import { defineCollection } from 'astro:content';
  import { glob } from 'astro/loaders';
  import { z } from 'astro/zod';
  const posts = defineCollection({
    loader: glob({ pattern: '**/*.md', base: './src/content/posts' }),
    schema: z.object({ title: z.string() }),
  });
  export const collections = { posts };
`;

function run(arm, manifest, migrated) {
  const root = path.join(__dirname, arm);
  const project = fs.mkdtempSync(path.join(root, 'astro-case-'));
  const write = (relative, body) => {
    const destination = path.join(project, relative);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    fs.writeFileSync(destination, body);
  };
  const html = relative => {
    const file = path.join(project, 'dist', relative, 'index.html');
    return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
  };
  try {
    write('package.json', JSON.stringify({ private: true, type: 'module' }));
    if (migrated) {
      write('src/content.config.ts', layerConfig);
    } else {
      write('src/content/config.ts', legacyConfig);
    }
    write('src/content/posts/release-note.md', '---\ntitle: Release note\n---\nSample content.\n');
    write('src/pages/index.astro', '<h1>Home marker</h1>');
    write('src/pages/posts/[slug].astro', `
---
import { GET_COLLECTION_IMPORTS } from 'astro:content';

export async function getStaticPaths() {
  return (await getCollection('posts')).map(entry => ({
    params: { slug: entry.ENTRY_KEY },
    props: { entry },
  }));
}

const { entry } = Astro.props;
const { Content } = await RENDER_ENTRY;
---
<h1>{entry.data.title}</h1>
<Content />
`
      .replace('GET_COLLECTION_IMPORTS', migrated ? 'getCollection, render' : 'getCollection')
      .replace('ENTRY_KEY', migrated ? 'id' : 'slug')
      .replace('RENDER_ENTRY', migrated ? 'render(entry)' : 'entry.render()'));
    const executable = path.join(root, 'node_modules', 'astro', manifest.bin.astro);
    const build = spawnSync(process.execPath, [executable, 'build'], {
      cwd: project,
      env: { ...process.env, ASTRO_TELEMETRY_DISABLED: '1' },
      encoding: 'utf8',
      timeout: 45_000,
    });
    if (build.error) throw build.error;
    return { status: build.status, log: build.stdout + build.stderr,
      index: html(''), post: html('posts/release-note') };
  } finally {
    const real = fs.realpathSync(project);
    assert.equal(path.dirname(real), fs.realpathSync(root));
    assert.match(path.basename(real), /^astro-case-[A-Za-z0-9]+$/);
    fs.rmSync(real, { recursive: true, force: true });
  }
}

const baseline = run('before', before, false);
assert.equal(baseline.status, 0, baseline.log);
assert.match(baseline.index, /<h1>Home marker<\/h1>/);
assert.match(baseline.post, /<h1>Release note<\/h1>/);
assert.match(baseline.post, /<p>Sample content\.<\/p>/);

const held = run('after', after, false);
assert.equal(held.status, 1, held.log);
assert.match(held.log, /LegacyContentConfigError/);
assert.equal(held.post, null);

const repaired = run('after', after, true);
assert.equal(repaired.status, 0, repaired.log);
assert.match(repaired.post, /<h1>Release note<\/h1>/);
assert.match(repaired.index, /<h1>Home marker<\/h1>/);
assert.match(repaired.post, /<p>Sample content\.<\/p>/);
console.log('The Astro 6 Content Layer restores the generated entry route and preserves the home page.');
