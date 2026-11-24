# Select the bundler for a Webpack-only Next.js configuration

The assistant-ui docs migrated from Next 15.5.6 to 16.0.0. A later pinned checkout uses 16.4.5 and composes a configuration with Turbopack settings. The fixture isolates how the default build treats a Webpack-only configuration. It checks a local module alias, which makes the selected bundler observable.

Next 15.5.6 builds the route with its default Webpack configuration. Next 16.4.5 stops on the same configuration when the build command selects default Turbopack. Selecting --webpack renders the same route and alias. Supplying the equivalent Turbopack alias also lets the default Next 16 build render the route.

Inspect the configuration returned by wrappers as well as the owning scripts. If only Webpack implements a required hook, retain --webpack until the Turbopack equivalent is verified. With both configurations in place, run the default build and verify the specific transformed feature or alias. Recheck the Node.js engine floor and the owning development and CI commands.

The fixture uses Node 24.18.0, npm 11.16.0 and React 19.2.0 on both sides. The full assistant-ui site and wrapper behavior need their own checks.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned assistant-ui Next 16 upgrade](https://github.com/assistant-ui/assistant-ui/commit/953db24dbc927585a628e5f7eb8631c3a78eff9c)
- [Pinned assistant-ui docs configuration at dc9cad2b](https://github.com/assistant-ui/assistant-ui/blob/dc9cad2b4b10c80478a2c28b9ee3e3484d158ec1/apps/docs/next.config.mts)
- [Next.js 16 bundler migration guide](https://nextjs.org/docs/app/guides/upgrading/version-16#turbopack-by-default)
