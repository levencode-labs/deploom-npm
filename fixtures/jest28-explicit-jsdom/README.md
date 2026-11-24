# Install the explicit jsdom environment for Jest 28 DOM tests

The pinned Userscripter upgrade keeps testEnvironment set to jsdom in jest.config.mjs. It moves Jest from 27.5.1 to 28.1.3 and declares jest-environment-jsdom 28.1.3 directly.

The same DOM click test runs in a Jest 27.5.1 installation without a direct environment declaration. A separate Jest 28.1.3 install without the environment fails during configuration. Installing the matching jest-environment-jsdom package restores the DOM test.

Apply when the project uses a jsdom test environment through configuration or a test annotation. Include a compatible jest-environment-jsdom development dependency in the update, keep the existing environment configuration, and run a representative DOM test. Node-only projects have a separate environment choice.

The reproduction uses Node 24.18.0 and npm 11.16.0. The example covers Jest's environment selection and one DOM click without further test transforms. TypeScript transformers, custom environments and project-specific DOM behavior require separate verification.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix held --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Userscripter Jest migration](https://github.com/SimonAlling/userscripter/commit/4b5e36f905703648f846e128196f6e255eaec963)
- [Pinned Userscripter jsdom configuration](https://github.com/SimonAlling/userscripter/blob/4b5e36f905703648f846e128196f6e255eaec963/jest.config.mjs)
- [Jest 28 release notes](https://jestjs.io/blog/2022/04/25/jest-28)
