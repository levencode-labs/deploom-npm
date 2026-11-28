# Migration behavior across npm, Yarn PnP and pnpm

Two exact migrations run independently through three package managers:

| Case | Baseline | Target | Required repair |
| --- | --- | --- | --- |
| Prettier formatting consumer | 2.8.8 | 3.0.0 | Await `format()` before consuming its string result. |
| Zod request validation | 3.25.76 | 4.6.7 | Read validation errors through `error.issues`. |

Node **24.18.0**, npm **11.16.0**, Yarn Berry **4.12.0**, and pnpm **10.29.3**
are fixed in `spec.json` and the tools lock. The two package dependencies have no
transitive runtime dependencies. Every manager has its own baseline and target
project, manifest and checked-in lock. Existing migration fixtures and their
receipts are unchanged.

## Reproduce

Run these commands from the repository root with Node 24.18.0 and its npm 11.16.0
on PATH. Tool packages install locally; no global Corepack activation, package
manager install, credentials or user configuration changes are required.

```sh
npm ci --prefix fixtures/stageb-package-managers/tools --ignore-scripts --no-audit --no-fund --cache fixtures/stageb-package-managers/.cache/npm-tools
node fixtures/stageb-package-managers/install.cjs --manager npm
node fixtures/stageb-package-managers/check.cjs --manager npm --output reports/stageb-npm.json
node fixtures/stageb-package-managers/install.cjs --manager yarn
node fixtures/stageb-package-managers/check.cjs --manager yarn --output reports/stageb-yarn.json
node fixtures/stageb-package-managers/install.cjs --manager pnpm
node fixtures/stageb-package-managers/check.cjs --manager pnpm --output reports/stageb-pnpm.json
```

Omitting `--manager` executes all three managers sequentially. CI runs each
manager separately on Windows and Linux so one failure cannot hide another
matrix leg. `install.cjs` uses npm `ci`, Yarn `--immutable`, and pnpm
`--frozen-lockfile`, disables lifecycle scripts, and checks that installation
does not change any lock bytes. Caches and generated installations remain within
this fixture directory. `check.cjs` records hashes and lengths for all runtime
inputs, the tool lock and the six arm locks, and rechecks them after execution.

## Behavioral and negative controls

Each manager proves all of the following with the actual installed packages:

1. The original consumer works on the baseline version.
2. Upgrading dependencies while retaining the original API use fails with the
   expected `TypeError`. The Prettier consumer attempts a string operation on a
   Promise; the Zod endpoint attempts to read the removed `errors` alias.
3. The minimal repair preserves the exact formatted JavaScript or endpoint
   status/body observed on the baseline. The endpoint also strips an unrelated
   request field and reports the `email` issue path.
4. Reverting each API repair reproduces the failure. A valid Zod request alone
   still succeeds with the old code, so acceptance always tests an invalid one.
5. Invalid JavaScript still rejects after awaiting formatting; invalid email
   still produces HTTP-style 400 output after switching to `issues`.
6. Installed package versions and resolution paths match the selected arm.
   Matching-version fake packages are placed in a parent `node_modules`. The
   checker proves ordinary Node can resolve this poison when the arm's own
   installation is held aside (or the PnP loader is omitted), then requires the
   fixture to reject that situation before a fake package can execute. The
   original installation is restored in `finally` and the poison is removed.

Yarn uses **real PnP**, a generated `.pnp.cjs` loader, project-local zip caches and
no arm `node_modules`. npm uses its normal directory tree. pnpm uses its isolated
virtual store and verifies resolved real paths remain inside the selected arm.
There is no cross-manager reuse of `node_modules` and no `NODE_PATH` fallback.

## Evidence and limits

`evidence.json` has the standard closed `fixtureSha256`/`claims` shape and is
created only after all local legs pass. Retained `reports/*.json` contain the
actual observed runtime, manager identities, arm resolutions, outcomes and input
hashes. CI's separately retained report proves the exact OS/toolchain leg that
ran; a local Linux result does not establish Windows acceptance.

These are direct API behavior fixtures for the two exact version transitions.
They do not establish a project's plugin compatibility, transitive dependency
behavior, install scripts, workspace layout or application acceptance. They do
not claim that changing package managers itself repairs either API break.

Sources: the existing `prettier3-await-format` and `zod4-error-issues` fixtures,
[Prettier 3.0 release notes](https://prettier.io/blog/2023/07/05/3.0.0/), and
[Zod 4 migration guide](https://zod.dev/v4/changelog).
