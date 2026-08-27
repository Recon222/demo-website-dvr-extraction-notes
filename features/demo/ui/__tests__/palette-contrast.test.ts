import { describe, it, expect } from 'vitest'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { palette } from '@/features/demo/ui/tokens/palette'
import { flattenOver } from '@/features/demo/ui/tokens/scale'

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
 * `DARK_GROUNDS` (phone `:140-151`, NINE stacks) and `LIGHT_GROUNDS` (`:152-159`) are built
 * entirely out of `GlassColors[scheme]`, which is U1.1's `GLASS_TIER` here and does not exist
 * yet. Every row that measures against a tier is therefore `it.todo` below. U1.1's own Tests
 * column says "UN-TODO contrast rows 31 and 33" — it un-todos rows 4, 5, 8, 10, 22-25, 30, 31
 * and 33, in BOTH schemes, and the two stacks land verbatim as:
 *
 *   const DARK_GROUNDS: string[][] = [
 *     DARK_BG,
 *     ...stops(GLASS_TIER.dark.card, DARK_BG),
 *     ...stops(GLASS_TIER.dark.nestedCard, [GLASS_TIER.dark.card.gradient[1], ...DARK_BG]),
 *     ...stops(GLASS_TIER.dark.sheet, DARK_BG),
 *     ...stops(GLASS_TIER.dark.recessed, [GLASS_TIER.dark.sheet.gradient[0], ...DARK_BG]),
 *   ]
 *   const LIGHT_GROUNDS: string[][] = [
 *     LIGHT_BG,
 *     ...stops(GLASS_TIER.light.card),
 *     ...stops(GLASS_TIER.light.nestedCard, [GLASS_TIER.light.card.gradient[1]]),
 *     ...stops(GLASS_TIER.light.sheet),
 *     ...stops(GLASS_TIER.light.recessed, [GLASS_TIER.light.sheet.gradient[0]]),
 *   ]
 *
 * THREE ASYMMETRIES THAT ARE NOT TYPOS, copied exactly from the phone:
 *  - `nestedCard` sits on `card`'s LOWER stop (`gradient[1]`);
 *  - `recessed` sits on `sheet`'s UPPER stop (`gradient[0]`);
 *  - the light stacks omit the background, because light's tiers are opaque.
 * And a fourth: `header` and `elevated` are in NEITHER stack. Nothing in the phone's contract
 * measures text on those two tiers. Adding them would be an EXTENSION of the contract, not a
 * port — U1.4 puts wizard titles on `header`, so someone has to decide it; see the U0.5 report.
 *
 * `flattenOver`'s last ground is treated as OPAQUE, so both stacks must bottom out at
 * `background` and never at a glass stop.
 */

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

  // Rows 4/5. Phone `:181-200`.
  it.todo(
    'rows 4-5 (U1.1): clears AA for the muted text ramp on every glass tier, both themes — needs GLASS_TIER',
  )

  // Row 8. Phone `:201-208` holds BOTH themes to the DARK number 3.79 and records ~0.08 of
  // unasserted light slack as DEF-063's open owner question. The plan's U0.5 row closes that
  // gap on the demo side: pin light at its OWN 3.87 (DEF-063), dark at 3.79 (M2b). Raising
  // either is fine; dropping either is the regression. Both are CEILINGS under D5, not targets
  // — a port that "fixes" them diverges from the phone.
  it.todo(
    'row 8 (U1.1): holds the documented textTertiary ceilings — dark >= 3.79, light >= 3.87 — needs GLASS_TIER',
  )

  // Row 10, DEF-UI-018 — the port's single highest-value contrast row (A66/A27). Phone `:209-224`.
  it.todo(
    'row 10 (U1.1): clears AA for `link`, the accent-as-text token, on every glass tier, both themes — needs GLASS_TIER',
  )

  it('clears AA for the primary CTA label on BOTH stops of its gradient (rows 12-13, dark)', () => {
    // Phone `:225-244`, dark half. On a blue gradient the two candidate label colours move in
    // OPPOSITE directions, so there is no stop where both clear 4.5:1 and the pair cannot be
    // tuned independently. The demo's old dark recipe `['#35A0D6','#2580AD']` measured 3.34
    // with `textInverse` and 2.94 with `onPrimary`; U0.3 re-based it to 5.80 / 8.32.
    //
    // Read off GLASS, never retyped: these two stops ARE the demo's `PrimaryButtonGradient.dark`
    // (`glass-tokens.ts:34-35`, kept as module consts because the drift guard's anchors 7/8
    // read them by name). Measured on the FLAT stop, not on a ground stack — a CTA fill is
    // opaque.
    expect(
      (
        [
          ['dark upper', palette.dark.onPrimary, GLASS.accentFrom],
          ['dark lower', palette.dark.onPrimary, GLASS.accentTo],
        ] as [string, string, string][]
      )
        .map(([name, fg, bg]) => ({ name, ratio: round(contrast(fg, [bg])) }))
        .filter(({ ratio }) => ratio < AA_TEXT),
    ).toEqual([])
  })

  // Rows 12-13, light half. `PrimaryButtonGradient.light = ['#2563eb', '#1d3584']`
  // (phone `Colors.ts:471-474`) has NO demo counterpart and NO owning package: U0.3 re-based
  // the dark pair only, and the plan never assigns the light pair to anyone. Typing the two
  // hexes in here instead would be the exact anti-pattern the deep-import rule forbids. See
  // the U0.5 report's deferral proposal.
  it.todo(
    'rows 12-13 (UNOWNED, proposed U2.2): clears AA for the LIGHT primary CTA label on both stops — needs PrimaryButtonGradient.light',
  )

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

  // Row 21, phone `:265-274`. The ratios above are only true of the SHIPPED UI if the shared
  // danger recipe actually points at those two tokens, and nothing asserts that link. The
  // phone's `SwipeDeleteAction.test.tsx` compared the rendered value against `DangerFill`
  // ITSELF, so it moved with the constant and could not fail on it: mutating `DangerFill` back
  // to the flat failing pair left that suite 32/32 green. PIN THE RATIO AT THE CONSTANT —
  // `expect(DangerFill.light).toBe(palette.light.errorDark)` and the dark mirror — or the
  // tautology just moves up one level.
  it.todo(
    'row 21 (U2.2): maps DangerFill to errorLight (dark) / errorDark (light), at the constant — needs DangerFill',
  )

  // Rows 22-25. Phone `:277-304`, over a per-scheme `barGrounds(scheme)` = both `card` stops
  // plus both `sheet` stops. Needs `warningAccent` (`#ffc62b` dark / `#b45309` light, phone
  // `Colors.ts:180`/`:77`), which is U3.1's — `palette.ts` carries `warningDark` today, and
  // they are NOT the same token even where dark shares a value.
  it.todo(
    'rows 22-25 (U1.1 + U3.1): clears the 1.4.11 non-text floor for the four status accents, both themes — needs GLASS_TIER + warningAccent',
  )

  // Row 31. Phone `:305-342`. Two channels, because only one is available in each theme: light
  // separates on the FILL, dark cannot (dark `textTertiary` sits exactly on its 3.79 floor on
  // this tier, so there is no headroom to lift the fill) and separates on the BORDER instead.
  // Either channel failing is the regression, so both are asserted in both themes at the level
  // each can actually reach: border ratio >= 1.25 both themes, light fill >= 1.05.
  it.todo(
    'row 31 (U1.1): keeps the nested tier visually separable from the card it sits on — needs GLASS_TIER',
  )

  // Row 33. Phone `:343-376` — the ONLY dE-bounded block in the whole file, and the only one
  // that is TWO-SIDED (`.filter(({ dE }) => dE < 3 || dE > 12)`). Too flat and too deep are
  // both bugs. PER STOP, never `Math.max` of them: taking the max meant the lower bound only
  // fired when BOTH stops went flat, so an alpha edit touching one stop left the healthy one
  // reading and passed while the gradient visually went from a well at one end to nothing at
  // the other. Row 31's 1.25 bound is a CONTRAST bound, not dE — the two need different
  // helpers and the plan's §9 clause 2 blurs them.
  it.todo(
    'row 33 (U1.1): keeps the recessed well a well — CIE76 dE 3..12, two-sided, PER STOP — needs GLASS_TIER',
  )

  // Row 30, phone `:377-388`. The other half of the DEF-UI-017 bar: a palette that clears 3:1
  // by collapsing to one colour passes the number and fails the user. `warningOnLight` clears
  // easily and is `#f0f4f8` in dark, so reassigning `started` to it would make three of the
  // four the same near-white. Needs `warningAccent` (U3.1).
  it.todo(
    'row 30 (U3.1): keeps the four status accents four distinguishable hues — needs warningAccent',
  )
})

