# Await user-event typing and focus changes after upgrading to v14

The pinned react-currency-input-field migration starts a user-event session and awaits typing and tabbing in its tests. Its pnpm lock records 13.5.0 and 14.6.7 with Testing Library DOM 9.3.3.

The fixture uses the two releases against the same jsdom form. On 13.5.0, direct typing and tabbing update the value and focus before the call returns. On 14.6.7, the immediate assertions would see an empty input and the old focus. Awaiting the direct calls still works. Starting a setup session and awaiting the calls preserves the same final value and focus.

Create a session for the interaction and await the actions that the assertions depend on. Verify the actual input value and focus transition. Awaited direct calls are also supported for tests that already use them.

The reproduction uses Node 24.18.0, npm 11.16.0, and jsdom 25.0.1. It exercises an isolated input and button. The full React component and timing with fake timers have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned react-currency-input-field migration](https://github.com/cchanxzy/react-currency-input-field/commit/acbd8ec076fab95cfdc02ee9897582021f811e9d)
- [Testing Library user-event setup](https://testing-library.com/docs/user-event/setup/)
- [Testing Library user-event v13 API](https://testing-library.com/docs/user-event/v13/)
