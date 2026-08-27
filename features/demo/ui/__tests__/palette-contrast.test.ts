import { describe, it, expect } from 'vitest'
import {
  DangerFill,
  PrimaryButtonGradient,
  SAMPLE_TINT,
} from '@/features/demo/ui/controls/button-recipe'
import { GLASS_TIER, type GlassTier } from '@/features/demo/ui/tokens/glass-tiers'
import { palette, scheme } from '@/features/demo/ui/tokens/palette'
import { flattenOver } from '@/features/demo/ui/tokens/scale'
import { SEVERITIES, neutralTone, severityTone } from '@/features/demo/ui/tokens/status'
import { MEDIA_CLOSE_CHIP } from '@/features/demo/ui/screens/MediaLibrarySheet'
import { MAP_FILTER_BADGE_FILL } from '@/features/demo/ui/screens/map/MapControls'
import { MAP_FILTER_SECTION_LABEL } from '@/features/demo/ui/screens/map/MapFiltersSheet'
import { MAP_CONTACT_ROW } from '@/features/demo/ui/screens/map/LocationDetailCard'
import { MAP_PICKER_SELECTED_TITLE } from '@/features/demo/ui/screens/map/CaseMapPicker'
import { MAP_GLASS_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { SAMPLE_BADGE } from '@/features/demo/ui/controls/sample-badge'
import { TERMINAL_PALETTE, TERMINAL_SCHEME } from '@/features/demo/ui/screens/import/terminal-palette'
import { UNCHECKED_MARK_EDGE } from '@/features/demo/ui/controls/choice-controls'

/**
 * Palette contrast contract — ported from the phone's
 * `src/constants/__tests__/palette-contrast.test.ts` (464 lines, `main` @ `dd5551ec`).
 * Matrix §C.1 / §C.4, plan U0.5. Package: U0.5.
 *
 * Nothing derives the theme's hand-picked shades, so nothing but this file stops the next
 * retint from walking them back below their floor. The demo's ratios are the phone's ratios
 * because the demo's values are the phone's values — this file is what keeps that true after
 * the drift guard has confirmed the values match. The two catch different failures: the guard
 * catches value drift AGAINST THE PHONE, this catches legibility drift WITHIN THE DEMO.
 *
 * Every pairing here is one the phone's UI-consistency campaign measured failing, and each is
 * recorded in that campaign's ledger with the number it failed at:
 *
 *   muted text ramp     DEF-063 / DEF-UI-009 / 014  floor 3.97 (secondary), 2.08 (tertiary)
 *   accent as text      DEF-UI-018               2.87 dark, across 39 outline/ghost sites
 *   primary CTA fill    plan correction block    2.94 dark with `onPrimary`
 *   status dot quartet  DEF-UI-017               1.26 / 1.84 light, 2.87 dark
 *
 * Thresholds: WCAG 2.1 AA is 4.5:1 for normal-size text and 3:1 for the non-text graphics of
 * 1.4.11. There is no AA-large relief anywhere here: the largest type involved is 16px
 * semibold, which is normal size.
 *
 * BOTH SCHEMES (D2 amended). `palette` carries `{ light, dark }` under one key set; the demo
 * renders `dark`. The light rows are not decoration — they are the reason flipping the
 * consumed scheme is a one-site change instead of a redesign (§9 clause 12).
 *
 * DEEP IMPORTS ARE DELIBERATE, and the phone says why at its `:24-29`: *"the pin has to move
 * WITH the value it guards - a duplicated literal here would stay green through exactly the
 * edit it is supposed to catch (the `DangerFill` lesson)."* So the CTA stops below are read
 * off `GLASS`, never retyped. Any row that would need a constant this port has not created
 * yet is `it.todo` with its owning package named in the title — NOT a literal typed in here,
 * and NOT a weakened ground stack. A row measured against a partial stack is green and lying;
 * a todo is loud.
 */

const AA_TEXT = 4.5 // phone `:33`
const AA_NON_TEXT = 3.0 // phone `:34`

// --- WCAG 2.1 relative luminance, with alpha compositing ------------------

type Rgba = [number, number, number, number]

/**
 * Phone `:40-54`, verbatim in behaviour. Accepts `#rrggbb` and `rgb()`/`rgba()` and THROWS on
 * anything else — no 3-digit hex, no named colours, no gradient strings, and above all no
 * `color-mix()`. That rejection is the demo-side teeth of D3/A53: a `color-mix()` string
 * carries no channels, so a value routed through one is invisible to this gate. Inside
 * `features/demo/**` every alpha is a literal `rgba()` for exactly this reason.
 */
function parse(color: string): Rgba {
  const rgb = color.match(
    /^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)\s*(?:,\s*([\d.]+)\s*)?\)$/i,
  )
  if (rgb) return [+rgb[1], +rgb[2], +rgb[3], rgb[4] === undefined ? 1 : +rgb[4]]

  const hex = color.match(/^#([0-9a-f]{6})$/i)
  if (!hex) throw new Error(`palette-contrast: cannot parse ${color}`)
  return [
    parseInt(hex[1].slice(0, 2), 16),
    parseInt(hex[1].slice(2, 4), 16),
    parseInt(hex[1].slice(4, 6), 16),
    1,
  ]
}

/** Phone `:67-77`, verbatim. */
function luminance([r, g, b]: Rgba): number {
  const linear = [r, g, b]
    .map((c) => c / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)))
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2]
}

/**
 * Flatten a stack of colours (topmost-first, last entry treated as opaque) to one colour.
 *
 * The phone carries its own private `over`/`flatten` here (`:57-65`, `:121-128`). The demo
 * calls the PRODUCTION helper `flattenOver` (SEAM(U0.2)) instead, on the plan's instruction —
 * U0.2's row states its signature is exact *"because U0.5 consumes both from a different
 * package"*, and §C.4 lists `flattenOver` among what ports. That is not a formality: a private
 * copy here would leave the helper every later recipe composites with unexercised by any gate,
 * which is the same tautology the deep-import rule above exists to avoid.
 *
 * Three seams between the two implementations, all deliberate:
 *  - `flattenOver` ROUNDS each channel at every fold step; the phone's `over` keeps floats.
 *    Rounding is what a screen actually does, and the drift is under 1/255 per channel
 *    (< 0.01 on a ratio). The three sanity pairs below composite nothing, so they are exact.
 *  - `flattenOver` returns its input UNCHANGED when a layer is unparseable — a silent
 *    pass-through that would hand this file a plausible ratio for a nonsense colour. So every
 *    layer goes through `parse` FIRST, which throws. Do not remove that line.
 *  - `flattenOver` treats its LAST ground as the painted surface and DISCARDS that ground's
 *    alpha. A translucent bottom therefore composites against nothing and returns a plausible
 *    WRONG answer rather than an error. `parse` cannot see it — the layer is valid — so the
 *    invariant is asserted here instead of left in prose (review r1 F6 clause 2). The comment
 *    on the ground stacks below already forbids bottoming out on a glass stop; this is what
 *    makes that a rule instead of a hope, and U1.1 is the package that will first test it.
 */
function flatten(stack: string[]): Rgba {
  // EVERY layer is parsed, not just the ones composited: a buried unparseable layer would
  // otherwise reach `flattenOver` and come back as `top`, uncomposited (F3-era guard). The
  // parsed alphas are then reused for the bottom check rather than parsed a second time.
  const parsed = stack.map(parse)
  // W0-F6 clause (2): the bottom ground is the painted surface and `flattenOver` discards its
  // alpha, so a translucent bottom composites against nothing and returns a plausible WRONG
  // answer. `parse` cannot see it — the layer is valid — so it is asserted here.
  const bottom = parsed[parsed.length - 1]
  if (bottom[3] !== 1) {
    throw new Error(
      `palette-contrast: the bottom ground must be opaque, got ${stack[stack.length - 1]}`,
    )
  }
  // W0-F6 clause (1) is the other half: `flattenOver` requires a ground BY SIGNATURE now, so
  // `flattenOver(top, ...grounds)` no longer type-checks (TS2556). A one-entry stack is
  // already flat and is returned as parsed — the "nothing to composite" case must not be
  // mistaken for a composite.
  const [top, ground, ...rest] = stack
  return ground === undefined ? parsed[0] : parse(flattenOver(top, ground, ...rest))
}

