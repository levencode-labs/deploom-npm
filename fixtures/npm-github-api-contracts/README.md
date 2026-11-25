# npm API and configuration migration fixtures

Each claim covers the exact npm versions shown in `check.cjs`. The tests replay the old use, reject it or observe the changed outcome on the target, and check a focused migration. For setup imports and CLI entries, some tests check resolution instead of executing the tool.

The tests use npm lockfiles and Node.js 24.18.0. Install every arm with `npm ci --ignore-scripts --strict-peer-deps --no-audit --no-fund`. Use `--include=optional` for the Vite and Tailwind arms and `--omit=optional` for the others. Then run `node check.cjs`.

## Upstream references

- [Ajv 6 to 8](https://ajv.js.org/v6-to-v8-migration.html), [Zod 4](https://zod.dev/v4/changelog), and [js-yaml](https://github.com/nodeca/js-yaml/blob/master/CHANGELOG.md).
- [Lru-cache](https://github.com/isaacs/node-lru-cache#breaking-changes-in-version-9), [Commander](https://github.com/tj/commander.js/blob/master/CHANGELOG.md), [uuid](https://github.com/uuidjs/uuid/blob/main/CHANGELOG.md), [signal-exit](https://github.com/tapjs/signal-exit#usage), and [mime](https://github.com/broofa/mime/blob/main/CHANGELOG.md).
- [Date-fns v2](https://date-fns.org/v2.0.0/docs/Upgrade-Guide), [date-fns v3](https://blog.date-fns.org/v3-is-out/), [Async v3](https://caolan.github.io/async/v3/docs.html#queue), and [Terser v5](https://github.com/terser/terser/blob/master/CHANGELOG.md).
- [Jest DOM v6](https://github.com/testing-library/jest-dom/releases/tag/v6.0.0), [Immer v10](https://immerjs.github.io/immer/migration-guide/), [Reselect v5](https://reselect.js.org/introduction/v5-summary/), and [Redux v5](https://redux-toolkit.js.org/usage/migrating-rtk-2).
- [Vite 6](https://v6.vite.dev/guide/migration.html#default-value-for-resolve-conditions) documents the client conditions removed from custom resolver defaults.
- [React 19](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-proptypes-and-defaultprops-for-functions) documents the JSX and function-default changes. The `useRef` test compiles the manual equivalent of [types-react-codemod v3.5.0: useRef-required-initial](https://github.com/eps1lon/types-react-codemod/tree/v3.5.0#useref-required-initial-react-19). Review the codemod diff and run the project's typecheck before applying it. The bundle does not execute the codemod.
- [Tailwind CSS v4](https://tailwindcss.com/docs/upgrade-guide) documents the PostCSS adapter and the `@tailwindcss/upgrade` tool. The tested path is the manual adapter and CSS entry change. The upgrade tool is an optional next step for matching projects.

The fixtures cover plain sample inputs. Projects still need their own builds, typechecks, tests and browser checks as applicable.
