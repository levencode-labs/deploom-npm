# Preserve Markdown heading deep links after upgrading Marked

The pinned Angular Schule article builder upgrade adds marked-gfm-heading-id to the renderer. Its lock resolves Marked 4.3.0 before the migration and Marked 17.0.1 with marked-gfm-heading-id 4.1.3 after it.

Marked 4 emits release-notes and release-notes-1 for two headings with the same text. The held Marked 17 renderer keeps the in-document link but emits headings without those IDs. The extension restores both IDs, and rendering the same Markdown a second time keeps the same IDs.

Apply when the existing Markdown output supplies heading IDs used by links, a table of contents or bookmarks. Register the compatible extension on the renderer and compare the generated IDs with links for duplicate headings. Check existing prefixes and representative multilingual or punctuated headings if they are part of the link contract.

The fixture pins Node 24.18.0 and npm 11.16.0. It verifies the tested duplicate heading deep link. Other slug normalization cases and custom renderers need separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Angular Schule Marked upgrade](https://github.com/angular-schule/website-articles-build/commit/d72dac292882676b363cd46e5b8375ee41d8a45a)
- [Marked removed heading options and recommended extension](https://marked.js.org/using_advanced#old-options)
