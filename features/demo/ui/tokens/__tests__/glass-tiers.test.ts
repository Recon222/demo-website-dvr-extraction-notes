import { describe, it, expect } from 'vitest'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'

/**
 * SEAM(U1.1) value contract — the six glass tiers, both scheme halves, 48 values.
 *
 * ## Why this file exists ALONGSIDE the drift guard
 *
 * `.design-sync/check-rn-parity.mjs` anchors 24 of these 48 keys against the phone
 * (`gradient[0]`, `gradient[1]`, `border`, `highlightTop` × 6 tiers × both halves = 48 rows).
 * It is the stronger check where it reaches, because it reads the phone's CURRENT value
 * instead of a number typed in here. Three things it does not cover, and this file does:
 *
 *  1. **`innerShadow` is deliberately unanchored** (plan §5, U1.1 row) — it is an inset shadow
 *     the guard reads off neither side as a flat CSS value. Its twelve values are pinned ONLY
 *     here. A silent `innerShadow` edit is invisible to every other gate in the repo.
 *  2. **The guard skips without the sibling phone repo.** Every case in
 *     `ui/inputs/__tests__/rn-token-parity.test.ts` is `it.skipIf(!rnAvailable())`, and vitest
 *     reports a skip inside a GREEN run — so on a checkout without the phone beside it, this
 *     file is the only thing holding all 48 values.
 *  3. **The tier SHAPE.** The guard reads named fields; it cannot see a tier that grew a key,
 *     lost one, or appeared in one half only. `toEqual` is exact in both directions, so the
 *     48-value pin below carries this — measured, probe P2b: deleting a tier part kills it.
 *     A separate runtime shape case was written and then DELETED for exactly that reason; the
 *     extra-key direction is a compile error anyway, from the module's
 *     `satisfies Record<ColorScheme, Record<GlassVariant, GlassTier>>`.
 *
 * ## Why the values are UNSPACED here and spaced on the phone
 *
 * The phone writes `rgba(14, 57, 101, 0.85)`; the demo writes `rgba(14,57,101,0.85)`. Both are
 * correct CSS and the drift guard's `norm()` reconciles them (`check-rn-parity.mjs:63`). The
 * demo's spelling is load-bearing in the other direction: `ui/__tests__/glass-tokens.test.ts`
 * pins the composed gradients BYTE-EXACTLY, so re-spacing these to match the phone would redden
 * shape pins for a formatting change. Do not "fix" the spacing either way.
 */
