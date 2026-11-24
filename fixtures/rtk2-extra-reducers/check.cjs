'use strict';

const assert = require('node:assert/strict');

process.env.NODE_ENV = 'development';
const older = require('./before/node_modules/@reduxjs/toolkit');
const newer = require('./after/node_modules/@reduxjs/toolkit');

assert.equal(require('./before/node_modules/@reduxjs/toolkit/package.json').version, '1.9.3');
assert.equal(require('./after/node_modules/@reduxjs/toolkit/package.json').version, '2.13.0');

function createPlansStore(toolkit, useBuilder) {
  const fetchPlans = toolkit.createAsyncThunk('plans/fetch', (shouldFail, { rejectWithValue }) => {
    return shouldFail ? rejectWithValue('unavailable') : ['plan'];
  });

  const loading = state => {
    state.status = 'loading';
    state.error = null;
  };
  const loaded = (state, { payload }) => {
    state.status = 'ready';
    state.items = payload;
  };
  const rejected = (state, { payload }) => {
    state.status = 'error';
    state.error = payload;
  };
  const slice = toolkit.createSlice({
    name: 'plans',
    initialState: { status: 'idle', items: [], error: null },
    reducers: {},
    extraReducers: useBuilder
      ? builder => builder
        .addCase(fetchPlans.pending, loading)
        .addCase(fetchPlans.fulfilled, loaded)
        .addCase(fetchPlans.rejected, rejected)
      : {
        [fetchPlans.pending.type]: loading,
        [fetchPlans.fulfilled.type]: loaded,
        [fetchPlans.rejected.type]: rejected,
      },
  });
  return { store: toolkit.configureStore({ reducer: slice.reducer }), fetchPlans };
}

async function verifyStates({ store, fetchPlans }) {
  const success = store.dispatch(fetchPlans(false));
  assert.deepEqual(store.getState(), { status: 'loading', items: [], error: null });
  await success;
  assert.deepEqual(store.getState(), { status: 'ready', items: ['plan'], error: null });

  await store.dispatch(fetchPlans(true));
  const error = store.getState();
  assert.deepEqual(error, { status: 'error', items: ['plan'], error: 'unavailable' });
  store.dispatch({ type: 'unrelated' });
  assert.strictEqual(store.getState(), error);
}

async function main() {
  await verifyStates(createPlansStore(older, false));
  const objectSyntaxRemoved = /object notation for .*extraReducers.* has been removed/i;
  assert.throws(() => createPlansStore(newer, false), objectSyntaxRemoved);
  await verifyStates(createPlansStore(older, true));
  await verifyStates(createPlansStore(newer, true));
  console.log('The builder callback preserves async-thunk reducer behavior on both majors.');
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
