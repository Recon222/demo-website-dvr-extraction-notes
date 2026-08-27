import { describe, it, expect } from 'vitest'
import { checkParity, norm, rnAvailable, RN_ROOT } from '../../../../../.design-sync/check-rn-parity.mjs'

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
// U0.1: `T`'s colour keys became ALIASES of `tokens/palette.ts`, and `readField` matches
// LITERALS, not identifier references (check-rn-parity.mjs:54-56) — so six web-side reads now
// report PARSE-FAILED. That is the designed trajectory: U0.4 repoints the readers at the
// palette module and teaches `readField` to follow a one-level re-export, and only then does
// this list collapse to empty. The values themselves are already correct — `background` and
// `border` are no longer DRIFT, they are unreadable, which the guard treats as drift because
// an anchor it cannot read has not been proven equal.
// U0.4 (1)+(2): the two gradient anchors now read `PrimaryButtonGradient` in `Colors.ts:471`
// through a one-level reference resolver (`Colors.dark.primaryDark`), so they are OK and drop
// out of both lists. `Button.tsx` is no longer read at all.
const KNOWN_DRIFT = ['primary', 'background', 'border', 'text', 'textMute', 'error']
const KNOWN_PARSE_FAILED = KNOWN_DRIFT

const labels = (rows: ReadonlyArray<{ label: string }>) => rows.map((r) => r.label)
const report = (rows: ReadonlyArray<{ label: string; rn: string; web: string }>) =>
  rows.map((r) => `${r.label}: RN=${r.rn} web=${r.web}`).join('; ')

// U0.4 defect (5). This runs WITHOUT the sibling repo — it pins the comparison function
// itself, not an anchor, and no anchor in U0.4's set exercises it (every value in reach is
// either a bare hex or is spelled identically on both sides). Its first real consumer is
// U1.1, whose 24 glass-tier keys are all `rgba(...)` strings the phone spells with spaces
// and the demo spells without.
describe('norm — the compare-time normalisation both sides go through', () => {
  it('reconciles the rgba() spelling the two repos each use', () => {
    // phone `Colors.ts` style            vs  demo `glass-tokens.ts` style
    expect(norm('rgba(14, 57, 101, 0.85)')).toBe(norm('rgba(14,57,101,0.85)'))
  })

  it('still trims and lowercases', () => {
    expect(norm('  #1F6B99\n')).toBe('#1f6b99')
  })

  it('does not collapse a real value difference', () => {
    // The guard would be worthless if normalising could equate two different colours.
    expect(norm('rgba(14, 57, 101, 0.85)')).not.toBe(norm('rgba(14,57,101,0.86)'))
    expect(norm('#1f6b99')).not.toBe(norm('#1f6b9a'))
  })
})

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