describe('GLASS_TIER (SEAM(U1.1)) — the six glass tiers, both halves', () => {
  it('pins all 48 tier values byte-exactly (phone Colors.ts:273-440)', () => {
    expect(GLASS_TIER).toEqual({
      light: {
        card: {
          gradient: ['rgba(248,250,252,1)', 'rgba(241,245,249,1)'],
          border: 'rgba(148,163,184,0.45)',
          highlightTop: 'rgba(148,163,184,0.45)',
          innerShadow: 'rgba(30,58,138,0.04)',
        },
        nestedCard: {
          gradient: ['rgba(233,238,245,1)', 'rgba(223,231,239,1)'],
          border: 'rgba(100,116,139,0.45)',
          highlightTop: 'rgba(148,163,184,0.35)',
          innerShadow: 'rgba(30,58,138,0.03)',
        },
        elevated: {
          gradient: ['rgba(255,255,255,1)', 'rgba(248,250,252,1)'],
          border: 'rgba(100,116,139,0.35)',
          highlightTop: 'rgba(100,116,139,0.35)',
          innerShadow: 'rgba(30,58,138,0.05)',
        },
        header: {
          gradient: ['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.95)'],
          border: 'rgba(148,163,184,0.4)',
          highlightTop: 'rgba(148,163,184,0.4)',
          innerShadow: 'rgba(30,58,138,0.03)',
        },
        sheet: {
          gradient: ['rgba(255,255,255,1)', 'rgba(241,245,249,1)'],
          border: 'rgba(100,116,139,0.4)',
          highlightTop: 'rgba(100,116,139,0.4)',
          innerShadow: 'rgba(30,58,138,0.06)',
        },
        recessed: {
          gradient: ['rgba(203,213,225,0.45)', 'rgba(226,232,240,0.35)'],
          border: 'rgba(100,116,139,0.25)',
          highlightTop: 'rgba(100,116,139,0.3)',
          innerShadow: 'rgba(30,58,138,0.08)',
        },
      },
      dark: {
        card: {
          gradient: ['rgba(14,57,101,0.85)', 'rgba(23,65,110,0.92)'],
          border: 'rgba(28,78,132,0.5)',
          highlightTop: 'rgba(184,212,240,0.08)',
          innerShadow: 'rgba(0,0,0,0.2)',
        },
        nestedCard: {
          gradient: ['rgba(23,65,110,0.7)', 'rgba(14,57,101,0.6)'],
          border: 'rgba(43,140,193,0.45)',
          highlightTop: 'rgba(184,212,240,0.2)',
          innerShadow: 'rgba(0,0,0,0.15)',
        },
        elevated: {
          gradient: ['rgba(23,65,110,0.88)', 'rgba(14,57,101,0.95)'],
          border: 'rgba(43,140,193,0.25)',
          highlightTop: 'rgba(184,212,240,0.12)',
          innerShadow: 'rgba(0,0,0,0.25)',
        },
        header: {
          gradient: ['rgba(0,38,80,0.95)', 'rgba(2,46,89,0.98)'],
          border: 'rgba(28,78,132,0.6)',
          highlightTop: 'rgba(153,186,221,0.1)',
          innerShadow: 'rgba(0,0,0,0.15)',
        },
        sheet: {
          gradient: ['rgba(0,40,83,0.98)', 'rgba(14,57,101,1)'],
          border: 'rgba(28,78,132,0.6)',
          highlightTop: 'rgba(184,212,240,0.14)',
          innerShadow: 'rgba(0,0,0,0.3)',
        },
        recessed: {
          gradient: ['rgba(0,24,50,0.6)', 'rgba(0,32,64,0.5)'],
          border: 'rgba(0,14,30,0.75)',
          highlightTop: 'rgba(0,12,26,0.55)',
          innerShadow: 'rgba(0,0,0,0.45)',
        },
      },
    })
  })

  it("makes dark `nestedCard` the SWAP of `card`'s stops, not a new pair (A33)", () => {
    // Phone `Colors.ts:366-374`, verbatim on the reason: the dark fill CANNOT lift —
    // `textTertiary` measures exactly 3.79 on the lighter stop, the floor
    // `palette-contrast.test.ts` pins under ruling M2(b) — so the tier buys its dimension by
    // reversing the light direction instead. *"the stops are SWAPPED, so the surface is lit
    // from above instead of from below. Same two values, so every contrast number in the
    // palette contract is byte-identical - this is free."*
    //
    // The pin is on the RGB TRIPLES, not the whole `rgba()` strings, because the alphas moved
    // too (card 0.85/0.92, nested 0.7/0.6). Asserting the strings would pin nothing about the
    // relationship; asserting the triples fails the moment someone "re-bases" this tier onto a
    // fresh pair of blues, which is exactly the edit that shipped a flat tier on the phone.
    const rgb = (c: string) => c.replace(/^rgba\(([^)]*),[^,)]*\)$/, '$1')
    const card = GLASS_TIER.dark.card.gradient
    const nested = GLASS_TIER.dark.nestedCard.gradient
    expect([rgb(nested[0]), rgb(nested[1])]).toEqual([rgb(card[1]), rgb(card[0])])
    // …and it is a swap only in DARK. Light nests DOWNWARD onto its own new pair (phone
    // `:285-300`): `card` is already #f8fafc, so there is no headroom to lift toward white.
    // If this ever reddens, someone has "symmetrised" the two halves and undone that ruling.
    const lightCard = GLASS_TIER.light.card.gradient
    const lightNested = GLASS_TIER.light.nestedCard.gradient
    expect([rgb(lightNested[0]), rgb(lightNested[1])]).not.toEqual([rgb(lightCard[1]), rgb(lightCard[0])])
  })
})
