# Migrate explicitly named field registration to React Hook Form 7

The pinned LiteFarm migration updates React Hook Form from 6.15.4 to 7.4.0 in its web app. The fixture uses the same major-version boundary with React 17.0.2 held.

The original form puts a v6 registration callback on an explicitly named input. It blocks a blank submission and submits the entered value on 6.15.4. Holding the old registration on 7.4.0 fails at runtime. The official `v7/update-register` transform from `@hookform/codemod@1.0.0` emits `{...register('project', { required: true })}`. The transformed form on 7.4.0 retains the required rule and submitted payload. An unrelated input stays unchanged.

Use this transform for matching explicitly named inputs. The transform missed registration when the input name came only through a JSX spread, and that transformed variant failed the same form test. Review every changed field and exercise required validation and a populated submission. Inspect wrappers and manually forwarded refs independently.

The reproduction uses Node 24.18.0, npm 11.16.0, and jsdom. The test invokes the published transform directly with the TSX parser. Full application, browser, alternative field APIs and CLI workflow have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned LiteFarm v7 migration](https://github.com/LiteFarmOrg/LiteFarm/commit/ff1a1ffc1df79a388938107a7ae5f8de36b83e1d)
- [Official v7 registration codemod source](https://github.com/react-hook-form/codemod/tree/5c6d82c17ceacf34fa56a015e72e85987707c809#v7update-register)
- [React Hook Form 7.4.0 release](https://github.com/react-hook-form/react-hook-form/releases/tag/v7.4.0)
