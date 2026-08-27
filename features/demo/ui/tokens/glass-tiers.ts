/**
 * SEAM(U1.1): the six glass tiers. U1.2/U1.3/U1.4/U2.4/U4.1/U5.1 index into this.
 *
 * Source of truth: the phone repo's `src/constants/Colors.ts` `GlassColors` at `main`
 * (`dd5551ec`) — light `:274-344`, dark `:345-439`. Every one of the 48 values below is lifted
 * verbatim with its `file:line`; nothing here is invented, approximated or "tidied".
 *
 * ## The four-part composition (matrix A40, phone §1.8 `conventions.md`)
 *
 * A tier is not a colour, it is a recipe with four parts. The canonical web form the phone
 * itself publishes, and the one every consumer of this module writes:
 *
 *     background:        linear-gradient(180deg, <gradient[0]>, <gradient[1]>)
 *     border:            1px solid <border>
 *     border-top-color:  <highlightTop>
 *     box-shadow:        inset 0 1px 0 <innerShadow>
 *
 * **Never `backdrop-filter: blur()`.** The glass is a gradient, never a blur — a deliberate
 * low-end-Android decision on the phone that the demo already honours.
 *
 * **`border-top-color` AFTER `border`, never the reverse.** In an inline style object the keys
 * apply in order, so a shorthand written after a longhand erases it (§4.3). A consumer
 * overriding a fragment that carries `borderTopColor` overrides `borderColor`, never `border`.
 *
 * ## Both halves ship (decision D2, as amended by the owner 2026-08-27)
 *
 * The demo renders `dark`. Consumers resolve `GLASS_TIER[scheme]`, where `scheme` is the single
 * consumed-scheme site `tokens/palette.ts` owns — **flipping the demo to light stays a one-line
 * change** (plan §9 clause 12), and that is the only reason the light half is here. It is not
 * decoration: `ui/__tests__/palette-contrast.test.ts`'s `LIGHT_GROUNDS` composites against
 * `light.card` / `nestedCard` / `sheet` / `recessed`, so half the ported contrast contract
 * measures against these values today.
 *
 * ## Spelling: unspaced `rgba()`, deliberately
 *
 * The phone spells `rgba(14, 57, 101, 0.85)`; the demo spells `rgba(14,57,101,0.85)`. Both are
 * valid CSS and the drift guard's `norm()` reconciles them (`check-rn-parity.mjs:49-62`).
 * Re-spacing these to match the phone would redden the byte-exact composed-gradient pins in
 * `ui/__tests__/glass-tokens.test.ts` for a formatting change. Do not "fix" it either way.
 *
 * ## No VALUE imports, on purpose
 *
 * `glass-tokens.ts` imports THIS module to derive `gradientCard` / `gradientCardDiag` /
 * `gradientPanel` / `borderSoft`. The reverse edge would be a module cycle whose template
 * literals evaluate against `undefined` at init and ship
 * `linear-gradient(180deg,undefined,undefined)` past every type check. The only import below is
 * `import type`, which TypeScript erases — so at runtime this module still depends on nothing
 * and that cycle is impossible rather than merely discouraged.
 */

import type { ColorScheme } from '@/features/demo/ui/tokens/palette'

/** The six tier names, phone `Colors.ts:442` (`GlassVariant = keyof typeof GlassColors.light`). */
export type GlassVariant = 'card' | 'nestedCard' | 'elevated' | 'header' | 'sheet' | 'recessed'

/** The four parts every tier carries — matrix A40's composition, as a type. */
export type GlassTier = {
  readonly gradient: readonly [string, string]
  readonly border: string
  readonly highlightTop: string
  readonly innerShadow: string
}

