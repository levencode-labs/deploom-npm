# Pinned npm migration scenarios · Batch 002

The fixture checks 100 exact npm pairs. API cases exercise minimal local usage, shipped declaration cases inspect the exact package declarations, and engine and peer cases compare the published manifest ranges. The fixture does not run a project's app, browser matrix, or production monitoring.

Run the fixture with Node.js 24.18.0 and npm 11.16.0.

```sh
for arm in p*/; do
  npm ci --prefix "$arm" --ignore-scripts --omit=optional --no-fund --no-audit
done
node check.cjs
```

To recheck manifest provenance, obtain the exact public npm tarballs listed by package and version in `facts.json` with `npm pack --ignore-scripts`, then run `python verify_facts.py <archive-directory>`. The verifier checks the tarball integrity and every recorded manifest field.

- [Vitest migrations](https://vitest.dev/guide/migration/) and [typescript-eslint 8](https://typescript-eslint.io/blog/announcing-typescript-eslint-v8/)
- [Testing Library React 16](https://github.com/testing-library/react-testing-library/releases/tag/v16.0.0) and [Vite React plugin](https://github.com/vitejs/vite-plugin-react/tree/main/packages/plugin-react)
- [Playwright release notes](https://playwright.dev/docs/release-notes)
- [Storybook 9](https://storybook.js.org/docs/9/releases/migration-guide) and [Storybook 10](https://storybook.js.org/docs/10/releases/migration-guide)
- [Sentry 9](https://docs.sentry.io/platforms/javascript/migration/v8-to-v9/), [Sentry 10](https://docs.sentry.io/platforms/javascript/migration/v9-to-v10/), and [Sentry 11](https://docs.sentry.io/platforms/javascript/migration/v10-to-v11/)
- [Sass breaking changes](https://sass-lang.com/documentation/breaking-changes/), [sass-loader 15](https://github.com/webpack/sass-loader/releases/tag/v15.0.0), and [sass-loader 16](https://github.com/webpack/sass-loader/releases/tag/v16.0.0)
- [Happy DOM interface changes](https://github.com/capricorn86/happy-dom/releases/tag/v14.0.0), [parser changes](https://github.com/capricorn86/happy-dom/releases/tag/v16.0.0), [module scripts](https://github.com/capricorn86/happy-dom/releases/tag/v17.0.0), and [module loading](https://github.com/capricorn86/happy-dom/releases/tag/v19.0.0)
