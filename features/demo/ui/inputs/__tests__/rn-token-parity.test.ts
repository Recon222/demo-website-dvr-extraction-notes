import { describe, it, expect } from 'vitest'
import { checkParity, norm, PALETTE_KEYS, rnAvailable, RN_ROOT } from '../../../../../.design-sync/check-rn-parity.mjs'

/** One row of the guard's table. `scheme` is `'any'` for scheme-invariant anchors. */
type Anchor = { key: string; scheme: string; label: string; rn: string; web: string }

// Drift guard: the demo's palette (`tokens/palette.ts`) mirrors the phone app's `Colors` BY
// HAND, and nothing but this enforces it. The guard parses the CURRENT value from each side
// and asserts they are equal, so it never goes stale on a legitimately synchronized change —
// only on drift.
//
// THE ONE THING TO KNOW BEFORE QUOTING THIS FILE: every case below is
// `it.skipIf(!rnAvailable())`, and `rnAvailable()` is false whenever the sibling phone repo
// is not checked out beside this one. Vitest reports a skipped case inside a GREEN run with
// exit code 0, so **a CI without the phone repo reports green regardless of drift.** Confirm
// the case actually RAN before treating a green here as a parity verdict — the test title
// prints the resolved RN root for exactly that reason. (The `norm` block below has no such
// guard; it pins a pure function and always runs.)
//
// History, because the failure modes repeat:
//   U0.0  the guard used to THROW when one constant moved on the phone side, which disabled
//         all nine anchors and hid four real drifts. A parse failure is now a per-anchor
//         PARSE-FAILED row: a broken anchor takes out itself and nothing else.
//   U0.1  `T`'s colour keys became aliases of `tokens/palette.ts`, so six web-side reads went
//         PARSE-FAILED — the values were already correct, they had become unreadable.
//   U0.4  the readers are repointed at the definitions (`tokens/palette.ts`,
//         `tokens/scale.ts`, `Colors.ts`'s `PrimaryButtonGradient`), and BOTH lists tighten
//         to empty. They stay empty: from here on, a non-empty list is a finding.
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
  it.skipIf(!rnAvailable())(`no anchor has drifted from the RN app (${RN_ROOT})`, () => {
    const { drift } = checkParity()
    // Readable failure: names exactly which anchor drifted and both sides' values.
    expect(labels(drift), report(drift)).toEqual([])
  })

  it.skipIf(!rnAvailable())('reads every anchor on both sides — no PARSE-FAILED rows', () => {
    const { anchors, parseFailed } = checkParity()
    // An anchor the guard cannot READ has not been proven equal, so it is drift too. Keeping
    // this assertion separate from the one above is what makes the two failure modes tell
    // themselves apart in a red run: a value moved, or a reader went blind.
    expect(labels(parseFailed), report(parseFailed)).toEqual([])
    for (const a of anchors) {
      expect(a.rn, `${a.label} RN side`).not.toContain('PARSE-FAILED')
      expect(a.web, `${a.label} web side`).not.toContain('PARSE-FAILED')
    }
  })

  it.skipIf(!rnAvailable())('pins every palette key in BOTH scheme halves (D2, amended)', () => {
    const { anchors } = checkParity()
    for (const key of PALETTE_KEYS) {
      const schemes = anchors
        .filter((a: Anchor) => a.key === key)
        .map((a: Anchor) => a.scheme)
        .sort()
      expect(schemes, `${key} must be pinned in both halves`).toEqual(['dark', 'light'])
    }
    // The stage's SIZE, stated so that shrinking the table to reach green is a red instead.
    // Gate 1 in the plan is a claim about a set, not about an exit code. Growing these two
    // numbers is the closing act of U1.1 (+24 keys), U3.1 (+4) and U8.2 (+1) — see
    // PALETTE_KEYS in the guard for the rule and the schedule.
    expect(PALETTE_KEYS.length, 'U0.4 anchors 15 palette keys').toBe(15)
    expect(anchors.length, '15 keys x 2 halves + 2 dark gradient stops + the touch floor').toBe(33)
  })

  it.skipIf(!rnAvailable())('reads the light half from the LIGHT region on both sides', () => {
    const { anchors } = checkParity()
    const at = (key: string, scheme: string) =>
      anchors.find((a: Anchor) => a.key === key && a.scheme === scheme) as Anchor
    // The failure this exists for: a "light" reader whose region markers actually slice the
    // DARK block still reports zero drift, because both sides then compare the same block to
    // itself. Every assertion above stays green through it.
    //
    // Every one of these 15 keys genuinely differs between the phone's two halves, so a stuck
    // reader collapses one of these pairs. If a future token is deliberately scheme-invariant
    // (`onPrimary` is `#ffffff` in both, which is why it is not anchored here), EXCLUDE IT BY
    // NAME rather than deleting the check.
    for (const key of PALETTE_KEYS) {
      expect(at(key, 'light').rn, `RN ${key}: the light and dark reads returned the same value`).not.toBe(
        at(key, 'dark').rn,
      )
      expect(at(key, 'light').web, `web ${key}: the light and dark reads returned the same value`).not.toBe(
        at(key, 'dark').web,
      )
    }
  })
})
