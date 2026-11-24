# Preserve thunk behavior with the Redux Toolkit builder

The pinned TrainingPlan migration converts computed async-thunk action keys in `createSlice.extraReducers` to builder registrations. The fixture pins Redux Toolkit 1.9.3 for the old behavior and 2.13.0, the version in the pinned project's npm lock, for the new behavior.

The object form handles pending, fulfilled and rejected actions on Redux Toolkit 1.9.3. Redux Toolkit 2.13.0 development mode rejects it when the store initializes the reducer. The builder form preserves all three state transitions and keeps the state reference for an unrelated action. The same builder form passes on both pinned versions, so the code edit can precede the dependency update.

Replace the object-valued `extraReducers` in the affected slice with a builder callback. Register the same case handlers, passing typed action creators where available. Run the owning store tests for pending, fulfilled and rejected branches and preserve an unrelated action as a control.

The reproduction uses Node 24.18.0 and npm 11.16.0. It exercises Redux state and thunk dispatch locally. The complete Expo application, production bundling and the official codemod are outside the fixture.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned TrainingPlan slice migration](https://github.com/DimaSydorko/TrainingPlan/commit/a2543112956ead213de953b91f978f69ca2da492)
- [Pinned target lockfile](https://github.com/DimaSydorko/TrainingPlan/blob/a2543112956ead213de953b91f978f69ca2da492/package-lock.json)
- [Redux Toolkit 2 migration guide](https://redux.js.org/usage/migrations/migrating-rtk-2#object-syntax-for-createsliceextrareducers-and-createreducer-removed)
