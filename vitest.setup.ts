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

// ---- jsdom shims for components/demo UI tests (test-spec § Shared Mock Infrastructure) ----

class NoopObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
  takeRecords() {
    return []
  }
}
if (!('ResizeObserver' in globalThis)) {
  ;(globalThis as { ResizeObserver?: unknown }).ResizeObserver = NoopObserver
}
if (!('IntersectionObserver' in globalThis)) {
  ;(globalThis as { IntersectionObserver?: unknown }).IntersectionObserver = NoopObserver
}

if (!window.matchMedia) {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent() {
      return false
    },
  })) as unknown as typeof window.matchMedia
}

// Canvas 2d context stub (OCR frame grab) — returns null so screens take the sample path.
if (!HTMLCanvasElement.prototype.getContext) {
  HTMLCanvasElement.prototype.getContext = (() =>
    null) as unknown as typeof HTMLCanvasElement.prototype.getContext
}

// scrollIntoView (the manifest keeps the active step in view) is unimplemented in jsdom —
// no-op it so components that call it don't throw. Tests that assert on it override this.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = function scrollIntoView() {}
}

// navigator.mediaDevices is intentionally left undefined so camera/mic screens take the
// sample-fallback path; individual tests opt into a getUserMedia mock for the live path.
