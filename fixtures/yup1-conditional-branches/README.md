# Keep conditional validation rules when moving to Yup 1

The pinned st-dev migration changes `when()` branch declarations and updates Yup from 0.29.3 to 1.7.1 in the lockfile.

The fixture makes a field required when enabled and restricts present values in either branch. Passing schema objects directly to `then` and `otherwise` works on 0.29.3. Keeping those objects on 1.7.1 fails with `branch is not a function`. Branch callbacks applied to the incoming schema preserve the required-field error and the allowed-value restriction.

Use callbacks for `when()` branches. Extend the incoming schema when it already carries common validators. Verify an enabled case, a disabled case, and an invalid value in each branch.

The reproduction uses Node 24.18.0 and npm 11.16.0. It exercises schema validation of an isolated object. Form integration and other Yup 1 changes have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned st-dev Yup migration](https://github.com/chadananda/st-dev/commit/221a1f34425ffe97087321401a8f7767678dd072)
- [Yup 1 release](https://github.com/jquense/yup/releases/tag/v1.0.0)
- [Yup 1.7.1 schema.when documentation](https://github.com/jquense/yup/tree/v1.7.1#schemawhenkeys-string--string-builder-object--values-any-schema--schema-schema)
