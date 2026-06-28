/** @type {import('next').NextConfig} */
const nextConfig = {
  // `next lint` only lints a fixed default directory set (app, components, lib, pages, src).
  // Declare `features` so the colocated demo (features/demo/**) is actually linted instead
  // of being silently skipped.
  eslint: {
    dirs: ['app', 'components', 'lib', 'features'],
  },
};

module.exports = nextConfig;