describe('scrim opacity', () => {
  // Row 34, phone `:389-408`. The dark scrim shipped at 0.9 alpha, which blacked the app out
  // behind an open sheet instead of dimming it; 0.32 matches the common dim across the
  // platforms surveyed. Light has always been 0.5 and reads correctly.
  //
  // `colors.scrim` does not exist in the demo yet — matrix A22, U4.4's row ("the scrim
  // family"). The demo currently carries THREE competing darknesses (`T.scrim`
  // `rgba(4,8,14,0.55)` plus a 0.66 and a 0.72), which is what U4.4 collapses. When it lands,
  // the pin is `alphaOf(palette.dark.scrim) === 0.32` and `alphaOf(palette.light.scrim) === 0.5`
  // with `alphaOf = (rgba: string) => Number(rgba.match(/([\d.]+)\s*\)$/)![1])`.
  it.todo(
    'row 34 (U4.4): dims the app behind a sheet without blacking it out, in both themes — needs colors.scrim',
  )

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
  it.todo(
    'rows 36-37 (U4.4): keeps the fullscreen media close glyph legible over the brightest still — needs MEDIA_CLOSE_CHIP',
  )

  // Rows 38-40, phone `:430-464`. DEF-UI-005: both preview modals lay their loading plate over
  // the viewer's own chrome, so `PDF_VIEWER_CHROME` is the real ground, not the app background.
  // The spinner is the only cue the preview is still working, and the LABEL can pass while it
  // does not — which is exactly what happened at 0.32 (label 8.59, spinner 2.54). Row 40 is the
  // value pin `PDF_LOADING_SCRIM === 'rgba(0, 40, 83, 0.9)'`, which is what stops a future
  // "resync" from silently pointing it back at `scrim`.
  it.todo(
    'rows 38-40 (U4.4): keeps the PDF preview spinner (>= 3.0) and label (>= 4.5) legible on the viewer chrome, and pins PDF_LOADING_SCRIM — needs PDF_LOADING_SCRIM + PDF_VIEWER_CHROME',
  )
})

