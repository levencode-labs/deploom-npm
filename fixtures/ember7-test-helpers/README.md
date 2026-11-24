# Ember 7 makes test helpers explicit

Discourse removed the legacy application helper injection and used an explicit `pauseTest` import. The public workspace locks before and after its Ember upgrade resolve `ember-source` to `6.10.1` and `7.2.0`. The fixture checks the exact upstream npm archives against SHA-512 values in those locks. The Discourse-specific Ember patches modify other files.

- [Discourse test setup change](https://github.com/discourse/discourse/commit/746d9e266dd746aec9d4c25debe56289c051d926)
- [Before lock and upstream integrity](https://github.com/discourse/discourse/blob/721b600ce13b3ebb9ee64a2ad748617f9868b743/pnpm-lock.yaml#L4484-L4488)
- [After lock and upstream integrity](https://github.com/discourse/discourse/blob/aa77d3cc3593981850f2cd111733af67e2b44cce/pnpm-lock.yaml#L4440-L4444)
- [Ember 7 release notes](https://blog.emberjs.com/ember-released-7-0/)

## Reproduce

Run in this directory with Node.js 22 or newer, npm, and tar.

```sh
npm pack ember-source@6.10.1 ember-source@7.2.0 typescript@6.0.3 @ember/test-helpers@5.4.3 --ignore-scripts
node check.cjs
```

Use `npm pack --offline` when the exact archives and metadata are cached. The checker runs offline. It checks the removed extension in Ember's emitted dev and prod packages and uses TypeScript 6.0.3 to compile the same legacy test setup on both versions. The legacy setup is rejected on 7.2.0. An explicit import of the test helper with regular application setup compiles on both releases.

This fixture covers the published extension and consumer typechecking. Run the project's browser tests and check for remaining global test helpers before accepting the upgrade.
