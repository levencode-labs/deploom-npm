# Preserve Headless UI state variants on Tailwind 4

The pinned @headlessui/tailwindcss 0.2.2 workspace implements state variants and accepts Tailwind 3 and 4. The isolated npm fixture pairs the published plugin with Tailwind 3.4.0 and 4.3.3. Holding the former PostCSS adapter on Tailwind 4.3.3 raises an error. Moving to @tailwindcss/postcss restores the build. Omitting plugin registration still generates ordinary utilities and drops the Headless UI state rules. Adding the CSS @plugin directive restores the same open-state selectors. A custom prefix must be carried over to preserve classes such as hui-open:underline.

Update the owning PostCSS configuration and stylesheet together. Check the generated selectors for the variant names and prefixes used by the project. Exercise an affected interactive component in a supported browser. The fixture verifies generated CSS for default and custom open-state variants. The project-wide build and browser behavior need separate checks.

The local proof uses Node 24.18.0, npm 11.16.0 and PostCSS 8.4.38 as the fixture entry point.

```sh
npm ci --prefix before --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
npm ci --prefix after --ignore-scripts --no-audit --no-fund --engine-strict --strict-peer-deps
node check.cjs
```

- [Pinned Headless UI variant definitions at eea57cf4](https://github.com/tailwindlabs/headlessui/blob/eea57cf46fd6767ed1059012f7073b88eb159fba/packages/@headlessui-tailwindcss/src/index.ts)
- [Tailwind upgrade guide for PostCSS](https://tailwindcss.com/docs/upgrade-guide#using-postcss)
- [Tailwind CSS plugin directive](https://tailwindcss.com/docs/functions-and-directives#plugin)