/**
 * Contrast of `fg` over a stack of grounds. `grounds` runs topmost-first and its last entry
 * must be opaque, so `['rgba(14,57,101,0.6)', 'rgba(14,57,101,0.85)', '#002853']` reads as
 * "nestedCard over card over the app background". Phone `:79-85`.
 */
function contrast(fg: string, grounds: string[]): number {
  const ground = flatten(grounds)
  const front = flatten([fg, ...grounds])
  const [hi, lo] = [luminance(front), luminance(ground)].sort((a, b) => b - a)
  return (hi + 0.05) / (lo + 0.05)
}

/** Phone `:87`. Every assertion compares the ROUNDED value. */
const round = (n: number) => Number(n.toFixed(2))

/**
 * Perceptual distance (CIE76 dE) between two composited surfaces. Phone `:101-119`, verbatim.
 *
 * Contrast ratio answers "can text be read on this"; it does NOT answer "does this surface
 * look like a different surface from its parent", because it is blind to hue and chroma. Both
 * surface defects the phone's file guards were invisible to it: `nestedCard` was `card`'s own
 * colour at lower alpha, and `recessed` was near-black `rgb(6, 12, 22)` off the badge-blue
 * ramp entirely — which measured a perfectly ordinary 1.24 ratio, indistinguishable from the
 * healthy light-mode tier at 1.19. dE separates them 16.65 to 7.87.
 */
function deltaE(a: Rgba, b: Rgba): number {
  const toLab = ([r, g, bl]: Rgba): [number, number, number] => {
    const lin = (v: number) => {
      const c = v / 255
      return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    }
    const [R, G, B] = [lin(r), lin(g), lin(bl)]
    const X = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047
    const Y = R * 0.2126 + G * 0.7152 + B * 0.0722
    const Z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883
    const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116)
    const [fx, fy, fz] = [f(X), f(Y), f(Z)]
    return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
  }
  const [l1, a1, b1] = toLab(a)
  const [l2, a2, b2] = toLab(b)
  return Math.sqrt((l1 - l2) ** 2 + (a1 - a2) ** 2 + (b1 - b2) ** 2)
}

// --- The real grounds a shared component lands on -------------------------

/** Both stops of a glass tier, composited over what that tier sits on. Phone `:130-135`. */
function stops(tier: { gradient: readonly [string, string] }, under: string[] = []): string[][] {
  return [
    [tier.gradient[0], ...under],
    [tier.gradient[1], ...under],
  ]
}

const DARK_BG = [palette.dark.background] // phone `:137`
const LIGHT_BG = [palette.light.background] // phone `:138`

/**
 * `DARK_GROUNDS` (phone `:140-151`, NINE stacks) and `LIGHT_GROUNDS` (`:152-159`), landed
 * verbatim now that U1.1 ships `GLASS_TIER`. Every row that measures against a tier was
 * `it.todo` until this point.
 *
 * THREE ASYMMETRIES THAT ARE NOT TYPOS, copied exactly from the phone:
 *  - `nestedCard` sits on `card`'s LOWER stop (`gradient[1]`);
 *  - `recessed` sits on `sheet`'s UPPER stop (`gradient[0]`);
 *  - the light stacks omit the background, because light's tiers are opaque.
 * And a fourth: `header` and `elevated` are in NEITHER stack. Nothing in the phone's contract
 * measures text on those two tiers. Adding them would be an EXTENSION of the contract, not a
 * port — U1.4 puts wizard titles on `header`, so someone has to decide it; see the U0.5 report.
 *
 * `flattenOver`'s last ground is treated as OPAQUE, so both stacks bottom out at `background`
 * and never at a glass stop.
 */
const DARK_GROUNDS: string[][] = [
  DARK_BG,
  ...stops(GLASS_TIER.dark.card, DARK_BG),
  ...stops(GLASS_TIER.dark.nestedCard, [GLASS_TIER.dark.card.gradient[1], ...DARK_BG]),
  ...stops(GLASS_TIER.dark.sheet, DARK_BG),
  // The `recessed` well, on the sheet that hosts it. Text genuinely lands here — the
  // wheel-picker values, the dropdown's options and the calendar's day numerals all do — and it
  // was absent from the phone's contract, which is how the dark half of the tier shipped at
  // near-black `rgb(6, 12, 22)` unmeasured.
  ...stops(GLASS_TIER.dark.recessed, [GLASS_TIER.dark.sheet.gradient[0], ...DARK_BG]),
]

const LIGHT_GROUNDS: string[][] = [
  LIGHT_BG,
  ...stops(GLASS_TIER.light.card),
  ...stops(GLASS_TIER.light.nestedCard, [GLASS_TIER.light.card.gradient[1]]),
  ...stops(GLASS_TIER.light.sheet),
  ...stops(GLASS_TIER.light.recessed, [GLASS_TIER.light.sheet.gradient[0]]),
]

/**
 * Both halves, in report order — the rows that assert per scheme iterate this rather than
 * spelling `['light', 'dark'] as const` at each site (phone `:283`, `:382`).
 */
const SCHEMES = ['light', 'dark'] as const
type GlassScheme = (typeof SCHEMES)[number]

/** Every ground `fg` can land on in that scheme, worst first. Phone `:161-165`. */
function worst(fg: string, grounds: string[][]): number {
  return Math.min(...grounds.map((g) => contrast(fg, g)))
}

/**
 * Collected rather than asserted one at a time, so a failure names every offender and its
 * measured ratio in the diff. Phone `:167-171`.
 */
function offenders(pairs: [name: string, fg: string, grounds: string[][]][], threshold: number) {
  return pairs
    .map(([name, fg, grounds]) => ({ name, ratio: round(worst(fg, grounds)) }))
    .filter(({ ratio }) => ratio < threshold)
}

