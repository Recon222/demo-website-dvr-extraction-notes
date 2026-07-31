import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

// Vitest is the unit/component test runner for this Next.js (App Router) site.
// - `tsconfigPaths()` resolves the `@/*` alias from tsconfig.json so tests import
//   the same way app code does.
// - `react()` enables JSX + Fast Refresh-compatible transform for component tests.
// - jsdom provides the DOM for React Testing Library.
//
// Coverage is intentionally scoped to the logic layer — the non-demo helpers in
// `lib/**` plus the demo engine at `features/demo/engine/**` — and is expanded as
// testable areas are added. Presentational pages/layouts and the demo UI
// (`features/demo/ui/**`) are validated behaviorally / by Playwright E2E later, not
// unit coverage — unit tests cover pure logic, helpers, and client components.
export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  test: {
    environment: 'jsdom',
    globals: true,
    // Per-test budget. MUST stay above `asyncUtilTimeout` (5000, vitest.setup.ts) or the raise
    // that fixed the measured load flake is inert: with both at 5000 a slow wait dies as a bare
    // "Test timed out in 5000ms" instead of RTL's element-name + DOM dump, and the suite is
    // fully exposed to contention (the P2 review's five concurrent lane runs produced 29-40
    // spurious timeouts each, including on synchronous tests). See
    // docs/code-reviews/parity/p2/gate-import-flake.md and `__tests__/async-util-timeout.test.ts`,
    // which pins the relationship. The 10 files carrying `{ timeout: 20000 }` are now redundant.
    testTimeout: 20000,
    setupFiles: ['./vitest.setup.ts'],
    // Tailwind/global CSS is irrelevant to behavior tests; skip CSS processing.
    css: false,
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: ['node_modules/**', '.next/**', 'dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['lib/**/*.{ts,tsx}', 'features/demo/engine/**/*.{ts,tsx}'],
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
