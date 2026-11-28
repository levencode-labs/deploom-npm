# Stage B — practical migration evidence (research, not admitted)

Frozen candidate matrix before any execution:

| Case | Manager | Baseline | Held / unchanged | Repair | Negative control / observable |
| --- | --- | --- | --- | --- | --- |
| React UI transition | Yarn 1.22.22 | React + React DOM 18.3.1, react-transition-group 4.4.5, jsdom 25.0.1 | both 19.3.0, unchanged implicit ref; expect findDOMNode error | explicit nodeRef bound to rendered DOM node | incorrect click handler must fail count assertion; enter/exit and increment/reset |
| TypeScript project references | pnpm 10.11.0 | TS 5.9.2, two linked workspace packages, composite builds | TS 6.0.3 with baseUrl; expect TS5101 | remove baseUrl, retain explicit paths | remove paths too: TS2307; emitted app consumes workspace package and returns 42 |
| Vite + Vue joint upgrade | npm 11.16.0 | Vite 5.0.10 / plugin-vue 4.5.0 / Vue 3.3.8 | Vite 8.3.8 / plugin-vue 4.5.0; expect ERESOLVE | Vite 8.3.8 / plugin-vue 6.0.7 | wrong handler must fail a browser assertion; Chromium clicks, fills, submits and resets real built app |

Toolchain: Node 24.18.0, npm 11.16.0, Yarn 1.22.22, pnpm 10.11.0, Playwright 1.57.0. Network is used only for public dependency acquisition and browser setup; no paid agent calls. All execution uses synthetic fixtures, not a recipient project. Yarn is classic, not Berry. The React case is DOM-level in jsdom; the Vue case is a real browser. No private source, global user configuration, or production publishing.

Source basis: exact npm baseline 31b782f3bec915fd66b5dd5cee929522c70eb51c, particularly fixtures/react-dom19-transition-ref, fixtures/typescript6-baseurl-alias, fixtures/vite8-vue-peer and fixtures/playwright-api-transitions/test. These are existing pinned evidence; this research adds new manager/workspace/browser observations. Existing npm locks are reused untouched for Vue and Playwright.

## Acceptance

This first PR runs research-only lock discovery for Yarn/pnpm; the generated locks and test outcomes must be retained with hashes. A follow-up commit must retain the exact discovered locks and replay with frozen installs and no lock regeneration. Require all cases, expected diagnostic/negative controls, behavioral assertions, exact installed versions, source commit, lock hashes, and terminal CI. Do not change the matrix to get a green run. An infrastructure failure is UNKNOWN, not a reproduced dependency failure. Do not admit records or claim project applicability before receipts and review. Stage A publisher PR #151 stays separate. After A is deployed, integrate accepted cases into the production evidence contract with scoped recipes (not unconditional independent package upgrades).
