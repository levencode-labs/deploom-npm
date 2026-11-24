# Register ajv-formats before compiling date schemas in Ajv 8

The pinned JNode Abstracts migration initializes Ajv with ajv-formats before compiling the schedule schema, which declares format: date on its event date field. The old npm lock pins Ajv 6.15.0. The target lock pins Ajv 8.20.0 and ajv-formats 3.0.1.

The old validator accepts a real leap day and rejects a malformed string. The unmodified Ajv 8 compilation rejects the unknown date format. Registering ajv-formats restores both decisions under strict settings. The target full date validator also rejects 2023-02-29, which the old default accepted. Disabling strict mode lets the schema compile but leaves the malformed value unvalidated in this control.

Register the compatible format plugin on the same Ajv instance before compiling schemas that rely on its standard formats. Verify good and malformed inputs as well as impossible calendar dates. Schemas that only declare a string type do not need the plugin for this case.

The fixture pins Node 24.18.0 and npm 11.16.0 and covers one draft-07 date property. Other formats, alternate drafts and custom validators require their own checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned JNode Abstracts Ajv upgrade](https://github.com/neuroinformatics/jnode-abstracts/commit/0269210cd1af86033e14f3de0e1940f24e6c6090)
- [Ajv format validation guide](https://ajv.js.org/guide/formats.html)
