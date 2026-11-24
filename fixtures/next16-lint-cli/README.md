# Replace the removed Next.js lint command

Neobrutalism Components uses `next lint` on Next.js 15.2.8 and ESLint 8.45.0. This fixture holds the command on Next.js 16.4.5, where it exits with an invalid project directory error. Running ESLint 9.0.0 directly against the intended directory succeeds on clean code and rejects a deliberate `no-debugger` violation.

For projects with this script, migrate the ESLint config to a supported format, replace `next lint` with the ESLint CLI, and preserve the intended file scope and Next-specific rules. Verify the new script both on clean code and with a known lint failure. The fixture exercises command behavior with a minimal rule. The full application build, the original shareable configs, and the Next plugin rules require separate project checks.

The local proof used Node 24.18.0 and npm 11.16.0. The upstream checkout declares pnpm 9.6.0. These two npm locks reproduce the CLI behavior with exact versions. The lint-only fixture omits the optional native build packages.

```sh
npm ci --prefix before --omit=optional --ignore-scripts --no-audit --no-fund
npm ci --prefix after --omit=optional --ignore-scripts --no-audit --no-fund
node check.cjs
```

- [Neobrutalism Components at f3c4d429](https://github.com/ekmas/neobrutalism-components/blob/f3c4d42973819ab5cf18697d08d6bd46f384d335/package.json)
- [Next.js 16 migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16)
