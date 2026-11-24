# Preserve document validation with Mongoose 9 middleware

The pinned ThePlacementFeed commit replaces a callback-based `pre('validate')` hook with synchronous middleware. Its lockfile records the transition from Mongoose 8.24.6 to 9.11.3.

The reduced document accepts deadlines before or equal to the drive date and rejects a later deadline with a field-specific validation error on Mongoose 8. Holding the callback hook on Mongoose 9 makes even valid input fail with `next is not a function`. The synchronous hook restores valid, boundary, and invalid cases on the target.

For synchronous pre middleware, keep the document context and validation rule and remove the `next` parameter and call. For async pre middleware, settle through its returned promise. Run the model's validation tests for both accepted and rejected inputs.

The reproduction uses Node 24.18.0 and npm 11.16.0. The target package requires Node.js 20.19.0 or newer. The fixture awaits document.validate() without opening a MongoDB connection. Persistence, query middleware, and the rest of the application need separate project checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned ThePlacementFeed migration](https://github.com/MerLin027/ThePlacementFeed/commit/d399f4c4a3ae020faff72d30e3ce129c5d785695)
- [Mongoose 9 middleware migration](https://mongoosejs.com/docs/migrating_to_9.html#pre-middleware-no-longer-supports-next)