describe('map chrome contrast floors', () => {
  // Rows 41-45 are NEW in this port — the phone has none, and U5 is the only phase that would
  // otherwise ship with no contrast target at all (matrix §C.1). Grounds: `surfaceBg`
  // `rgba(0,40,83,0.82)` composited over a satellite tile, so every row measures against BOTH
  // a bright and a dark tile. All five are U5.2's, whose row rewrites `MapControls.tsx` whole.
  //
  // Row 41 is the one with a ruling already attached: the filter-count badge renders a NUMERAL,
  // so C.3 rule 2's "non-text marks" carve-out does not cover it and the 4.5 text floor
  // applies. `#ffffff` on `primary #2B8CC1` is 3.73 and FAILS; on `primaryDark #1F6B99` it is
  // 5.80 and passes. D5's amendment takes `primaryDark` as the badge fill (A19's rider) — this
  // is explicitly NOT one of the inherited ceilings.
  it.todo(
    'row 41 (U5.2): clears AA for the filter-count badge numeral on primaryDark, over both tiles — needs the map badge fill',
  )

  // Rows 42-44: search field text (`colors.text`, >= 4.5), its placeholder
  // (`colors.textTertiary`, >= 3.79 — the M2b ceiling, NOT 4.5), and the proximity chip text
  // (`colors.text`, >= 4.5). The placeholder's relief is a ceiling on `card`/`sheet`, not a
  // licence over tiles: if it lands below 3.79 the placeholder takes `textSecondary` instead.
  it.todo(
    'rows 42-44 (U5.2): clears the search text, placeholder and proximity chip floors on surfaceBg over a bright tile — needs the U5.2 chrome',
  )

  // Row 45: `MapFiltersSheet` section labels, `12/700 textSecondary` on the `sheet` tier —
  // inherits row 5's bound, on a surface U5.3 creates.
  it.todo(
    'row 45 (U5.2): clears AA for MapFiltersSheet section labels on the sheet tier — needs GLASS_TIER + MapFiltersSheet',
  )
})
