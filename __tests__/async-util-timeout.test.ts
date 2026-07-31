import { describe, it, expect } from 'vitest'
import { getConfig } from '@testing-library/dom'

/**
 * Guard for the load-induced flake that turned `feat/parity-p2` red intermittently
 * (P2.4 fix branch — see docs/code-reviews/parity/p2/gate-import-flake.md).
 *
 * React Testing Library's `asyncUtilTimeout` — the budget for EVERY `findBy*` and
 * `waitFor` — defaults to 1000ms. Measured latency for one such wait (the import
 * terminal's dwell CTA after a 2-file batch, driven through the real bridge):
 *
 *     idle                                35ms
 *     under full-suite CPU contention     561ms / 674ms / 1093ms / 1770ms
 *
 * Two of four loaded samples blow the 1000ms default. That is the whole failure: the
 * element does appear, the runner just stops waiting for it, and WHICH test loses the
 * race is whichever one is scheduled during the worst contention window — which is why
 * the failing set shifted every run and crossed test files.
 *
 * The sandbox suite's authors already raised the per-TEST timeout to 20000ms for this
 * exact contention (the R-6 note in DemoExperience.sandbox.test.tsx) — but the test
 * timeout is not what fires here, so the raise never protected the waits it was meant to.
 *
 * Keep this floor well above the measured loaded worst case and well below the 20000ms
 * test timeout, so a genuine hang still fails as a hang instead of eating the budget.
 */
describe('RTL async-utility timeout', () => {
  it('is raised above the 1000ms default so contention cannot fail a passing wait', () => {
    expect(getConfig().asyncUtilTimeout).toBeGreaterThanOrEqual(5000)
    expect(getConfig().asyncUtilTimeout).toBeLessThan(20000)
  })
})