describe('palette contrast contract', () => {
  it('sanity-checks the helper against three known pairs', () => {
    // Phone `:174-180`. `round` returns a number, so 21.00 === 21 — the matrix writes 21.00
    // and the phone writes `toBe(21)`; this is the phone's spelling.
    expect(round(contrast('#000000', ['#ffffff']))).toBe(21)
    expect(round(contrast('#767676', ['#ffffff']))).toBe(4.54)
    // The figure the phone plan's Phase 9 correction block is built on.
    expect(round(contrast('#002853', ['#2580AD']))).toBe(3.34)
  })

  it('sanity-checks the compositing, distance and collection helpers', () => {
    // DEMO-SIDE ADDITION, and the reason for it is structural: almost every row in this file
    // is `it.todo` until U1.1 ships the tiers, so for one whole phase the ONLY thing standing
    // between a broken helper and a wave of silently-wrong un-todos is this block. The three
    // pairs above exercise `contrast` on flat opaque colours only — they cannot see a broken
    // composite, a broken dE, or a `stops`/`worst` that quietly returns the wrong ground.

    // Compositing. 50% white over black is mid grey; `flattenOver`'s fold is bottom-up, so a
    // 3-deep stack must equal the nested 2-deep form.
    expect(flatten(['rgba(255, 255, 255, 0.5)', '#000000'])).toEqual([128, 128, 128, 1])
    expect(flatten(['rgba(255, 255, 255, 0.5)', 'rgba(255, 255, 255, 0.5)', '#000000'])).toEqual(
      flatten(['rgba(255, 255, 255, 0.5)', flattenOver('rgba(255, 255, 255, 0.5)', '#000000')]),
    )

    // `parse` must REJECT, not coerce. `color-mix()` is the one that matters: jsdom silently
    // drops its percentage, so a value routed through one is unmeasurable here by construction.
    expect(() => parse('color-mix(in srgb, #ffffff 50%, #000000)')).toThrow(/cannot parse/)
    expect(() => parse('linear-gradient(180deg,#1F6B99,#17527A)')).toThrow(/cannot parse/)
    expect(() => parse('#fff')).toThrow(/cannot parse/)

    // …and the rejection must survive the trip THROUGH `flatten`, with the bad colour BURIED
    // rather than on top. This is the whole reason `flatten` opens with `stack.forEach(parse)`:
    // `flattenOver` returns its `top` argument UNCHANGED when ANY layer is unparseable, so
    // `flatten(['<good>', '<nonsense>', '<good>'])` comes back as the perfectly parseable
    // top colour and this file reports a confident, wrong ratio for a stack it never composited.
    //
    // THE POSITION IS LOAD-BEARING and this pin was wrong once for exactly that reason: when the
    // nonsense sits at the TOP of the stack, `flattenOver` hands it straight back and the
    // trailing `parse` throws on its own, so the guard line can be deleted and the assertion
    // still passes. Measured: probe 4b, guard deleted, top-position input, EXIT 0 — SURVIVED.
    // Keep the bad layer in the middle.
    expect(() =>
      contrast('#ffffff', [
        'rgba(255, 255, 255, 0.5)',
        'color-mix(in srgb, #ffffff 50%, #000000)',
        '#000000',
      ]),
    ).toThrow(/cannot parse/)

    // …and the BOTTOM of a stack must be opaque. `flattenOver` treats its last ground as the
    // painted surface and DISCARDS its alpha, so a translucent one yields a plausible wrong
    // answer instead of an error: `contrast('#ffffff', ['rgba(0, 0, 0, 0.1)'])` measured
    // 21.00 — identical to pure black — for a wash that is 90% transparent. `parse` cannot
    // catch this one; the layer parses perfectly well. Review r1 F6 clause (2).
    expect(() => contrast('#ffffff', ['rgba(0, 0, 0, 0.1)'])).toThrow(/bottom ground must be opaque/)

    // CIE76 dE. Black to white is the L* axis end to end: 100, by definition.
    expect(round(deltaE(parse('#000000'), parse('#ffffff')))).toBe(100)
    expect(deltaE(parse('#1c4e84'), parse('#1c4e84'))).toBe(0)

    // `stops` splits a two-stop gradient into two ground STACKS, each carrying `under`. This
    // is what keeps a gradient out of `parse` — the whole reason the phone has it.
    expect(stops({ gradient: ['#111111', '#222222'] }, ['#333333'])).toEqual([
      ['#111111', '#333333'],
      ['#222222', '#333333'],
    ])

    // `worst` is a MINIMUM across grounds, and `offenders` reports below-threshold only.
    expect(round(worst('#ffffff', [['#000000'], ['#ffffff']]))).toBe(1)
    expect(offenders([['grey on white', '#767676', [['#ffffff']]]], AA_TEXT)).toEqual([])
    expect(offenders([['grey on white', '#767676', [['#ffffff']]]], 5)).toEqual([
      { name: 'grey on white', ratio: 4.54 },
    ])
  })

  it('clears AA for the muted text ramp on every glass tier, both themes (rows 4-5)', () => {
    // Phone `:181-200`. `textTertiary` is excluded and carries a documented ceiling instead —
    // the next case. DEF-063 / DEF-UI-009 / DEF-UI-014: the floors this ramp failed at were
    // 3.97 (secondary, on the nested tier) and 2.08 (tertiary).
    expect(
      offenders(
        [
          ['dark text', palette.dark.text, DARK_GROUNDS],
          ['dark textSecondary', palette.dark.textSecondary, DARK_GROUNDS],
          ['light text', palette.light.text, LIGHT_GROUNDS],
          ['light textSecondary', palette.light.textSecondary, LIGHT_GROUNDS],
        ],
        AA_TEXT,
      ),
    ).toEqual([])
  })

  // Row 8. Phone `:201-208` holds BOTH themes to the DARK number 3.79 and records ~0.08 of
  // unasserted light slack as DEF-063's open owner question. The plan's U0.5 row closes that
  // gap on the demo side: pin light at its OWN 3.87 (DEF-063), dark at 3.79 (M2b). Raising
  // either is fine; dropping either is the regression. Both are CEILINGS under D5, not targets
  // — a port that "fixes" them diverges from the phone.
  it('holds the documented textTertiary ceilings (row 8)', () => {
    // Both are CEILINGS under D5, not targets: raising either is fine, dropping either is the
    // regression, and a port that "fixes" them diverges from the phone.
    //
    // The demo pins LIGHT at its own 3.87 where the phone pins both halves at the DARK number
    // 3.79 (phone `:205-206`) — the plan's U0.5 row closes that ~0.08 of unasserted slack, which
    // is the open owner question in DEF-063. Asserted UNROUNDED, as the phone does: `round` is
    // for reporting, and rounding 3.7949 up to 3.79 would accept a real drop.
    expect(worst(palette.dark.textTertiary, DARK_GROUNDS)).toBeGreaterThanOrEqual(3.79)
    expect(worst(palette.light.textTertiary, LIGHT_GROUNDS)).toBeGreaterThanOrEqual(3.87)
  })

  // Row 10, DEF-UI-018 — the port's single highest-value contrast row (A66/A27). Phone `:209-224`.
  // W2 F27 — WCAG 1.4.11, the row this contract did not have.
  //
  // PINNED AT THE CONTROL'S OWN CONSTANT, not at a palette token, and that is the whole point:
  // `UNCHECKED_MARK_EDGE` is the single value the checkbox's ring and the radio's ring + row
  // border resolve through, so reverting the control to `colors.border` reds THIS line. Row 8
  // below bounds `palette.dark.textTertiary` on the same grounds and would stay green through
  // that revert, because its subject is the token and not the control.
  //
  // What it caught: the port shipped `colors.border` here, phone-verbatim
  // (`Checkbox.tsx:61`, `RadioGroup.tsx:68`/`:97`), and it measures **1.33:1** against a 3.0
  // floor — a PASS -> FAIL regression from master's `#7a9fc4`. An unchecked box has no fill, no
  // glyph and (on the export card's "Select all") no label: the ring IS the control. Matrix
  // C.3 rule 4 governs — "a sole-boundary input border at 1.26 is not [decorative]" — and D5's
  // amendment is the house precedent for declining a phone value that fails the contract.
  it('clears the 1.4.11 non-text floor for the unchecked selection mark (W2 F27)', () => {
    expect(
      offenders(
        [
          ['dark unchecked mark edge', UNCHECKED_MARK_EDGE, DARK_GROUNDS],
          // The light half is the flip day's; the constant itself resolves through `scheme`
          // (ledger §99's class), so the light value is named directly here.
          ['light unchecked mark edge', palette.light.textTertiary, LIGHT_GROUNDS],
        ],
        AA_NON_TEXT,
      ),
    ).toEqual([])
  })

  it('clears AA for `link`, the accent-as-text token, on every glass tier (row 10)', () => {
    // DEF-UI-018, the port's single highest-value contrast row (A66/A27). Phone `:209-224`:
    // outline and ghost buttons label and outline with this token across 39 call sites, and
    // `RadioGroup` paints its whole selected state with it. All three used to read
    // `colors.primary`, a mid-tone FILL, which measures 2.87:1 as text on the dark tiers.
    expect(
      offenders(
        [
          ['dark link', palette.dark.link, DARK_GROUNDS],
          ['light link', palette.light.link, LIGHT_GROUNDS],
        ],
        AA_TEXT,
      ),
    ).toEqual([])
  })

  // DEMO-SIDE ADDITION (U2.2). Two grounds the port CREATES that no phone row covers, each a
  // button label on a fill the contract's tier stacks do not contain.
  //
  // The plan's U2.2 Tests column also asks for an outline BORDER floor at >= 3.0 "against every
  // dark tier". That is strictly implied by row 10 above — same token, same grounds, a 4.5 bound
  // — so writing it out would assert nothing row 10 does not already. The genuinely unmeasured
  // grounds are these.
  it('clears AA for the two button labels the port puts on grounds the contract has never seen', () => {
    expect(
      offenders(
        [
          // (a) `secondary`: `colors.text` on the FLAT `backgroundSecondary` fill (phone `:143`,
          //     `:216`). Row 4 measures `text` on the glass TIERS; an opaque flat fill is not one,
          //     and this is the label the port lifts from `textSecondary`.
          ['dark secondary label', palette.dark.text, [[palette.dark.backgroundSecondary]]],
          ['light secondary label', palette.light.text, [[palette.light.backgroundSecondary]]],
          // (b) `outline` under the demo-only 14% `primary` wash (D12) that the three
          //     sample/fallback buttons paint over whatever tier hosts them. `link` clears 6.86 on
          //     bare glass (row 10); what this answers is whether a wash the phone has never seen
          //     eats that headroom. Dark only — the wash has no light surface in the demo.
          [
            'dark outline label under SAMPLE_TINT',
            palette.dark.link,
            DARK_GROUNDS.map((ground) => [SAMPLE_TINT, ...ground]),
          ],
        ],
        AA_TEXT,
      ),
    ).toEqual([])
  })

  it('clears AA for the primary CTA label on both stops of its gradient, both schemes (rows 12-13)', () => {
    // Phone `:225-244`. On a blue gradient the two candidate label colours move in OPPOSITE
    // directions, so there is no stop where both clear 4.5:1 and the pair cannot be tuned
    // independently. The demo's old dark recipe `['#35A0D6','#2580AD']` measured 3.34 with
    // `textInverse` and 2.94 with `onPrimary`; U0.3 re-based it to 5.80 / 8.32.
    //
    // Read off `PrimaryButtonGradient` (`SEAM(U2.2)`), never retyped — and off THAT record rather
    // than off `GLASS.accentFrom`/`accentTo`, because the record is what `buttonStyle` actually
    // paints and it is the only place the LIGHT pair exists at all. Its dark half still points at
    // those two consts, which the drift guard reads by literal. Measured on the FLAT stop, not on
    // a ground stack — a CTA fill is opaque.
    //
    // The light half was `it.todo` ("UNOWNED, proposed U2.2") until this package created
    // `PrimaryButtonGradient.light` (phone `Colors.ts:472`). Typing its two hexes in here instead
    // would have been the exact anti-pattern the deep-import rule forbids.
    expect(
      (['light', 'dark'] as const)
        .flatMap((scheme) =>
          PrimaryButtonGradient[scheme].map((stop, index) => ({
            name: `${scheme} stop ${index}`,
            ratio: round(contrast(palette[scheme].onPrimary, [stop])),
          })),
        )
        .filter(({ ratio }) => ratio < AA_TEXT),
    ).toEqual([])
  })

  it('clears AA for `onPrimary` and `onError` on the deep fills (rows 16, 18, both schemes)', () => {
    // Phone `:245-276`, the ratio half. DEF-UI-001: NEITHER token clears on the flat mid-tone
    // fill it is named after (`onPrimary` on `primary` 3.73 dark, `onError` on `error` 3.34
    // dark / 3.76 light), which is why every filled control paints the DEEP shade instead.
    //
    // The `*Light` / `*Dark` names INVERT between themes, so the deep red is `errorDark` in
    // light and `errorLight` in dark. That inversion is spelled out here rather than looped,
    // because it is the thing every consumer gets wrong once.
    expect(
      (
        [
          ['dark onPrimary/primaryDark', palette.dark.onPrimary, palette.dark.primaryDark],
          ['light onPrimary/primaryDark', palette.light.onPrimary, palette.light.primaryDark],
          ['dark onError/errorLight', palette.dark.onError, palette.dark.errorLight],
          ['light onError/errorDark', palette.light.onError, palette.light.errorDark],
        ] as [string, string, string][]
      )
        .map(([name, fg, bg]) => ({ name, ratio: round(contrast(fg, [bg])) }))
        .filter(({ ratio }) => ratio < AA_TEXT),
    ).toEqual([])
  })

  /**
   * A19's binding rider, in THE BADGE's own terms (matrix A19, §C.3 rule 2, D5's amendment).
   *
   * Rows 16/18 above pin `onPrimary` / `onError` AT THE CONSTANTS. This row pins the pairing
   * the status recipe actually MANUFACTURES: `severityTone()` is what every badge, chip and
   * note in the demo spends, so a re-point of any `*Light` / `*OnLight` token — or a wiring
   * swap inside the recipe, fill against foreground — reds here rather than in a screen test
   * that reads the value back out of the same object it just put in.
   *
   * It is also the plan's U3.1 "ADD: the four `*OnLight`-on-`*Light` pairs at >= 4.5", which
   * U3.1 did not land (its report §2.2 lists rows 22-25 and 30 only). Measured: dark
   * info 5.94 / warning 5.40 / success 5.93 / error 5.79.
   *
   * **4.5 and not 3.0**, because a badge renders a WORD: §C.3 rule 2's carve-out is "non-text
   * marks", and that same reading is why D5's amendment refuses `primary #2B8CC1` (3.73) under
   * the map's filter-count NUMERAL and takes `primaryDark #1F6B99` (5.80) instead.
   *
   * The four severity fills are OPAQUE, so they are measured flat — one ground, no stack; a
   * ground stack under an opaque fill would be measuring layers that cannot show through. The
   * neutral is the exception, and that is why it is a second arm: its fill is a 15% tint, so it
   * is composited over every ground a badge can land on and taken at the worst.
   */
  it('clears AA for every text-on-fill pairing the status recipe can produce (A19s rider)', () => {
    for (const s of SCHEMES) {
      expect(
        offenders(
          SEVERITIES.map((severity) => {
            const tone = severityTone(severity, s)
            return [`${s} ${severity} badge`, tone.color, [[tone.background]]] as [string, string, string[][]]
          }),
          AA_TEXT,
        ),
      ).toEqual([])

      const neutral = neutralTone(s)
      expect(
        offenders(
          [
            [
              `${s} neutral badge`,
              neutral.color,
              (s === 'dark' ? DARK_GROUNDS : LIGHT_GROUNDS).map((ground) => [neutral.background, ...ground]),
            ],
          ],
          AA_TEXT,
        ),
      ).toEqual([])
    }
  })

  // Row 21, phone `:265-274`. The ratios above are only true of the SHIPPED UI if the shared
  // danger recipe actually points at those two tokens, and nothing asserts that link. The
  // phone's `SwipeDeleteAction.test.tsx` compared the rendered value against `DangerFill`
  // ITSELF, so it moved with the constant and could not fail on it: mutating `DangerFill` back
  // to the flat failing pair left that suite 32/32 green. PIN THE RATIO AT THE CONSTANT —
  // `expect(DangerFill.light).toBe(palette.light.errorDark)` and the dark mirror — or the
  // tautology just moves up one level.
  it('maps the danger fill to the deep red in both schemes, AT the constant (row 21)', () => {
    // The link that makes row 18 a statement about the shipped UI rather than about two palette
    // entries nothing paints together.
    expect(DangerFill.dark).toBe(palette.dark.errorLight)
    expect(DangerFill.light).toBe(palette.light.errorDark)
    // ...and NOT the flat mid-tone a future "resync" would reach for, which is the mutation the
    // phone's consumer-side pin could not see: `error` measures 3.34 dark / 3.76 light.
    expect(DangerFill.dark).not.toBe(palette.dark.error)
    expect(DangerFill.light).not.toBe(palette.light.error)
  })

  // Rows 22-25. Phone `:277-304`, over a per-scheme `barGrounds(scheme)` = both `card` stops
  // plus both `sheet` stops. Needs `warningAccent` (`#ffc62b` dark / `#b45309` light, phone
  // `Colors.ts:180`/`:77`), which is U3.1's — `palette.ts` carries `warningDark` today, and
  // they are NOT the same token even where dark shares a value.
  // U1.1 landed `GLASS_TIER`, so `barGrounds(scheme)` (both `card` stops plus both `sheet`
  // stops) is now writable. The ONLY remaining missing input is `warningAccent`, so this row
  // is U3.1's alone from here — the U0.5 docblock above listed it among U1.1's un-todos, which
  // its own title refutes.
  it('clears the 1.4.11 non-text floor for the four status accents, both themes (rows 22-25)', () => {
    // DEF-UI-017's acceptance bar, verbatim from phone `:277-304`: every severity at or above
    // 3:1 against both `card` gradient stops AND both `sheet` stops, in BOTH themes. The dark
    // `working` cell is the one the row recorded failing at 2.87 before the re-base, with no
    // light mode involved.
    //
    // A NARROWER GROUND STACK THAN `DARK_GROUNDS`, and that is the phone's contract, not a
    // weakening: `barGrounds` omits `nestedCard` and `recessed`. These four are read as MARKS
    // on a status bar, a badge rail and a map sheet — surfaces that sit on `card` and `sheet` —
    // and widening the stack here would silently re-scope a ported row into a new one.
    const barGrounds = (s: GlassScheme): string[][] =>
      s === 'dark'
        ? [...stops(GLASS_TIER.dark.card, DARK_BG), ...stops(GLASS_TIER.dark.sheet, DARK_BG)]
        : [...stops(GLASS_TIER.light.card), ...stops(GLASS_TIER.light.sheet)]

    // The four tokens are named, never re-typed — `warningAccent` is U3.1's whole reason for
    // existing and `palette.ts` carries `warningDark` at the same DARK hex. Reading the
    // constant is what makes a re-point of either one visible here; a literal `'#ffc62b'`
    // would stay green through exactly the edit this row exists to catch.
    for (const s of SCHEMES) {
      const c = palette[s]
      expect(
        offenders(
          [
            [`${s} started`, c.warningAccent, barGrounds(s)],
            [`${s} working`, c.infoDark, barGrounds(s)],
            [`${s} complete`, c.successDark, barGrounds(s)],
            [`${s} incident`, c.error, barGrounds(s)],
          ],
          AA_NON_TEXT,
        ),
      ).toEqual([])
    }
  })

  // Row 31. Phone `:305-342`. Two channels, because only one is available in each theme: light
  // separates on the FILL, dark cannot (dark `textTertiary` sits exactly on its 3.79 floor on
  // this tier, so there is no headroom to lift the fill) and separates on the BORDER instead.
  // Either channel failing is the regression, so both are asserted in both themes at the level
  // each can actually reach: border ratio >= 1.25 both themes, light fill >= 1.05.
  it('keeps the nested tier visually separable from the card it sits on (row 31)', () => {
    // Phone `:305-341`. The assertion whose absence let a flat tier ship across 30 phone call
    // sites: `nestedCard` was `card`'s own gradient at lower alpha, and the surface it
    // composites over IS `card`, so it resolved to a 1.022:1 luminance ratio against its own
    // parent in dark. An inner card was delimited by nothing but its border.
    const parent = (scheme: 'light' | 'dark') =>
      scheme === 'dark'
        ? [GLASS_TIER.dark.card.gradient[1], ...DARK_BG]
        : [GLASS_TIER.light.card.gradient[1]]

    // The border is the delimiter in both themes and is what CARRIES the tier in dark, where
    // the fill cannot lift at all (`textTertiary` sits exactly on its 3.79 floor here).
    // Measured against the tier's own fill, worst stop.
    expect(
      (['light', 'dark'] as const)
        .map((scheme) => {
          const tier: GlassTier = GLASS_TIER[scheme].nestedCard
          const onFill = tier.gradient.map((stop) => [stop, ...parent(scheme)])
          return { scheme, ratio: round(Math.min(...onFill.map((g) => contrast(tier.border, g)))) }
        })
        .filter(({ ratio }) => ratio < 1.25),
    ).toEqual([])

    // Light additionally separates on the FILL — the channel dark does not have. The tier must
    // not resolve to its own parent; `dE 0.00` on the top stop is what shipped.
    const lightFill = GLASS_TIER.light.nestedCard.gradient.map((stop) =>
      contrast(stop, parent('light')),
    )
    expect(Math.min(...lightFill)).toBeGreaterThanOrEqual(1.05)
  })

  // Row 33. Phone `:343-376` — the ONLY dE-bounded block in the whole file, and the only one
  // that is TWO-SIDED (`.filter(({ dE }) => dE < 3 || dE > 12)`). Too flat and too deep are
  // both bugs. PER STOP, never `Math.max` of them: taking the max meant the lower bound only
  // fired when BOTH stops went flat, so an alpha edit touching one stop left the healthy one
  // reading and passed while the gradient visually went from a well at one end to nothing at
  // the other. Row 31's 1.25 bound is a CONTRAST bound, not dE — the two need different
  // helpers and the plan's §9 clause 2 blurs them.
  it('keeps the recessed well a well — neither flat against its sheet nor a black hole (row 33)', () => {
    // Phone `:343-374`. TWO-SIDED, unlike row 31, because this tier failed in the other
    // direction: `rgb(6, 12, 22)` is on no ramp in this app and resolved CIE76 dE 16.65 from
    // the sheet it sits on, reading as a black slab in the three bottom-sheet pickers. Too flat
    // and too deep are both bugs.
    //
    // Measured in dE, not contrast ratio: the ratio is BLIND to this defect. `rgb(6, 12, 22)`
    // scored 1.24 against the sheet, which is *healthier* than the perfectly fine light-mode
    // tier's 1.19 — near-black and navy can share a luminance while being nothing alike.
    expect(
      (['light', 'dark'] as const)
        .map((scheme) => {
          const sheetTop = GLASS_TIER[scheme].sheet.gradient[0]
          const under = scheme === 'dark' ? [sheetTop, ...DARK_BG] : [sheetTop]
          const sheet = flatten(under)
          // EVERY stop, never `Math.max` of them. Taking the max meant the lower bound only
          // fired when BOTH stops went flat: an alpha edit touching one stop left the healthy
          // one reading and passed, while the gradient visually went from a well at one end to
          // nothing at the other. Each stop is bounded independently.
          const recessed: GlassTier = GLASS_TIER[scheme].recessed
          return recessed.gradient.map((stop, index) => ({
            scheme,
            stop: index,
            dE: round(deltaE(flatten([stop, ...under]), sheet)),
          }))
        })
        .flat()
        .filter(({ dE }) => dE < 3 || dE > 12),
    ).toEqual([])
  })

  // Row 30, phone `:377-388`. The other half of the DEF-UI-017 bar: a palette that clears 3:1
  // by collapsing to one colour passes the number and fails the user. `warningOnLight` clears
  // easily and is `#f0f4f8` in dark, so reassigning `started` to it would make three of the
  // four the same near-white. Needs `warningAccent` (U3.1).
  it('keeps the four status accents four distinguishable hues (row 30)', () => {
    // Phone `:377-388`. Half the acceptance bar is a NUMBER and half is this: a palette that
    // clears 3:1 by collapsing to one colour passes rows 22-25 and fails the user. The trap is
    // concrete — `warningOnLight` clears easily and is `#f0f4f8` in dark, so reassigning
    // `started` to it would make three of the four the same near-white and rows 22-25 would
    // not notice.
    for (const s of SCHEMES) {
      const c = palette[s]
      expect(
        new Set([c.warningAccent, c.infoDark, c.successDark, c.error]).size,
        `${s}: the four status accents collapsed`,
      ).toBe(4)
    }
  })
})

