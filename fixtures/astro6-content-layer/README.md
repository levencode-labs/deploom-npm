# Move a legacy content collection to Astro 6 Content Layer

The pinned site migration moves legacy content config to `src/content.config.ts`, adds explicit loaders and replaces legacy entry rendering calls. Its pnpm locks identify Astro 5.18.2 and 6.4.8.

The fixture builds the same Markdown collection on both releases with npm-pinned inputs. Astro 5 builds the old config and emits the title and Markdown body at the generated `/posts/release-note/` route. Astro 6 rejects the held `src/content/config.ts` with `LegacyContentConfigError`. Defining an explicit glob loader, using the loader entry ID for the route and rendering with `render(entry)` restores the same route and page content. The home page remains present on both passing builds.

Migrate legacy collection config to `src/content.config.ts` with the loader that matches the data. Update consumers of the old slug and rendering API where needed. Compare generated URLs before and after, especially for custom slugs and nested identifiers, and inspect an actual rendered entry.

The reproduction uses Node 24.18.0 and npm 11.16.0. It tests static output from the default build with one Markdown file and one ordinary page. The upstream site, SSR adapters and the temporary compatibility flag have separate verification needs.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned site Content Layer migration](https://github.com/paulneo/MaqP--tVVYYmvG-33gQbqZdkGF/commit/ec2831252e329bbccbbabe82ccb32f219e474bf7)
- [Astro 6 legacy collection removal](https://docs.astro.build/en/guides/upgrade-to/v6/#removed-legacy-content-collections)
- [Astro Content Layer rendering](https://docs.astro.build/en/guides/content-collections/)
