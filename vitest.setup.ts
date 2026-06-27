// Global test setup, applied before every test file (see vitest.config.mts).
// - Registers jest-dom matchers (toBeInTheDocument, toHaveAttribute, etc.).
// - Unmounts React trees and clears the jsdom document between tests so cases
//   stay isolated.
import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

afterEach(() => {
  cleanup()
})
