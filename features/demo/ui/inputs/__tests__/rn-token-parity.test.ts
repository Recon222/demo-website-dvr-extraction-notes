import { describe, it, expect } from 'vitest'
import { checkParity, rnAvailable, RN_ROOT } from '../../../../../.design-sync/check-rn-parity.mjs'

// Drift guard: the web demo's dark palette (`T` in input-theme.ts + the hexes hardcoded
// across the wizard screens) mirrors the RN app's Colors.dark BY HAND. This test pins the
// shared anchors so a hex change on either side that isn't mirrored fails CI. Values are
// parsed live from both repos — the test never goes stale on a synchronized change, only
// on drift. Skips cleanly when the sibling RN repo isn't checked out (e.g. isolated CI).
describe('RN <-> Web token parity (design-system drift guard)', () => {
  it.skipIf(!rnAvailable())(`shared dark-palette anchors match the RN app (${RN_ROOT})`, () => {
    const { anchors, drift } = checkParity()
    expect(anchors.length).toBeGreaterThanOrEqual(9)
    // Readable failure: names exactly which anchor drifted and both sides' values.
    expect(drift, drift.map((d) => `${d.label}: RN=${d.rn} web=${d.web}`).join('; ')).toEqual([])
  })
})
