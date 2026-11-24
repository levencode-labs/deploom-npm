# Align react-is with the React runtime in snapshot tooling

The pinned Jest pretty-format ReactElement plugin checks element values with React 18 and React 19 classifiers. In the isolated fixture, React 18.3.1 element values are accepted by react-is 18.3.1. Holding that classifier after moving to React 19.3.0 silently rejects the new element values. The matching react-is 19.3.0 recognizes them, and a two-major classifier recognizes both versions. The two-major control still rejects null and a plain element-shaped object.

For a single-major workspace, align the classifier used by custom serializers or helpers with the runtime that creates the elements. When the same tool supports both supported React majors, verify both explicitly and update the owning test dependency where possible. Run targeted serializer and snapshot tests before accepting snapshot changes.

The fixture checks the public isElement behavior on Node 24.18.0 and npm 11.16.0. It does not exercise the entire Jest renderer or snapshot output.

```sh
npm ci --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Jest ReactElement classifier at aa88f7cf](https://github.com/jestjs/jest/blob/aa88f7cf0bfc7a3a2efbfcab97914886b22d4454/packages/pretty-format/src/plugins/ReactElement.ts)
- [React 19 upgrade guide](https://react.dev/blog/2024/04/25/react-19-upgrade-guide)