describe('scrim opacity', () => {
  // Row 34, phone `:389-408`. The dark scrim shipped at 0.9 alpha, which blacked the app out
  // behind an open sheet instead of dimming it; 0.32 matches the common dim across the
  // platforms surveyed. Light has always been 0.5 and reads correctly.
  //
  // U4.4 landed `colors.scrim`. The three competing darknesses it collapsed were
  // `rgba(4,8,14,0.55)` (8 sites), `rgba(4,8,14,0.66)` (3) and `rgba(4,8,14,0.72)` (1, and
  // FROZEN by D12 — `ExitDialog` sits outside the phone frame).
  const alphaOf = (rgba: string) => Number(rgba.match(/([\d.]+)\s*\)$/)![1])

  it('row 34: dims the app behind a sheet without blacking it out, in both themes', () => {
    expect(alphaOf(palette.dark.scrim)).toBe(0.32)
    expect(alphaOf(palette.light.scrim)).toBe(0.5)
  })

  it('row 34b: keeps scrim and overlay APART in dark, and together in light', () => {
    // Phone `Colors.ts:222-226`: *"NOT the same value as `overlay` any more (light still is):
    // 0.9 blacked the app out behind an open sheet instead of dimming it, so the dark half
    // moved to 0.32 while `overlay` stayed put. Deliberate — do NOT 'resync' the two."*
    // The dark half is the whole finding, so it is asserted as a DIFFERENCE rather than as two
    // values: a re-sync to 0.9 is the exact edit this row exists to catch, and it would pass a
    // pair of value pins written independently.
    expect(palette.dark.scrim).not.toBe(palette.dark.overlay)
    expect(alphaOf(palette.dark.overlay)).toBe(0.9)
    // …and light genuinely IS the same value, so pinning "they differ" unconditionally would
    // be wrong rather than merely stricter.
    expect(palette.light.scrim).toBe(palette.light.overlay)
  })

  // Rows 36-37, phone `:409-429`. The alpha pin above is necessary and NOT sufficient, and this
  // pair is why: the phone's 0.9 -> 0.32 move shipped green because nothing re-checked the
  // COMPOSITED ratios two consumers had written into their own docblocks. A backdrop alpha and
  // an opaque-plate alpha are different contracts, so these surfaces carry their OWN constants
  // (`MEDIA_CLOSE_CHIP`, `PDF_LOADING_SCRIM`, `PDF_VIEWER_CHROME`) — imported from the modules
  // that paint them, so they fail on the retune rather than restating a literal that no longer
  // describes the UI. All three are U4.4's (matrix A90).
  //
  // 4.5:1 and not the 3:1 of 1.4.11: a 24px glyph read as a symbol, and the chip is the
  // fullscreen viewer's only exit. Measured over a WHITE and a BLACK frame — exterior daylight
  // CCTV stills make pure white the real worst case, not a pessimistic one.
  it('rows 36-37: keeps the fullscreen media close glyph legible over the brightest still', () => {
    // Measured over a WHITE and a BLACK frame — exterior daylight CCTV stills make pure white
    // the real worst case, not a pessimistic one. `MEDIA_CLOSE_CHIP` is imported from the
    // module that PAINTS it, so a retune fails here rather than being restated as a literal
    // that no longer describes the UI.
    expect(
      [
        ['close glyph over a white frame', '#ffffff'],
        ['close glyph over a black frame', '#000000'],
      ]
        .map(([label, frame]) => [label, round(contrast(palette.dark.text, [MEDIA_CLOSE_CHIP, frame]))] as const)
        .filter(([, ratio]) => ratio < 4.5),
    ).toEqual([])
  })

  it('rows 36-37b: and the chip is NOT the backdrop token', () => {
    // The whole reason it carries its own constant. At `colors.scrim`'s 0.32 the chip
    // composites to a pale grey over a bright still and the glyph drops under any floor —
    // which is the PR #127 `3893169e` regression this pin exists to stop coming back.
    expect(MEDIA_CLOSE_CHIP).not.toBe(palette.dark.scrim)
    expect(round(contrast(palette.dark.text, [palette.dark.scrim, '#ffffff']))).toBeLessThan(4.5)
  })

  // Rows 38-40, phone `:430-464`. STILL TODO after U4.4, and the reason is a refuted premise
  // rather than unfinished work: matrix A90 says the demo's analog is *"`PdfPreview`'s loading
  // state"*, and there is no such state. `ui/chrome/PdfPreview.tsx` (176 lines) holds exactly
  // one `useState` — `printNotice`, for a blocked print dialog — no spinner, no `onLoad`, no
  // loading plate; it renders the document straight into an `iframe srcDoc`. So there is no
  // surface for `PDF_LOADING_SCRIM` to ground and no spinner whose ratio could be measured.
  //
  // DEF-UI-005 is "the loading MESSAGE is invisible". The demo shows no message, so it does not
  // have the defect, and creating a loading overlay to satisfy a contrast row would be building
  // UI to make a test pass. `PDF_VIEWER_CHROME` is deliberately not created either: the phone's
  // `#525659` is the colour Chrome's and WebKit's own PDF viewers paint, matched so a `WebView`
  // does not flash — the demo paints its own surround (`PdfPreview.tsx:151`, `#3a3f47`) and has
  // no native viewer to match, so porting the constant would cargo-cult a platform fact into a
  // place where no platform paints it.
  //
  // U4.4's report proposes this as a deferral. Un-todo it the day `PdfPreview` grows a real
  // loading affordance, and not before.
  it.todo(
    'rows 38-40 (deferred, see U4.4 report): PdfPreview has no loading state to ground PDF_LOADING_SCRIM',
  )
})

