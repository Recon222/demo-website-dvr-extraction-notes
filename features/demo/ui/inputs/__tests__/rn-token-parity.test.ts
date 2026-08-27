import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { palette } from '@/features/demo/ui/tokens/palette'
import {
  checkParity,
  norm,
  PALETTE_KEYS,
  readField,
  readStop,
  rnAvailable,
  rnTierScope,
  RN_ROOT,
  TIER_KEYS,
  TIER_PARTS,
  webTierScope,
} from '../../../../../.design-sync/check-rn-parity.mjs'

/** The 24 tier anchor keys, spelled the way the guard spells them: `<tier>.<part>`. */
const TIER_ANCHOR_KEYS: string[] = TIER_KEYS.flatMap((t: string) =>
  TIER_PARTS.map((p: string) => `${t}.${p}`),
)

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
//   U1.1  +48 rows: the six glass tiers x four readable parts x both halves. Before them the
//         guard read no tier at all, and `ui/__tests__/glass-tokens.test.ts` pins the demo's
//         glass values TO THEMSELVES — so a phone-side re-tint of any tier was invisible to
//         every gate in this repo. That is the hole these rows close.
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

// Review W0/F4. Both cases are pure string work — no sibling repo, so they run everywhere,
// which matters for a guard whose every other case is `skipIf`.
describe('region() — what the slice actually contains', () => {
  const DARK = { after: 'const dark = {', before: '} as const' }

  it('does not read a value out of a // comment', () => {
    // The shape that survived at review time: a refactor leaves the OLD value commented above
    // the new one, `readField` takes the first match in the slice, and the guard reports the
    // retired colour as current. Zero drift, fully green, completely wrong.
    const src = ["const dark = {", "  // was text: '#f0f4f8',", "  text: '#e7eef6',", "} as const"].join('\n')
    expect(readField(src, 'text', DARK)).toBe('#e7eef6')
  })

  it('throws when the `before` marker is missing instead of widening to EOF', () => {
    // `after` always threw (-> PARSE-FAILED). `before` silently fell through, so a key absent
    // from its intended block and present in a later one was read from the wrong literal.
    // Reachable at U1.1, where `rnTierScope`'s `before: '}'` is what separates six tiers that
    // all declare the same four part names.
    const src = ["const dark = {", "  text: '#f0f4f8',"].join('\n')
    expect(() => readField(src, 'text', DARK)).toThrow(/region end marker not found: \} as const/)
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
    // MEMBERSHIP, not cardinality. Review W0/F2: the guard's key list is hand-maintained (it is
    // .mjs and cannot import this TS module), and the old `PALETTE_KEYS.length === 15` pin
    // SURVIVED swapping `'link'` for `'card'` — every count and every loop above stayed green
    // because they all iterate the list itself. This is the only assertion in the file that
    // compares the list to something outside it, so it is the one that makes the other three
    // non-tautological. A palette token added without an anchor reds HERE.
    expect([...PALETTE_KEYS].sort(), 'the guard must anchor exactly the palette tokens').toEqual(
      Object.keys(palette.dark).sort(),
    )
    // Cardinality is DERIVED from the two key lists, never typed. W0/F2 removed the hand-typed
    // `.toBe(15)`; the same reasoning removes U1.1's hand-typed `.toBe(81)` — a literal total is
    // exactly what lets someone shrink the table to reach green by editing one number here.
    // What this still covers is what membership cannot: deletion of the three anchors that are
    // NOT keys of either list (both CTA gradient stops + the touch floor).
    expect(
      anchors.length,
      'every palette key AND every tier key in both halves, + 2 gradient stops + touchFloor',
    ).toBe(PALETTE_KEYS.length * 2 + TIER_ANCHOR_KEYS.length * 2 + 3)
  })

  it.skipIf(!rnAvailable())('pins all 24 glass-tier keys in BOTH halves (U1.1 closing act)', () => {
    const { anchors } = checkParity()
    expect(TIER_KEYS.length, 'six tiers').toBe(6)
    // FOUR parts, not five. `innerShadow` is deliberately unanchored — it is not a CSS value on
    // either side, so an anchor on it would compare two transcriptions rather than a contract.
    // Its twelve values are pinned by `ui/tokens/__tests__/glass-tiers.test.ts` and NOWHERE
    // else; thinning that file silently removes their last guard.
    expect(TIER_PARTS.length, 'gradient[0], gradient[1], border, highlightTop').toBe(4)
    expect(TIER_ANCHOR_KEYS.length, '6 tiers x 4 readable parts').toBe(24)

    for (const key of TIER_ANCHOR_KEYS) {
      const schemes = anchors
        .filter((a: Anchor) => a.key === key)
        .map((a: Anchor) => a.scheme)
        .sort()
      expect(schemes, `${key} must be pinned in both halves`).toEqual(['dark', 'light'])
    }

    // Every tier row must have READ something on both sides. Stated separately from the
    // file-wide PARSE-FAILED case above because these 48 are the rows most likely to go blind:
    // they depend on three-level scoping AND on `readStop`, and a phone-side reformat of
    // `GlassColors` breaks them without touching a single colour.
    for (const a of anchors.filter((x: Anchor) => TIER_ANCHOR_KEYS.includes(x.key))) {
      expect(a.rn, `${a.label} RN side`).toMatch(/^rgba\(/)
      expect(a.web, `${a.label} web side`).toMatch(/^rgba\(/)
    }
  })

  it.skipIf(!rnAvailable())('addresses the web tiers with the same three-level scope as the phone', () => {
    // The web twin of the capability case at the bottom of this file. `tokens/glass-tiers.ts`
    // mirrors `GlassColors`' nesting on purpose, so the SAME scope shape works on both sides —
    // and the same two-level trap exists on both sides. If this reddens, someone flattened the
    // demo's tier module (or reordered its halves) and `webTierScope` needs re-reading.
    const tiers = readFileSync(
      join(process.cwd(), 'features', 'demo', 'ui', 'tokens', 'glass-tiers.ts'),
      'utf8',
    )
    const light = readField(tiers, 'border', webTierScope('light', 'card'))
    const dark = readField(tiers, 'border', webTierScope('dark', 'card'))
    expect(light, 'the two halves of GLASS_TIER.card.border must not read as one').not.toBe(dark)
    const twoLevel = readField(tiers, 'border', { after: 'card: {', before: '}' })
    expect(twoLevel, 'a tier-only scope lands on the LIGHT tier').toBe(light)
    expect(twoLevel).not.toBe(dark)
  })

  it.skipIf(!rnAvailable())('reads the light half from the LIGHT region on both sides', () => {
    const { anchors } = checkParity()
    const at = (key: string, scheme: string): Anchor => {
      const row = anchors.find((a: Anchor) => a.key === key && a.scheme === scheme)
      // Say what is missing. Without this, dropping a scheme fails here as
      // `TypeError: Cannot read properties of undefined (reading 'rn')` — measured.
      if (!row) throw new Error(`no anchor row for ${key}.${scheme}: the ${scheme} half is missing`)
      return row
    }
    // The failure this exists for: a "light" reader whose region markers actually slice the
    // DARK block still reports zero drift, because both sides then compare the same block to
    // itself. Every assertion above stays green through it.
    //
    // Almost every key here genuinely differs between the phone's two halves, so a stuck reader
    // collapses one of those pairs. The exceptions are excluded BY NAME rather than by deleting
    // the check: these two are `#ffffff` in both halves by design (`Colors.ts:95-96`, `:201-202`)
    // — a foreground for filled surfaces does not change with the scheme. Any key added here
    // needs the same justification, in one line, or it is hiding a stuck reader.
    //
    // The 24 tier keys are in scope for a reason: their scopes are THREE levels deep and the
    // two-level form lands on the light tier for BOTH schemes (measured at `dd5551ec`), which
    // is precisely the reader that reports zero drift while proving nothing. The capability
    // case at the bottom of this file pins that for one key; this pins it for all 24, on both
    // sides, against the live anchor table rather than against a hand-built scope. None of the
    // 24 is scheme-invariant, so none is excluded.
    const SCHEME_INVARIANT = new Set(['onPrimary', 'onError'])
    for (const key of [...PALETTE_KEYS, ...TIER_ANCHOR_KEYS].filter((k: string) => !SCHEME_INVARIANT.has(k))) {
      expect(at(key, 'light').rn, `RN ${key}: the light and dark reads returned the same value`).not.toBe(
        at(key, 'dark').rn,
      )
      expect(at(key, 'light').web, `web ${key}: the light and dark reads returned the same value`).not.toBe(
        at(key, 'dark').web,
      )
    }
  })
})

// U1.1 adds 24 glass-tier keys to this guard. Two reader capabilities it needs did not exist,
// and both are cheaper to land (and to pin) here than inside a package whose job is meant to
// be "add anchors, nothing more". These two cases pin the CAPABILITIES; U1.1 adds the rows.
//
// No anchors are added here: an anchor whose web-side token does not exist yet is the one
// thing plan §6.6 gate 1 forbids, and `ui/tokens/glass-tiers.ts` is U1.1's to create.
describe('glass-tier reader capabilities U1.1 depends on', () => {
  const phoneColors = () => readFileSync(join(RN_ROOT, 'src', 'constants', 'Colors.ts'), 'utf8')

  it.skipIf(!rnAvailable())('reads a TUPLE field — the gradient stops readField is blind to', () => {
    const t = phoneColors()
    const scope = rnTierScope('dark', 'card')
    const top = readStop(t, 'gradient', 1, scope)
    const bottom = readStop(t, 'gradient', 2, scope)
    expect(top).toMatch(/^rgba\(/)
    expect(bottom).toMatch(/^rgba\(/)
    expect(top, 'a gradient whose two stops are equal is not a gradient').not.toBe(bottom)
    // The reason `readStop` exists at all: after `gradient:` comes `[`, which matches none of
    // readField's value alternatives. Without this, all 12 stops become permanent
    // PARSE-FAILED rows — a red gate that no token change can clear.
    expect(() => readField(t, 'gradient', scope)).toThrow(/field not found: gradient/)
  })

  it.skipIf(!rnAvailable())('addresses the light and dark tiers separately (three-level scope)', () => {
    const t = phoneColors()
    const light = readField(t, 'border', rnTierScope('light', 'card'))
    const dark = readField(t, 'border', rnTierScope('dark', 'card'))
    expect(light, 'the two halves of GlassColors.card.border must not read as one').not.toBe(dark)

    // Why THREE levels and not two. `GlassColors.light` is declared before `GlassColors.dark`,
    // so a scope that only names the tier lands on the light one for both schemes — which
    // reads as zero drift while proving nothing (the same trap as the palette light half
    // above). If this ever reddens, the phone reordered `Colors.ts` and the markers in
    // `rnTierScope` need re-reading, not deleting.
    const twoLevel = readField(t, 'border', { after: 'card: {', before: '}' })
    expect(twoLevel, 'a tier-only scope lands on the LIGHT tier').toBe(light)
    expect(twoLevel).not.toBe(dark)
  })
})
