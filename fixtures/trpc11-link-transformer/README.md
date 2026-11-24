# Configure SuperJSON on the HTTP batch link in tRPC 11

The pinned Radiofy upgrade moves SuperJSON from the client configuration to its transport links. The pnpm lock pairs both tRPC client and server at 10.45.4 with SuperJSON 1.13.3 before the change, and at 11.19.0 with SuperJSON 2.2.6 after it. The isolated npm fixture reproduces those versions.

The baseline server returns an appointment time and the v10 client decodes it as a JavaScript Date. With the old client-level configuration on v11, the client receives the serialized string and metadata envelope. Putting the transformer on httpBatchLink restores the Date and its original UTC timestamp. The server transformer remains configured on initTRPC.

Apply when migrating a tRPC client that configures a transformer at the root and uses an HTTP batch link. Put the same transformer on the new link and coordinate the client and server package versions. Exercise each affected link with a representative value such as a Date and verify the runtime type as well as the value.

The fixture pins Node 24.18.0 and npm 11.16.0 and uses one loopback HTTP batch query. It covers response decoding. Mutation input encoding, split links, WebSockets, React Query and the entire application require separate verification.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Radiofy tRPC migration](https://github.com/jdlennoxs/radiofy/commit/f7beca66e445113edb61adcc9feed7a5212d4f04)
- [tRPC 11 transformer migration guide](https://trpc.io/docs/migrate-from-v10-to-v11)
