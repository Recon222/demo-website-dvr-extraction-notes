import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import { GLASS, glassCardNested } from '@/features/demo/ui/glass-tokens'
import {
  MAP_GLASS_COLORS,
  MAP_GLASS_SCHEMES,
  MAP_SURFACE_COLORS,
  SHEET_COLORS,
} from '@/features/demo/ui/screens/map/mapTokens'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, palette, scheme } from '@/features/demo/ui/tokens/palette'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * U5.1 — the map token island joins the token system.
 *
 * `screens/map/mapTokens.ts` was the single largest surviving pre-campaign island: 152 lines,
 * zero `palette` references, byte-unchanged since before U0. Every colour it holds is now one
 * of three things, and this file is what keeps it that way:
 *
 *   1. an ALIAS of `tokens/palette.ts` / `tokens/glass-tiers.ts` / `glass-tokens.ts`,
 *   2. a map-domain literal transcribed from the phone's
 *      `src/features/location/map-view/constants/index.ts` with its `file:line`, whose
 *      DERIVATION from a palette token is pinned here and whose VALUE is pinned by the drift
 *      guard's map anchors (U5.1's closing act), or
 *   3. a deliberately theme-invariant mark painted ONTO satellite tiles (`MAP_PIN_COLORS`,
 *      `CAMERA_MARKER`'s glyph/base), which the phone itself anchors on `Colors.dark`.
 *
 * ## Why every alias is pinned TWICE — value AND source text
 *
 * `tokens/__tests__/palette.test.ts`'s review r1 F5 measured it: `toBe(colors[key])` compares
 * two STRINGS, so it cannot tell an alias from a re-typed literal. The five palette hexes this
 * module aliases (`#f0f4f8`, `#99badd`, `#7a9fc4`, `#2B8CC1`, `#4BA3D4`) are exactly the
 * high-frequency unchanged values U0.5 left deliberately UNBANNED — so a de-alias back to a
 * literal would pass a pure value pin and pass the banned-literal scan. The structural pin is
 * the only thing that catches it, and it is the repo's sanctioned idiom for that case.
 */

const MAP_TOKENS_SRC = join(
  process.cwd(),
  'features',
  'demo',
  'ui',
  'screens',
  'map',
  'mapTokens.ts',
)

/** Line comments stripped, exactly as `palette.test.ts` does: a leftover `// was text: '#e7eef6'` above a re-typed literal otherwise satisfies the alias regex. */
const source = (): string => readFileSync(MAP_TOKENS_SRC, 'utf8').replace(/\/\/[^\n]*/g, '')

/** `key: colors.<token>` — the alias spelled in a VALUE position, not merely a matching string. */
const aliasesPaletteToken = (src: string, key: string, token: string): boolean =>
  new RegExp(`\\b${key}\\s*:\\s*colors\\.${token}\\b`).test(src)

describe('MAP_GLASS_COLORS (A83, D5 — the floating map chrome)', () => {
  it('aliases every shared key to the palette rather than re-typing its hex', () => {
    const src = source()
    const ALIASES = {
      text: 'text',
      textSecondary: 'textSecondary',
      textTertiary: 'textTertiary',
      primary: 'primary',
      // U5.2's filters glyph is this key's ONLY reader, and the plan keeps the key alive as an
      // alias so `primaryLight` has ONE owner (`tokens/palette.ts`) and U0.4's `primaryLight`
      // anchor has ONE web-side read.
      primaryLight: 'primaryLight',
    } as const
    for (const [key, token] of Object.entries(ALIASES)) {
      expect(MAP_GLASS_COLORS[key as keyof typeof ALIASES], `${key} value`).toBe(colors[token])
      expect(aliasesPaletteToken(src, key, token), `${key} must READ colors.${token}, not re-type its hex`).toBe(true)
    }
  })

  it('derives the dark container fill from the background token at the phone alpha (0.82)', () => {
    // Phone `constants/index.ts:257` — `containerBgDark: 'rgba(0, 40, 83, 0.82)'`, i.e.
    // `Colors.dark.background` at 82%. Was `rgba(13, 27, 42, 0.65)`: the retired navy at the
    // pre-redesign alpha, two drifts in one value.
    expect(MAP_GLASS_SCHEMES.dark.containerBg).toBe(withAlpha(palette.dark.background, 0.82))
    expect(MAP_GLASS_COLORS.containerBg).toBe(MAP_GLASS_SCHEMES.dark.containerBg)
  })

  it('ships the LIGHT half the phone ships (D2 — nothing hard-codes a dark value with a light sibling)', () => {
    // Phone `constants/index.ts:267` — white at 92%, near-opaque on purpose: 60% white over
    // busy satellite imagery washed out to illegibility, and that was the redesign trigger.
    expect(MAP_GLASS_SCHEMES.light.containerBg).toBe(withAlpha(palette.light.background, 0.92))
    // The two halves must not read as one — the stuck-reader failure the drift guard also checks.
    expect(MAP_GLASS_SCHEMES.light.containerBg).not.toBe(MAP_GLASS_SCHEMES.dark.containerBg)
    expect(MAP_GLASS_SCHEMES.light.border).not.toBe(MAP_GLASS_SCHEMES.dark.border)
  })

  it('derives the dark border from the border token at the phone alpha (0.45)', () => {
    // Phone `constants/index.ts:269`. Was `rgba(30, 58, 95, 0.35)` — the retired `#1e3a5f`.
    expect(MAP_GLASS_SCHEMES.dark.border).toBe(withAlpha(palette.dark.border, 0.45))
    // Phone `constants/index.ts:271` — slate-500 at 35%. It has NO light-palette owner
    // (`palette.light.border` is `#e5e7eb`), so it is a transcribed literal, byte-pinned here
    // and value-pinned by the guard's `mapGlass.border.light` anchor.
    expect(MAP_GLASS_SCHEMES.light.border).toBe('rgba(100, 116, 139, 0.35)')
  })

  it('DELETED inputBg — the new chrome paints every surface with one fill', () => {
    // Phone `6e10eea3` deleted `inputBgDark`/`inputBgLight` outright; the demo's four readers
    // in `MapControls` now take `containerBg`. A key that comes back is a second surface.
    expect(MAP_GLASS_COLORS).not.toHaveProperty('inputBg')
  })

  it('derives the active-filter wash from `primary` instead of hand-writing its rgba', () => {
    expect(MAP_GLASS_COLORS.clearActiveBg).toBe(withAlpha(colors.primary, 0.2))
  })

  it('keeps the shadow at the phone value, in both modes', () => {
    // Phone `constants/index.ts:273` — one shadow for both schemes, so it is deliberately NOT
    // a two-half key and the guard anchors it as scheme-invariant.
    expect(MAP_GLASS_COLORS.shadow).toBe('rgba(0, 0, 0, 0.35)')
  })
})

describe('SHEET_COLORS (A84 — the map bottom sheet)', () => {
  it('kills the split-brain: ONE primary text tone across the whole map', () => {
    // demo §1.3 named it: `SHEET_COLORS.text #e7eef6` coexisted with
    // `MAP_GLASS_COLORS.text #f0f4f8`, two "primary text" whites 4 units apart, in one feature.
    expect(SHEET_COLORS.text).toBe(colors.text)
    expect(SHEET_COLORS.text).toBe(MAP_GLASS_COLORS.text)
    expect(SHEET_COLORS.textDim).toBe(colors.textSecondary)
    expect(SHEET_COLORS.textFaint).toBe(colors.textTertiary)
    const src = source()
    for (const [key, token] of [
      ['text', 'text'],
      ['textDim', 'textSecondary'],
      ['textFaint', 'textTertiary'],
      // A19's binding rider. This key's ONE reader is `MapCanvas`'s retry button, a FILLED
      // control, so it pairs with the DEEP shade: `onPrimary` on `primary` measures 3.73,
      // on `primaryDark` 5.80. It was `#1a8fc2` — an accent on no ramp in the palette.
      ['accent', 'primaryDark'],
    ] as const) {
      expect(aliasesPaletteToken(src, key, token), `${key} must READ colors.${token}`).toBe(true)
    }
  })

  it('takes the sheet ground the phone actually ships — three opaque stops, NOT the sheet glass tier', () => {
    // REFUTES plan §5's U5.1 row and matrix A84, both of which say `background -> sheet
    // gradient (A38)`. The phone declares the opposite IN SOURCE, twice:
    //   `constants/index.ts:339-343` — "Fully opaque (alpha 1.0) on purpose, in BOTH themes …
    //   opaque lets the compositor occlude the map region behind the sheet. This is why the
    //   sheet does NOT use `GlassColors[scheme].sheet`, whose dark gradient starts at 0.98."
    //   `README.md:407` restates it as the opaque-sheet performance rule.
    // The demo's sheet translates over a live mapbox-gl canvas for the same reason, so the
    // ruling ports as-is: `[background, backgroundSecondary, background]` at [0, .5, 1].
    expect(SHEET_COLORS.backgroundGradient).toBe(
      `linear-gradient(180deg,${colors.background} 0%,${colors.backgroundSecondary} 50%,${colors.background} 100%)`,
    )
    // The `sheet` tier's own top stop is 0.98 — translucent, and the value A84 would have had
    // us paint. A pin, not a comment: if someone "fixes" this toward A84 it must red.
    expect(SHEET_COLORS.backgroundGradient).not.toContain(GLASS_TIER[scheme].sheet.gradient[0])
    // The old flat key is gone: `rgb(10, 22, 36)` was a hand-rolled navy on no ramp at all.
    expect(SHEET_COLORS).not.toHaveProperty('background')
  })

  it('sources its chrome from the sheet tier and the border token', () => {
    // Phone `MapBottomSheet.tsx:208` — `borderTopColor: GlassColors[colorScheme].sheet.border`.
    expect(SHEET_COLORS.border).toBe(GLASS_TIER[scheme].sheet.border)
    // Phone `MapBottomSheet.tsx:215` — `withAlpha(colors.border, 0.5)`.
    expect(SHEET_COLORS.divider).toBe(withAlpha(colors.border, 0.5))
    // Phone `SheetHandle.tsx:69` — `withAlpha(colors.text, 0.2)`. Was a bare white at 20%,
    // which is a different colour: the handle now tracks the text ramp, as the phone's does.
    expect(SHEET_COLORS.handle).toBe(withAlpha(colors.text, 0.2))
  })

  it('paints sheet rows on the CARD tier and info cards on the NESTED tier', () => {
    // REFUTES matrix A84's "`rowBg`/`rowBorder` -> nestedCard (A33/A34)". The phone's
    // `LocationRow.tsx:70` reads `GlassColors[colorScheme].card` — its docblock at `:5` says
    // "Renders as a glass card: `GlassColors[scheme].card` gradient" — and matrix row 18
    // ("Phone rebuilt it on `GlassColors[scheme].card`") agrees with the phone against A84.
    // The nested tier belongs to `LocationDetailCard`'s four info cards, which the phone moved
    // to `<Card glass glassVariant="nestedCard">`; that is where A84's reference belongs.
    expect(SHEET_COLORS.rowBg).toBe(GLASS.gradientCard)
    expect(SHEET_COLORS.rowBorder).toBe(GLASS_TIER[scheme].card.border)
    expect(SHEET_COLORS.infoBg).toBe(glassCardNested.background)
    // The two tiers must not collapse into one — that is what makes a row read as sitting on
    // the sheet and an info card as sitting IN the row.
    expect(SHEET_COLORS.rowBg).not.toBe(SHEET_COLORS.infoBg)
  })
})

describe('MAP_SURFACE_COLORS (map-domain, always dark by the phone’s own ruling)', () => {
  it('re-bases every overlay surface onto the badge-blue background', () => {
    // Phone `constants/index.ts:98` / `:94` / `:104`. The demo carried `rgba(13, 27, 42, 0.85)`
    // — the retired navy — for `overlayMedium`, and had no web-side key at all for the other
    // two, which `CAMERA_MARKER` then re-typed by hand.
    expect(MAP_SURFACE_COLORS.overlayMedium).toBe(withAlpha(colors.background, 0.85))
    expect(MAP_SURFACE_COLORS.controlsBg).toBe(withAlpha(colors.background, 0.95))
    expect(MAP_SURFACE_COLORS.borderStrong).toBe(withAlpha(colors.border, 0.6))
  })
})

