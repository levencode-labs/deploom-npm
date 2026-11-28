# Coupled React, React DOM and Router migration in Chromium

This fixture moves one small report application from React/React DOM `18.3.1`
and `react-router-dom` `6.30.3` to React/React DOM `19.3.0` and Router `7.18.4`.
`react-transition-group` stays at `4.4.5`. The two package graphs and the browser
tooling each have an exact manifest and a retained npm lockfile.

The application uses one shared source file. Two independent switches apply
the minimal repairs: pass a stable DOM ref to `CSSTransition` and its child;
split `/dashboard/*` into a `/dashboard` parent and `*` child, changing the
sibling link to `../reports`. The other application code stays identical.

## Observable behavior and negative controls

Every row runs at `1280×800` and at an emulated mobile `390×844` viewport:

| Arm | Enter/exit behavior | Relative navigation |
| --- | --- | --- |
| Old package graph, old code | Completes both cycles | Opens `/dashboard/reports` |
| New graph, old code | Fails on removed `findDOMNode` | Opens the wrong `/dashboard/team/reports` path |
| New graph, only `nodeRef` fixed | Completes both cycles | Still opens the wrong path |
| New graph, only route fixed | Still fails on `findDOMNode` | Opens the intended sibling route |
| New graph, both fixes | Completes both cycles | Opens the intended sibling route |

The assertions exercise actual bundled JavaScript in Chromium Headless Shell.
They check the report page after clicking the relative link and returning with
browser history. An absolute link is a separate working control in every arm.
The test waits for both the address bar and the rendered route: Router 7 can
update history before its React transition commits.

Keyboard flows type a draft title, use Tab to reach the open button, open with
Space, and close with Enter. Successful transitions must transfer focus to the
close button, return focus to the opener after exit, retain the draft through
navigation, and pass a second enter/exit cycle. The callback argument change
with `nodeRef` is asserted. Final panel opacity, visible DOM, removal after
exit and absence of horizontal overflow are checked. Screenshots retain the
open panel and entered draft for each successful arm and viewport.

`PASS` for an intentionally broken arm means its specified failure was
observed. It does not mean that application arm is usable. Either repair alone
leaves the other failure visible; neither an import check nor a successful
install is used as a substitute for these browser assertions.

## Reproduction

Use Node `24.18.0` and npm `11.16.0` on Linux or Windows. Tooling is pinned to
Playwright `1.56.1`, its Chromium Headless Shell build `1194`
(`141.0.7390.37`), and esbuild `0.25.10`. The same automatic JSX transform is
used in both package arms. From this directory:

```sh
npm ci --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node node_modules/playwright/cli.js install chromium
node check.cjs --output build/execution.json
```

Set `PLAYWRIGHT_BROWSERS_PATH` to the same project-local `.browser-cache`
directory during installation and replay when isolating the browser download.
Linux CI images without the browser's OS libraries can use Playwright's
`install --with-deps chromium` command. The browser replay itself only permits
the fixture's loopback origin; external page requests fail the check.

The JSON result is written only after all ten matrix cases pass. It records
actual Node/platform/architecture, installed package versions, browser version
and executable SHA-256, executable source and lockfile digests, emitted bundle
digests, each arm's observations, and screenshot digests. The source inputs
listed in that report exclude documentation, the receipt and generated output;
the publisher's separate Git manifest retains the entire fixture directory.
Outputs belong under `build/` or the CI artifact directory and never update
the committed `evidence.json` during replay.

## Scope

Both migration claims have `fixture-behavior` evidence. This is a synthetic
application with npm, a declarative router, no data loaders, no hydration and
no keyed transition list. It is not acceptance of a recipient project. Mobile
means Chromium viewport/touch emulation, not a physical device. Firefox,
WebKit, reduced-motion policy and other package-manager layouts need their own
evidence. Archive and recipient-project statuses remain `UNKNOWN`.

The earlier isolated cases are `fixtures/react-dom19-transition-ref` and
`fixtures/react-router7-relative-splat`. This fixture adds coupled package
changes, interacting application state, browser history, keyboard behavior,
real browser execution and partial-repair controls.

Primary references:

- [React 19 upgrade guide: removed ReactDOM.findDOMNode](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#removed-reactdomfinddomnode)
- [React Transition Group: nodeRef and callback behavior](https://reactcommunity.org/react-transition-group/transition/#Transition-prop-nodeRef)
- [React Router changelog: adopted v7 future flags](https://reactrouter.com/changelog)
- [React Router: relative routing semantics](https://api.reactrouter.com/v7/types/react-router.RelativeRoutingType.html)
