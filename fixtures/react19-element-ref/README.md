# Read element refs across React 18 and 19

Material UI reads refs through a helper that branches on the React major version. This fixture checks the same boundary with React 18.3.1 and 19.3.1, with React 17.0.2 as an extra compatibility control. It verifies callback ref identity and the missing-ref case. The legacy accessor warns on React 19 in development. Reading `props.ref` unconditionally warns and returns `undefined` on React 17 and 18.

For React-19-only code, update reads of a React element's `.ref` to `.props.ref`. Libraries that still declare React 18 support need a compatibility path. Test callback and missing refs under each supported major. The fixture covers development-mode element reads. The receiving library's type declarations and component integration need their own checks.

The local proof used Node 24.18.0 and npm 11.16.0.

```sh
npm ci --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Material UI helper at bae15c10](https://github.com/mui/material-ui/blob/bae15c1074845419c623c0923449fb4831a26d76/packages/mui-utils/src/getReactElementRef/getReactElementRef.ts)
- [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide#deprecated-elementref)