export const GLASS_TIER = {
  /**
   * The light scheme (`Colors.ts:274-344`). No demo surface renders it today; it exists so the
   * scheme flip is one line and the light contrast rows are already green when it happens.
   */
  light: {
    // `Colors.ts:275-284`. A subtle cool-gray gradient for definition against white.
    card: {
      gradient: ['rgba(248,250,252,1)', 'rgba(241,245,249,1)'], // Colors.ts:277
      border: 'rgba(148,163,184,0.45)', // Colors.ts:279
      highlightTop: 'rgba(148,163,184,0.45)', // Colors.ts:281 — matches the border, for visibility
      innerShadow: 'rgba(30,58,138,0.04)', // Colors.ts:283
    },
    // `Colors.ts:301-312`. Light nests DOWNWARD, by owner ruling and by arithmetic (`:292-295`):
    // `card` is already #f8fafc, so there is no headroom to lift toward white. OPAQUE, because a
    // composited value cannot be measured against an unknown parent. Held back from the deeper
    // tone that would separate further (dE 6.46) by `textTertiary`, a documented ceiling that
    // the deeper tone drops to 3.80 against a 3.79 floor (`:296-300`).
    nestedCard: {
      gradient: ['rgba(233,238,245,1)', 'rgba(223,231,239,1)'], // Colors.ts:302
      border: 'rgba(100,116,139,0.45)', // Colors.ts:306 — raised from 0.35 slate (dE 8.9)
      highlightTop: 'rgba(148,163,184,0.35)', // Colors.ts:310 — a SHADOWED lip, not a lit edge
      innerShadow: 'rgba(30,58,138,0.03)', // Colors.ts:311
    },
    // `Colors.ts:313-319`. Modals and popovers — slightly more prominent than `card`.
    elevated: {
      gradient: ['rgba(255,255,255,1)', 'rgba(248,250,252,1)'], // Colors.ts:315
      border: 'rgba(100,116,139,0.35)', // Colors.ts:316
      highlightTop: 'rgba(100,116,139,0.35)', // Colors.ts:317
      innerShadow: 'rgba(30,58,138,0.05)', // Colors.ts:318
    },
    // `Colors.ts:320-325`.
    header: {
      gradient: ['rgba(255,255,255,0.98)', 'rgba(248,250,252,0.95)'], // Colors.ts:321
      border: 'rgba(148,163,184,0.4)', // Colors.ts:322
      highlightTop: 'rgba(148,163,184,0.4)', // Colors.ts:323
      innerShadow: 'rgba(30,58,138,0.03)', // Colors.ts:324
    },
    // `Colors.ts:326-333`. Bottom sheets and pickers: opaque, and a firmer edge than `elevated`
    // — a sheet COVERS content rather than floating over it (`:327-328`).
    sheet: {
      gradient: ['rgba(255,255,255,1)', 'rgba(241,245,249,1)'], // Colors.ts:329
      border: 'rgba(100,116,139,0.4)', // Colors.ts:330
      highlightTop: 'rgba(100,116,139,0.4)', // Colors.ts:331
      innerShadow: 'rgba(30,58,138,0.06)', // Colors.ts:332
    },
    // `Colors.ts:334-343`. The "well" tier: a hole punched into the parent, not a raised
    // surface. Its light model is INVERTED — `highlightTop` carries a DARK value because the
    // top lip casts a shadow instead of catching light (`:335-338`).
    recessed: {
      gradient: ['rgba(203,213,225,0.45)', 'rgba(226,232,240,0.35)'], // Colors.ts:339
      border: 'rgba(100,116,139,0.25)', // Colors.ts:340
      highlightTop: 'rgba(100,116,139,0.3)', // Colors.ts:341
      innerShadow: 'rgba(30,58,138,0.08)', // Colors.ts:342
    },
  },

  /** The dark scheme (`Colors.ts:345-439`) — what the demo renders. */
  dark: {
    // `Colors.ts:346-351`.
    card: {
      gradient: ['rgba(14,57,101,0.85)', 'rgba(23,65,110,0.92)'], // Colors.ts:347
      border: 'rgba(28,78,132,0.5)', // Colors.ts:348 — `GLASS.borderSoft` derives from this (A30)
      highlightTop: 'rgba(184,212,240,0.08)', // Colors.ts:349
      innerShadow: 'rgba(0,0,0,0.2)', // Colors.ts:350
    },
    // `Colors.ts:379-384`. THE STOPS ARE THE SWAP OF `card`'s, not a new pair (`:369-371`) — the
    // surface is lit from above instead of from below, at the same two colours, so every number
    // in the palette contrast contract is byte-identical. That is the whole point: the FILL
    // CANNOT LIFT. `textTertiary` measures exactly 3.79 on the lighter stop, the floor
    // `palette-contrast.test.ts` pins under M2(b), and every lifted candidate the phone measured
    // (dE 4.9-10.2) drops it to 2.72-3.30 (`:358-364`). The dimension comes from the three
    // channels that are free instead: the swap, the border (dE 3.1 -> 14.7) and `highlightTop`
    // (dE 4.0 -> 12.9 — at its old 0.06 it was not rendering at all).
    nestedCard: {
      gradient: ['rgba(23,65,110,0.7)', 'rgba(14,57,101,0.6)'], // Colors.ts:380
      border: 'rgba(43,140,193,0.45)', // Colors.ts:381 — in dark this ALONE carries the tier (A34)
      highlightTop: 'rgba(184,212,240,0.2)', // Colors.ts:382
      innerShadow: 'rgba(0,0,0,0.15)', // Colors.ts:383
    },
    // `Colors.ts:385-390`. `GLASS.gradientPanel` derives from this tier's gradient (A36).
    elevated: {
      gradient: ['rgba(23,65,110,0.88)', 'rgba(14,57,101,0.95)'], // Colors.ts:386
      border: 'rgba(43,140,193,0.25)', // Colors.ts:387 — `GLASS.borderAccent`'s target, U1.3's row
      highlightTop: 'rgba(184,212,240,0.12)', // Colors.ts:388
      innerShadow: 'rgba(0,0,0,0.25)', // Colors.ts:389
    },
    // `Colors.ts:391-396`. Five hand-rolled demo header gradients collapse onto this in U1.4.
    header: {
      gradient: ['rgba(0,38,80,0.95)', 'rgba(2,46,89,0.98)'], // Colors.ts:392
      border: 'rgba(28,78,132,0.6)', // Colors.ts:393
      highlightTop: 'rgba(153,186,221,0.1)', // Colors.ts:394
      innerShadow: 'rgba(0,0,0,0.15)', // Colors.ts:395
    },
    // `Colors.ts:397-405`. Anchored on the badge-blue ramp, replacing the three competing
    // hand-rolled navies the phone deleted (`:398-400`). The demo has exactly three to delete
    // too (A38) — that is U4.1's row, not this module's.
    sheet: {
      gradient: ['rgba(0,40,83,0.98)', 'rgba(14,57,101,1)'], // Colors.ts:401
      border: 'rgba(28,78,132,0.6)', // Colors.ts:402
      highlightTop: 'rgba(184,212,240,0.14)', // Colors.ts:403
      innerShadow: 'rgba(0,0,0,0.3)', // Colors.ts:404
    },
    // `Colors.ts:433-438`. The well, re-anchored onto the badge-blue ramp: this was
    // `rgb(6,12,22)` / `rgb(10,20,34)` — near-black, on no ramp in the app, and the ground under
    // all three bottom-sheet input surfaces, so it shipped a black slab into the three most-used
    // pickers (`:411-418`). Measured against `sheet`'s upper stop over the app background, the
    // old stops resolved CIE76 dE 16.65 / 11.70; these resolve 7.87 / 4.01 — a well rather than
    // a hole, and the bound `palette-contrast.test.ts` row 33 holds two-sided PER STOP.
    // `highlightTop` is DARK by design (inverted light model, `:406-409`); `innerShadow` stays
    // black because a shadow legitimately is (`:431`).
    recessed: {
      gradient: ['rgba(0,24,50,0.6)', 'rgba(0,32,64,0.5)'], // Colors.ts:434
      border: 'rgba(0,14,30,0.75)', // Colors.ts:435
      highlightTop: 'rgba(0,12,26,0.55)', // Colors.ts:436
      innerShadow: 'rgba(0,0,0,0.45)', // Colors.ts:437
    },
  },
  // `satisfies` and not an annotation: `as const` keeps every value's literal type for the
  // consumers, and the constraint still makes a tier missing from ONE half — or a tier missing
  // one of its four parts — a compile error in both directions. Same device, same reason, as
  // `tokens/palette.ts:166`'s `satisfies Record<PaletteToken, string>`.
} as const satisfies Record<ColorScheme, Record<GlassVariant, GlassTier>>
