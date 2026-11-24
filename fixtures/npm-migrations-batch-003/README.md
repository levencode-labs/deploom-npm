# Pinned npm migration scenarios · Batch 003

This fixture replays 100 exact npm pairs on Node.js 24.18.0 and npm 11.16.0. The Nx checks inspect shipped migrations and declarations. Peer and engine checks compare published requirements. Other cases exercise bounded runtime and TypeScript samples.

```sh
for arm in p*/; do
  npm ci --prefix "$arm" --ignore-scripts --omit=optional --no-fund --no-audit
done
node check.cjs
```

For archive provenance, obtain the exact public tarballs named in `facts.json` with `npm pack --ignore-scripts`, then run `python verify_facts.py <archive-directory>`. The verifier matches their integrity, manifest fields, and relevant shipped Nx artifacts.

- [Nx 21](https://nx.dev/blog/nx-21-release), [Nx 22](https://nx.dev/blog/nx-22-release), [Nx 24](https://nx.dev/blog/nx-24-release), and [Nx migrations](https://nx.dev/docs/reference/nx/migrations)
- [React Dropzone 18](https://github.com/react-dropzone/react-dropzone/releases/tag/v18.0.0) and [19](https://github.com/react-dropzone/react-dropzone/releases/tag/v19.0.0)
- [Happy DOM 19](https://github.com/capricorn86/happy-dom/releases/tag/v19.0.0), [20](https://github.com/capricorn86/happy-dom/releases/tag/v20.0.0), and [21](https://github.com/capricorn86/happy-dom/releases/tag/v21.0.0)
- [Sinon migration](https://sinonjs.org/guides/migration/) and [Puppeteer 23](https://github.com/puppeteer/puppeteer/releases/tag/puppeteer-v23.0.0)
- [Copy Webpack Plugin 13](https://github.com/webpack/copy-webpack-plugin/releases/tag/v13.0.0), [Commitlint 20](https://github.com/conventional-changelog/commitlint/releases/tag/v20.0.0), [Vitest migration](https://vitest.dev/guide/migration/), and [Storybook 10](https://storybook.js.org/docs/10/releases/migration-guide)
