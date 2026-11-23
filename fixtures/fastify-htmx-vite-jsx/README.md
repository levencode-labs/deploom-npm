# Fastify HTMX JSX across Vite 7 and 8

Run `npm ci --ignore-scripts` and `npm test` in this directory with Node 24 and npm 11.

The fixture reproduces the classic JSX factory and fragment settings from Fastify HTMX 0.4.1. It checks actual Vite 7.3.6 and 8.1.5 bundles using @kitajs/html 4.2.9, and checks the rendered result with Node.

The original options pass on 7.3.6 and select an unresolved React JSX runtime on 8.1.5. Explicitly selecting the classic transform through the compatibility setting renders the same HTML at both pins. The Oxc-only settings pass on 8.1.5 and fail at runtime on 7.3.6. The fixture uses an ES library entry and scopes evidence to these versions and settings.

[Original Fastify plugin](https://github.com/fastify/fastify-vite/blob/2855a59a7dcc8c9670129af82fd0c09b7e4891c4/packages/fastify-htmx/plugin.cjs) · [Vite 8 migration guide](https://vite.dev/guide/migration#javascript-transforms-by-oxc)