describe('map chrome contrast floors', () => {
  // Rows 41-45 are NEW in this port — the phone has none, and U5 is the only phase that would
  // otherwise ship with no contrast target at all (matrix §C.1). Landed by U5.2, which builds
  // the collapsed search bar these rows measure.
  //
  // THE GROUND IS NOT A TOKEN. The floating chrome composites `MAP_GLASS_COLORS.containerBg`
  // (`rgba(0,40,83,0.82)`) over whatever the satellite tile happens to be, so every row measures
  // against BOTH extremes: `#ffffff` for exterior daylight (snow, sand, a white roof — the real
  // worst case, not a pessimistic one) and `#000000` for night imagery and deep shadow. That is
  // the two-frame method rows 36-37 already use for `MEDIA_CLOSE_CHIP`.
  //
  // DEF-062 is the reason this section exists rather than a reason to skip it: the CHROME's own
  // 1.70/1.77:1 against a bright tile was closed as ACCEPTED on the phone, with no reopen
  // trigger (measured here: 8.48 over white, 1.30 over black). D5 says inherit it. What is NOT
  // inherited is illegible TEXT on top of that chrome, which is what rows 41-44 bound.

  /** Topmost-first, per `contrast`'s contract: the glass, then the tile under it. */
  const overTile = (tile: string) => [MAP_GLASS_COLORS.containerBg, tile]

  /**
   * Row 45's ground, and the ONE row here with no tile in it — `MapFiltersSheet` is app chrome on
   * the `sheet` tier. Resolved through `scheme` rather than spelled `dark`, so the row measures
   * whichever half the demo consumes (D2, §9 clause 12); the light stacks omit the background
   * because light's tiers are opaque, exactly as `LIGHT_GROUNDS` does.
   */
  const SHEET_GROUNDS: string[][] =
    scheme === 'dark' ? stops(GLASS_TIER.dark.sheet, DARK_BG) : stops(GLASS_TIER.light.sheet)
  const TILES: ReadonlyArray<readonly [string, string]> = [
    ['a bright daylight tile', '#ffffff'],
    ['a night tile', '#000000'],
  ]

  it('row 41: the filter-count badge numeral clears AA on the fill the component actually paints', () => {
    // The badge renders a NUMERAL, so §C.3 rule 2's "non-text marks" carve-out does not cover it
    // and the 4.5 text floor applies. The badge fill is opaque, so the tile underneath cannot
    // reach it — this is the one map row with a single ground.
    //
    // Read off `MAP_FILTER_BADGE_FILL`, the constant `MapControls` paints with, NOT off
    // `palette.primaryDark`: a pin against the palette stays green through exactly the edit it
    // exists to catch (U0.5's `SwipeDeleteAction` lesson).
    expect(round(contrast(palette.dark.onPrimary, [MAP_FILTER_BADGE_FILL]))).toBeGreaterThanOrEqual(AA_TEXT)
    // …and the phone's own pairing is the failure this diverged from. 3.73 is not a rounding
    // artefact of the line above; it is a different, worse colour.
    expect(round(contrast(palette.dark.onPrimary, [palette.dark.primary]))).toBe(3.73)
    expect(round(contrast(palette.dark.onPrimary, [MAP_FILTER_BADGE_FILL]))).toBe(5.8)
  })

  it('rows 42 + 44: the search text and the proximity chip clear AA over both tiles', () => {
    // One assertion for two rows because they are one measurement: the chip and the field are
    // the same `colors.text` on the same `surfaceBg`, which is the "one surface" rule the
    // redesign introduced when it deleted `inputBg`.
    expect(
      TILES.map(([label, tile]) => [label, round(contrast(MAP_GLASS_COLORS.text, overTile(tile)))] as const)
        .filter(([, ratio]) => ratio < AA_TEXT),
    ).toEqual([])
  })

  it('rows 42 + 44: and the chrome text is the palette`s, not a second white', () => {
    // The map island carried its own `#e7eef6` "primary text" until U5.1 (demo §1.3's
    // split-brain). Rows 42/44 measure `MAP_GLASS_COLORS.text`; this is what stops that
    // reading from drifting off `colors.text` while the ratio stays plausible.
    expect(MAP_GLASS_COLORS.text).toBe(palette.dark.text)
  })

  // ROW 43 — the search placeholder. STILL TODO after U5.2, on a refuted premise, and the
  // measurement is recorded here so the next package does not have to re-derive it.
  //
  // 1. THE DEMO PAINTS NO PLACEHOLDER COLOUR. The phone passes
  //    `placeholderTextColor={Colors.dark.textTertiary}` (`MapControls.tsx:143`); the web
  //    spells that `::placeholder`, which needs a stylesheet rule, and `ui/demo.css` is U8.2's
  //    alone (plan §6.1: "If a package thinks it needs to touch it, that is a scope error").
  //    U2.1 hit this first and made the same call for `fieldInputStyle`
  //    (`tokens/field-input.ts:44-47`). There is no inline route to a pseudo-element.
  // 2. WHEN U8.2 DOES PAINT IT, `textTertiary` IS THE WRONG VALUE. Measured with the helpers
  //    above: `colors.textTertiary #7a9fc4` on `surfaceBg` over a white tile is **3.06** —
  //    below the row's own 3.79 M2b floor, never mind 4.5. Row 43's escape clause is written
  //    for exactly this: *"If it lands below 3.79 the placeholder must take `textSecondary`"* —
  //    `#99badd` measures **4.21**, which clears 3.79. The relief is a ceiling on `card`/`sheet`,
  //    not a licence over satellite tiles.
  //
  // SEAM(U8.2): add `[data-demo-root] [data-testid='map-search-input']::placeholder { color:
  // <textSecondary> }` (or the equivalent scoped rule), then un-todo this with the same
  // two-tile shape as rows 42/44 at a >= 3.79 bound. Note that `vitest.config.mts` sets
  // `css: false`, so the RULE is invisible to this suite — the pin has to sit on the exported
  // constant the rule consumes, or it guards nothing.
  it.todo(
    'row 43 (U8.2, not U5.2): the search placeholder needs a ::placeholder rule in demo.css before it can be measured — and must take textSecondary (4.21), not textTertiary (3.06)',
  )

  // Row 45: `MapFiltersSheet` section labels, `12/700 textSecondary` on the `sheet` tier —
  // inherits row 5's bound, on the surface U5.3 creates. Re-owned from U5.2 because pinning the
  // ratio AT the section-label constant is what U0.5's structural rule requires, and that
  // constant could not exist before the sheet did.
  //
  // Unlike rows 41-44 there is no tile in the stack: this sheet is APP chrome, not map chrome
  // (the phone's own D3(a) call at `MapFiltersSheet.tsx:11-13`), so it grounds on the `sheet`
  // tier over the app background exactly as every other sheet does.
  it('row 45: MapFiltersSheet section labels clear AA on the sheet tier, both halves', () => {
    // Both scheme halves, on the tier the sheet actually paints — the `sheet` rows of
    // DARK_GROUNDS / LIGHT_GROUNDS, isolated so a failure names this surface rather than a
    // neighbouring tier.
    expect(
      offenders(
        [
          ['dark section label', palette.dark.textSecondary, stops(GLASS_TIER.dark.sheet, DARK_BG)],
          ['light section label', palette.light.textSecondary, stops(GLASS_TIER.light.sheet)],
        ],
        AA_TEXT,
      ),
    ).toEqual([])

    // AT THE CONSTANT (U0.5's rule, the `DangerFill` / `MEDIA_CLOSE_CHIP` / `MAP_FILTER_BADGE_FILL`
    // precedent): the label the sheet paints IS that ramp in the consumed scheme. Re-pointing it
    // at `textTertiary` — which carries a documented 3.79 CEILING two cases up and would fail this
    // row's 4.5 — reds here, where a pin against `palette` alone would stay green.
    expect(MAP_FILTER_SECTION_LABEL.color).toBe(palette[scheme].textSecondary)
    expect(round(worst(MAP_FILTER_SECTION_LABEL.color, SHEET_GROUNDS))).toBeGreaterThanOrEqual(AA_TEXT)
  })

  /**
   * The map BOTTOM sheet's own ground, which is not any glass tier (U5.1's R1): the phone paints
   * it as three OPAQUE stops of `background` / `backgroundSecondary` / `background`
   * (`map-view/constants/index.ts:339-343`, a compositor ruling — a translucent sheet forces the
   * GPU to keep blending the live map behind it on every drag frame). So the two distinct grounds
   * a sheet surface can sit on are those two palette values, with nothing showing through.
   */
  const MAP_SHEET_STOPS = [palette[scheme].background, palette[scheme].backgroundSecondary]
  /** …and a nested info card on top of either of them. */
  const SHEET_NESTED_GROUNDS: string[][] = MAP_SHEET_STOPS.flatMap((stop) =>
    stops(GLASS_TIER[scheme].nestedCard, [stop]),
  )

  // Rows 46 + 47 (W3/F52) — the two map-sheet surfaces U5.4 moved onto `colors.primary` as TEXT.
  //
  // Both are new rows rather than an amendment to 41-44: those measure the floating chrome over a
  // satellite tile, and these two sit inside the sheet, where the ground is opaque and known.
  it('rows 46 + 47: the contact rows and the picker’s selected title clear AA (W3/F52)', () => {
    // Row 46 — the ONLY affordance for reaching a requester or a site contact. A phone number is
    // read and dialled, so §C.3 rule 2's "non-text marks" carve-out does not reach it.
    expect(round(worst(MAP_CONTACT_ROW.color, SHEET_NESTED_GROUNDS))).toBeGreaterThanOrEqual(AA_TEXT)
    // Row 47 — the picker row's selected case number, on the same nested tier over the app ground.
    expect(
      round(worst(MAP_PICKER_SELECTED_TITLE, stops(GLASS_TIER[scheme].nestedCard, [palette[scheme].background]))),
    ).toBeGreaterThanOrEqual(AA_TEXT)

    // AT THE CONSTANT, and the NEGATIVE half with it (W2/F27): a bound alone would stay green if
    // someone re-pointed either site back at the phone's own token, because `>= 4.5` says nothing
    // about which value is present. These two lines are what actually red on that edit.
    expect(MAP_CONTACT_ROW.color).toBe(palette[scheme].link)
    expect(MAP_PICKER_SELECTED_TITLE).toBe(palette[scheme].link)

    // The phone's pairing IS the failure this diverges from, recorded as an exact figure the way
    // row 41 records the badge's 3.73. Not a rounding artefact of the bound above — a different,
    // worse colour, and one that was WORSE THAN THE #00BFFF it replaced (5.07 on this ground).
    expect(round(worst(palette[scheme].primary, SHEET_NESTED_GROUNDS))).toBeLessThan(AA_TEXT)
  })
})

