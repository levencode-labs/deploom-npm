# Preserve Grid widths across the Material UI 7 entry point change

The pinned makerspace upgrade changes Material UI from 6.5.0 to 7.3.11 in its Yarn lock. Its follow-up uses @mui/material/Grid in place of @mui/material/Grid2.

The fixture renders a 12-column Grid and a child that spans 12 columns at xs and six at sm. The v6 Grid2 with the size prop produces the expected responsive CSS. The held Grid2 import fails on v7. The v7 Grid using size restores the same width rules. Supplying legacy item, xs, and sm props to the new Grid leaves those width rules absent.

Use @mui/material/Grid for the v7 Grid2 successor. Preserve a responsive size object if it already exists. If the source uses legacy breakpoint props, convert them to size and check the resulting breakpoints and spacing.

The reproduction uses Node 24.18.0 and npm 11.16.0, with React 18.3.1 and the same Emotion versions in both arms. It checks server-emitted styles under the default theme. Browser layout and custom theme breakpoints have separate verification needs.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned makerspace version transition](https://github.com/ManchesterMakerspace/makerspace-react-2026/commit/d090015f93cc70f2850c30ab21fd26e4d8e4d40f)
- [Pinned makerspace Grid import follow-up](https://github.com/ManchesterMakerspace/makerspace-react-2026/commit/4a8b5b17858807f76f3d893c4f4eef37b4189d1c)
- [Material UI 7 migration guide](https://mui.com/material-ui/migration/upgrade-to-v7/)
- [Material UI Grid migration](https://mui.com/material-ui/migration/upgrade-to-grid-v2/)
