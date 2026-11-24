# React UI migration coverage

The public [Kontur UI repository](https://github.com/skbkontur/retail-ui) publishes `@skbkontur/react-ui` from `packages/react-ui`. The pinned [package manifest](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui/package.json) declares version 6.5.7.

## Release evidence

The pinned [public changelog](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui/CHANGELOG.md) contains 321 distinct stable version headings from 0.18.12 through 6.5.7. The counts describe that file at the pinned commit. Build the release inventory from version tags and the associated package manifests as well as the changelog. Earlier releases require their own source evidence. The [public release index](REACT_UI_PUBLIC_RELEASE_INDEX.md) links every changelog entry and preserves its listed comparison base.

| Major line | Stable headings | Explicit BREAKING CHANGES sections |
| --- | ---: | ---: |
| 0.x | 60 | 2 |
| 1.x | 26 | 1 |
| 2.x | 28 | 1 |
| 3.x | 26 | 1 |
| 4.x | 79 | 1 |
| 5.x | 62 | 1 |
| 6.x | 40 | 0 |

The [migration guide](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui/MIGRATION.md) covers all six major boundaries through 6.0. Review removals and behavioral changes alongside the explicitly labelled sections. The 6.0 entry describes React 19 support, a move to ESM, theme removals and a different mobile media query under other headings.

## Official transforms

The [codemod package manifest](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui-codemod/package.json) declares `react-ui-codemod` 2.2.4, and its [README](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui-codemod/README.md#список-кодмодов) documents eight React UI transforms for these boundaries:

- 2.0 import and export paths, `onChange` signatures, components moved to addons, and the `cloud` prop.
- 4.0 `label` to `caption` and theme variable renames.
- 5.0 and 6.0 theme variable renames.

Pin the transform version and test it against a matching code sample and an unchanged control before recommending it. The [6.0 theme transform source](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui-codemod/react-ui-6.0/renameThemeVars.ts) matches identifier names inside object expressions. An unrelated object with a matching name can also change. Scope the transform to confirmed theme files and review its diff, including keys, shorthand properties and variable references.
A local TSX transform check with [`react-ui-codemod@2.2.0`](https://www.npmjs.com/package/react-ui-codemod/v/2.2.0) and `jscodeshift@0.15.2` covered five synthetic inputs. It renamed the unquoted key `tooltipPaddingY` in theme and unrelated objects. It also renamed an unrelated shorthand reference, left a quoted key and a nonmatching name intact, and made no further changes on three reruns. Review quoted theme keys separately and inspect matching identifiers in the patch. This check ran the pinned transform in isolation. The React UI package transition still needs its own fixture.

## Calendar month numbering in 4.x → 5.x

The public migration guide changes `Calendar.scrollToMonth` and the related DatePicker API from JavaScript month indices `0..11` to calendar month numbers `1..12`. Check direct and ref-based callers that pass `Date#getMonth()` or subtract one from a calendar month. Preserve the meaning of callers that already supply a calendar month, and check the January and December boundaries in the recipient. [Release migration guide](https://github.com/skbkontur/retail-ui/blob/d8b87adc82a1fcb7f717c55f05d911815ae70ee5/packages/react-ui/MIGRATION.md#react-ui-4x--50) · [Upstream change](https://github.com/skbkontur/retail-ui/pull/3470)

Compare the argument handling in the pinned [4.27.1 Calendar](https://github.com/skbkontur/retail-ui/blob/c0d64c5025ac2379068671f01641d07e2c59dba1/packages/react-ui/components/Calendar/Calendar.tsx) and [5.6.12 Calendar](https://github.com/skbkontur/retail-ui/blob/65a57b83be31bf80415202feb5926cae92574644/packages/react-ui/components/Calendar/Calendar.tsx). The argument type stays `number`, so call sites need a behavior check.

## First version-specific checks

The source manifests for [5.6.12](https://github.com/skbkontur/retail-ui/blob/65a57b83be31bf80415202feb5926cae92574644/packages/react-ui/package.json) and [6.0.0](https://github.com/skbkontur/retail-ui/blob/9989ac10342ad483e5eb5c1f3e973d67775893ed/packages/react-ui/package.json) establish the first transition to reproduce. The 5.6.12 React and React DOM peer range is `>=16.9 <19` and its entry points include CommonJS and ESM. Version 6.0.0 widens both peer ranges to `>=16.9 <=19` and declares an ESM package.

Check the published entry points and keep React runtime and TypeScript type declarations separate in the fixture. Add the theme-variable codemod as a separate recipe with a rendered or compiled result only after the transform passes. Track evidenced transitions and uncovered ranges in the [Knowledge Cache review](KNOWLEDGE_CACHE_REVIEW_2026-11-24.md).