describe('terminal console contrast (U7.1 / A85, §C "Terminal title bar / privacy meta / gutter")', () => {
  // The console has its OWN ground stack — `screen.dark`, `bar`, `blockBg` — none of which is
  // `palette.background` (A91/D6(a): the terminal ground is deliberately far darker than the
  // app ground and must NOT be tokenised to it). So these rows composite against the terminal
  // palette, not `DARK_GROUNDS`, and there is no light half: `TERMINAL_SCHEME` is dark by
  // construction. Every ground is an opaque hex, so no flattening is involved.
  //
  // This block is the falsifiable half of U7.1. The `toEqual` shape pin in
  // `screens/import/__tests__/terminal-palette.test.ts` fails on ANY edit; these fail only on
  // the edit that MATTERS — a foreground dropping back under AA. The three §C rows are the
  // package's whole contrast deliverable, and each was measured on the phone before the raise:
  // titleText 2.99, titleMeta 4.05, time 2.10.
  const SCREEN = TERMINAL_PALETTE.screen[TERMINAL_SCHEME]

  it('§C: every console foreground clears AA on its own ground (phone terminal-palette.ts:20-35)', () => {
    const pairs: [name: string, fg: string, ground: string][] = [
      ['titleText on bar', TERMINAL_PALETTE.titleText, TERMINAL_PALETTE.bar],
      ['titleMeta on bar', TERMINAL_PALETTE.titleMeta, TERMINAL_PALETTE.bar],
      ['time on screen', TERMINAL_PALETTE.time, SCREEN],
      ['body on screen', TERMINAL_PALETTE.body, SCREEN],
      ['blockText on blockBg', TERMINAL_PALETTE.blockText, TERMINAL_PALETTE.blockBg],
      ['error on screen', TERMINAL_PALETTE.error, SCREEN],
      ['cursor on screen', TERMINAL_PALETTE.cursor, SCREEN],
      // The live dot is a 5px non-text mark, but it takes `cursor` — already covered above at
      // the stricter text floor, so it needs no row of its own.
    ]
    expect(
      pairs
        .map(([name, fg, ground]) => ({ name, ratio: round(contrast(fg, [ground])) }))
        .filter(({ ratio }) => ratio < AA_TEXT),
    ).toEqual([])
  })

  it('§C: all ten syntax accents clear AA on the console ground (phone: 5.94 error to 14.38 norm)', () => {
    // Measured at the STRICTER normal-text threshold precisely because the tag text is 10px
    // (phone `:37-44`) — the large-text allowance never applies anywhere in this palette.
    expect(
      Object.entries(TERMINAL_PALETTE.accent)
        .map(([level, fg]) => ({ level, ratio: round(contrast(fg, [SCREEN])) }))
        .filter(({ ratio }) => ratio < AA_TEXT),
    ).toEqual([])
  })

  it('§C: the three raised foregrounds land on the phone\'s measured ratios, not merely above the floor', () => {
    // A floor-only assertion would stay green over a foreground pushed to pure white, which is
    // the opposite of "hue preserved, lightness lifted until each cleared AA" (phone `:32-35`).
    // These are the phone's own published numbers.
    expect(round(contrast(TERMINAL_PALETTE.titleText, [TERMINAL_PALETTE.bar]))).toBe(4.97)
    expect(round(contrast(TERMINAL_PALETTE.titleMeta, [TERMINAL_PALETTE.bar]))).toBe(5.22)
    expect(round(contrast(TERMINAL_PALETTE.time, [SCREEN]))).toBe(4.98)
  })

  it('the console ground stays far darker than the app ground (A91 / D6(a) — do not tokenise it)', () => {
    // The rider is a RELATIONSHIP, so pin the relationship rather than the hex: any future
    // "tidy" that points `screen` at `colors.background` reds here even if the hex it lands on
    // is a plausible navy.
    expect(SCREEN).not.toBe(palette.dark.background)
    expect(round(contrast('#ffffff', [SCREEN]))).toBeGreaterThan(
      round(contrast('#ffffff', [palette.dark.background])),
    )
  })
})

