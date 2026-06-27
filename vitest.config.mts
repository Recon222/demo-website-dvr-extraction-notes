import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Vitest is the unit/component test runner for this Next.js (App Router) site.
// - `tsconfigPaths()` resolves the `@/*` alias from tsconfig.json so tests import
//   the same way app code does.
// - `react()` enables JSX + Fast Refresh-compatible transform for component tests.
// - jsdom provides the DOM for React Testing Library.
//
// Coverage is intentionally scoped to the logic layer (`lib/**`) for now and is
// expanded as testable areas are added. Presentational pages/layouts (React Server
// Components) are validated by Playwright E2E later, not unit coverage — unit
// tests cover pure logic, helpers, and client components.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Tailwind/global CSS is irrelevant to behavior tests; skip CSS processing.
    css: false,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,tsx}'],
      exclude: ['**/*.{test,spec}.*', '**/__tests__/**', '**/*.d.ts'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
})
