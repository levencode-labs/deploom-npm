# npm migration controls, batch 006

The fixture checks 100 exact package pairs. It combines archive-level contract comparisons with runtime controls for a Vite PWA build, the Syncpack CLI and a Chai plugin. The source and target builds use only generated local inputs. Each successful record describes the scenario covered by its control.

Reproduce on Node.js 24.18.0 with npm 11.16.0. Run `npm ci --ignore-scripts --no-audit --no-fund` in `p00`, `pwa-size`, `chai-esm` and `syncpack-cli`. Then run `node check.cjs` from this directory. Syncpack versions 14 and 15 require the platform binary installed as an optional dependency.

For an independent archive replay, download the packages specified in `facts.json` to `archives` using npm pack names. Run `python verify_facts.py archives` with Python 3.11 or later to verify the archives, manifests and selected files.

## Upstream migration material

- [Vite PWA maximum file size behavior](https://vite-pwa-org.netlify.app/guide/faq)
- [Syncpack changelog](https://github.com/JamieMason/syncpack/blob/main/CHANGELOG.md)
- [Jotai v2 API migration](https://jotai.org/docs/guides/migrating-to-v2-api)
- [Storybook 9 migration](https://storybook.js.org/docs/9/releases/migration-guide)
- [React integration with MobX](https://mobx.js.org/react-integration.html)
