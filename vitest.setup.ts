// Global test setup, applied before every test file (see vitest.config.mts).
// - Registers jest-dom matchers (toBeInTheDocument, toHaveAttribute, etc.).
// - Unmounts React trees and clears the jsdom document between tests so cases
//   stay isolated.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach } from 'vitest'

/**
 * Budget for every `findBy*` / `waitFor`. RTL defaults it to 1000ms, which is NOT enough
 * for the full-experience bridge suites when the runner saturates the box: the same wait
 * (the import terminal's dwell CTA after a 2-file batch) measured 35ms idle and
 * 561/674/1093/1770ms under full-suite contention — two of four loaded samples over the
 * default. The element always appeared; the runner just stopped waiting, so whichever test
 * happened to be scheduled in the worst window failed, and the failing set moved every run.
 *
 * This is the missing half of the R-6 fix: `DemoExperience.sandbox.test.tsx` raised its
 * per-TEST timeout to 20000ms for this exact contention, but the per-test timeout is not
 * what fires on a `findBy` — this is. Pinned by __tests__/async-util-timeout.test.ts.
 *
 * Deliberately well under that 20000ms test timeout: a genuine hang must still fail as a
 * hang, with budget left for the failure to be reported.
 */
configure({ asyncUtilTimeout: 5000 })

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