/**
 * D12's THIRD arm — **freeze AND DEFEND** the "Sample data" amber.
 *
 * D12, verbatim: *"It must stay **visually distinct from real data** — that is a correctness
 * constraint. Re-derive it only if A15's `warningLight #7d5f10` would collide with it (it will
 * not; they are a fill and a foreground of different families)."*
 *
 * "Will not collide" is a PREDICTION, and D12 is the one decision in the set whose failure mode
 * is the demo lying about its own provenance rather than looking dated. So it is measured here,
 * not asserted: `deltaE` is the same CIE76 the tier rows use, and the plan §9 clause 2 precedent
 * (`recessed` two-sided, `nestedCard` >= 1.25) is that a separation claim a ratio is blind to
 * gets a dE bound.
 *
 * The threshold is 10, comfortably above the 2.3 "just noticeable" line and below every measured
 * value here, so it fails on a real convergence rather than on rounding. The badge is measured
 * as it RENDERS — its 12% fill composited over the nested card it sits on — because that is the
 * colour the operator distinguishes, and an uncomposited comparison of two `rgba()` strings
 * would pass over a fill that vanishes into its parent.
 */
describe('D12: the sample-data badge stays distinct from the ported warning family', () => {
  // The nested card is what both badge sites sit on: `ImportResultAccordion`'s per-location
  // chip and `OcrCaptureScreen`'s confidence chip.
  const CARD = [GLASS_TIER.dark.nestedCard.gradient[0], palette.dark.background]
  const badgeFill = flatten([SAMPLE_BADGE.background, ...CARD])
  const warningFill = flatten([palette.dark.warningLight, ...CARD])

  it('separates the badge FILL from `warningLight`, the ported warning ground', () => {
    // This is the collision D12 names by hand. If a future re-tint of `warningLight` walks it
    // toward this amber, a sample value and a real warning stop being tellable apart.
    expect(round(deltaE(badgeFill, warningFill))).toBeGreaterThan(10)
  })

  it('separates the badge FOREGROUND from every ported warning foreground', () => {
    const fg = parse(SAMPLE_BADGE.foreground)
    for (const token of ['warning', 'warningDark', 'warningAccent', 'warningOnLight'] as const) {
      expect(
        round(deltaE(fg, parse(palette.dark[token]))),
        `SAMPLE_BADGE.foreground has converged on \`${token}\``,
      ).toBeGreaterThan(10)
    }
  })

  it('is legible on the card it renders on, which is what makes it a MARK and not decoration', () => {
    // A badge that clears the family separation and then cannot be read is not a defence.
    expect(round(contrast(SAMPLE_BADGE.foreground, [SAMPLE_BADGE.background, ...CARD]))).toBeGreaterThan(AA_TEXT)
  })

  it('is a FROZEN constant block, never a status token (A91)', () => {
    // The structural half of the defence: if a later "tidy" points the badge at the status
    // family, every dE above collapses to 0 and the three tests become tautologies. Pin the
    // NON-identity so the tidy reds here first, with a message that says why.
    for (const token of ['warning', 'warningDark', 'warningAccent', 'warningLight', 'warningOnLight'] as const) {
      expect(SAMPLE_BADGE.foreground as string, `the badge was tokenised to \`${token}\` — D12 freezes it`).not.toBe(palette.dark[token])
      expect(SAMPLE_BADGE.background as string).not.toBe(palette.dark[token])
    }
  })
})
