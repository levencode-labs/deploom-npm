# eslint-plugin-unicorn migration notes

Check the selected plugin version against the Node.js and ESLint versions used by local lint and CI.

- [57.0.0](https://github.com/sindresorhus/eslint-plugin-unicorn/releases/tag/v57.0.0) switched to ESM and requires ESLint flat config. Move legacy configurations to `eslint.config.mjs`, import the plugin, and adapt the selected preset and any rule overrides.
- [60.0.0](https://github.com/sindresorhus/eslint-plugin-unicorn/releases/tag/v60.0.0) requires Node.js 20.10 or newer.
- [80.0.0](https://github.com/sindresorhus/eslint-plugin-unicorn/blob/v80.0.0/package.json) declares Node.js 22.13 or newer and ESLint 10.4 or newer. For a pinned ESLint 9 project, find a plugin release whose own peer dependency accepts that ESLint version.

Compare `eslint --print-config` for a representative JavaScript or TypeScript file before and after the upgrade, then run the project's lint command. Review newly enabled rules and fixes separately before applying them across the repository. These notes are based on published release notes and manifests.
