import { describe, it, expect } from 'vitest'
import { checkParity, rnAvailable, RN_ROOT } from '../../../../../.design-sync/check-rn-parity.mjs'

// Drift guard: the web demo's dark palette (`T` in input-theme.ts + the hexes hardcoded
// across the wizard screens) mirrors the RN app's Colors.dark BY HAND. This test pins the
// shared anchors so a hex change on either side that isn't mirrored fails CI. Values are
// parsed live from both repos — the test never goes stale on a synchronized change, only
// on drift. Skips cleanly when the sibling RN repo isn't checked out (e.g. isolated CI).
//
// U0.0: the guard used to THROW when one anchor's constant moved on the phone side, which
// disabled the other eight and hid four real drifts. It now degrades per anchor to a
// PARSE-FAILED row. Until the U0 token port lands, the drift set is NON-EMPTY BY DESIGN, so
// this test pins the KNOWN set rather than asserting empty — an unexpected label appearing
// or disappearing is the signal. U0.4 tightens both lists to empty.
const KNOWN_DRIFT = ['background', 'border', 'gradientTop', 'gradientBot']
const KNOWN_PARSE_FAILED = ['gradientTop', 'gradientBot']

const labels = (rows: ReadonlyArray<{ label: string }>) => rows.map((r) => r.label)
const report = (rows: ReadonlyArray<{ label: string; rn: string; web: string }>) =>
  rows.map((r) => `${r.label}: RN=${r.rn} web=${r.web}`).join('; ')

describe('RN <-> Web token parity (design-system drift guard)', () => {
  it.skipIf(!rnAvailable())(`shared dark-palette anchors match the RN app (${RN_ROOT})`, () => {
    const { anchors, drift } = checkParity()
    expect(anchors.length).toBeGreaterThanOrEqual(9)
    // Readable failure: names exactly which anchor drifted and both sides' values.
    expect(labels(drift), report(drift)).toEqual(KNOWN_DRIFT)
  })

  it.skipIf(!rnAvailable())('reports an unresolvable anchor as PARSE-FAILED instead of throwing', () => {
    const { anchors, parseFailed } = checkParity()
    // The whole point of the degrade: a constant the phone renamed takes out ITS anchor and
    // no other. Every anchor outside the known-broken set still resolves to a real value.
    expect(labels(parseFailed), report(parseFailed)).toEqual(KNOWN_PARSE_FAILED)
    const resolved = anchors.filter((a) => !KNOWN_PARSE_FAILED.includes(a.label))
    expect(resolved.length).toBe(anchors.length - KNOWN_PARSE_FAILED.length)
    for (const a of resolved) {
      expect(a.rn, `${a.label} RN side`).not.toContain('PARSE-FAILED')
      expect(a.web, `${a.label} web side`).not.toContain('PARSE-FAILED')
    }
  })
})
