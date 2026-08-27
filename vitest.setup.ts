// Global test setup, applied before every test file (see vitest.config.mts).
// - Registers jest-dom matchers (toBeInTheDocument, toHaveAttribute, etc.).
// - Unmounts React trees and clears the jsdom document between tests so cases
//   stay isolated.
import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, beforeEach } from 'vitest'

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

/**
 * REPO-WIDE TRIPWIRE: React's own conflicting-shorthand detector, promoted to a test failure.
 *
 * When an inline style object writes a shorthand (`border`, `borderColor`, `borderTop`) on an
 * update while a conflicting longhand (`borderTopColor`) is set, React logs
 * "Updating a style property during rerender (border) when a conflicting property is set
 * (borderTopColor)" and then silently paints the wrong thing. That is the lit-edge defect
 * class (`docs/planning/demo-phone-ui-parity/reports/partner-lit-edge-ruling.md` §4.3): the
 * warning fired in 100% of the measured update-clobber cells and in no cell that stayed
 * correct under the ruled rule. A console warning nobody reads is not a gate; this is.
 *
 * Deliberately narrow — this single regex, not "fail on any console.error". The suite logs
 * expected React errors on purpose (error boundaries, act warnings), and a blanket ban would
 * be a permanent source of unrelated red.
 *
 * IT IS THE SOLE GUARD FOR FOUR PRODUCTION FIXES. The root-cause repairs in `7fc126b` —
 * `screens/_shared.tsx`'s `Field` error border, its two hand-rolled copies in
 * `inputs/IncidentLocationFields.tsx` and `screens/NewCaseModal.tsx`, and
 * `screens/CompletionScreen.tsx`'s `padding`/`paddingTop` collision — got NO dedicated
 * regression pins. Their coverage is transitive: the existing consumer suites already drive
 * those transitions, and this hook is what turns the resulting React warning into a failure.
 * A deliberate trade, stated here rather than left to be discovered — weaken or narrow this
 * hook and all four regress silently, in exactly the way they shipped in the first place.
 *
 * COMPLEMENT, not a replacement, for the value pins in
 * `features/demo/ui/__tests__/glass-card-recipe.test.tsx`: React is silent on the two cells
 * that are wrong on FIRST paint, and those pins are silent on nothing. Each covers what the
 * other cannot. A test that means to exercise a clobber asserts on `conflictingStyleWarnings`
 * and clears it.
 *
 * Collected and thrown in `afterEach` rather than thrown from the console call itself: a throw
 * inside React's commit phase unwinds through React internals and reports as an unrelated
 * failure in a different place.
 */
export const conflictingStyleWarnings: string[] = []
const realConsoleError = console.error
console.error = (...args: Parameters<typeof console.error>) => {
  if (/conflicting property/.test(String(args[0] ?? ''))) {
    // React passes a `%s` format string plus its substitutions, so a plain join reads
    // "%s a style property during rerender (%s) … Removing paddingTop padding" — the two
    // property names land at the tail, detached from the sentence that needs them. Splice
    // them back in, which is the whole reason the raw text is carried through.
    const rest = args.slice(1).map(String)
    conflictingStyleWarnings.push(String(args[0]).replace(/%s/g, () => rest.shift() ?? '%s'))
  }
  realConsoleError(...args)
}

beforeEach(() => {
  conflictingStyleWarnings.length = 0
})

afterEach(() => {
  cleanup()
  if (conflictingStyleWarnings.length > 0) {
    const seen = conflictingStyleWarnings.join('\n')
    conflictingStyleWarnings.length = 0
    throw new Error(
      'A style object wrote a SHORTHAND over a conflicting longhand on an update, so the ' +
        'painted result is wrong from this render on. Re-declare the whole shorthand in BOTH ' +
        'branches, or use longhands only — see docs/planning/demo-phone-ui-parity/reports/' +
        'partner-lit-edge-ruling.md §4.3. The property is named in React\'s own message below ' +
        '(it is not always a border — the padding/paddingTop pair trips this too); for the ' +
        `border family the fragment docblocks in features/demo/ui/glass-tokens.ts carry the rule.\n${seen}`,
    )
  }
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
