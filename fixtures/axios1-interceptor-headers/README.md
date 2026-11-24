# Update request headers through AxiosHeaders on Axios 1

The pinned Movie Mates migration replaces assignment to interceptor headers with AxiosHeaders.set. With TypeScript 5.9.2 held, the old assignment typechecks on Axios 0.23.0 and reports TS2322 on Axios 1.21.0. Updating the existing AxiosHeaders object typechecks and preserves both an interceptor header and an unrelated caller header at the adapter boundary. The original whole-object assignment discards the caller header.

Locate interceptors that replace the headers object. Set the specific keys on config.headers and keep their previous conditions. Run the owning typecheck and verify the final headers in a custom or mocked adapter, including an unrelated caller-provided header.

The fixture uses Node 24.18.0 and npm 11.16.0. The adapter returns a local response. The complete Electron application and real HTTP transport need separate checks.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Movie Mates migration](https://github.com/orlandovallejos/movie-mates/commit/677eadc753bbfe2cd3000837e07c6624176cf247)
- [AxiosHeaders documentation](https://github.com/axios/axios#axiosheaders)
