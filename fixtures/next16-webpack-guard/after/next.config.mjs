import { join } from 'node:path';

const mode = process.env.FIXTURE_BUNDLER_MODE;
const config = {
  distDir: '.next-' + mode,
  experimental: { cpus: 1 },
  webpack(current) {
    current.resolve.alias['guard-proof'] = join(import.meta.dirname, 'label.js');
    return current;
  },
};
if (mode === 'dual') config.turbopack = { resolveAlias: { 'guard-proof': './label.js' } };
export default config;
