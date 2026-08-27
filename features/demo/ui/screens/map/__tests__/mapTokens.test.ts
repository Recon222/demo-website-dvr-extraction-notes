import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, it, expect } from 'vitest'

import {
  CAMERA_MARKER,
  CLUSTER_COLORS,
  MAP_GLASS_COLORS,
  MAP_GLASS_SCHEMES,
  MAP_PIN_COLORS,
  MAP_SURFACE_COLORS,
  PROXIMITY_COLORS,
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

/**
 * ONE record's body, `export const <NAME> = {` .. `} as const`.
 *
 * Scoping is not tidiness — it is MUTATION PROBE P1, which SURVIVED without it. This module
 * declares `text: colors.text` TWICE (`MAP_GLASS_COLORS` and `SHEET_COLORS`), so a file-wide
 * `\btext\s*:\s*colors\.text\b` matched the OTHER record and stayed green while the one under
 * test was de-aliased back to `'#f0f4f8'` — the exact false-alias failure the structural pin
 * exists to catch, reproduced by the pin itself. Six of the eight aliased keys collide this way.
 *
 * Throws rather than falling back to the whole file: a marker that misses must red, not widen
 * (the lesson `check-rn-parity.mjs:137-144` records for its own `before`).
 */
const recordBody = (src: string, name: string): string => {
  const start = src.indexOf(`export const ${name} = {`)
  if (start === -1) throw new Error(`record not found: ${name}`)
  const end = src.indexOf('} as const', start)
  if (end === -1) throw new Error(`record end not found: ${name}`)
  return src.slice(start, end)
}

/** `key: colors.<token>` — the alias spelled in a VALUE position, not merely a matching string. */
const aliasesPaletteToken = (src: string, record: string, key: string, token: string): boolean =>
  new RegExp(`\\b${key}\\s*:\\s*colors\\.${token}\\b`).test(recordBody(src, record))

describe('recordBody — the slicer every structural pin below goes through', () => {
  it('addresses ONE record, and throws rather than widening', () => {
    // MUTATION PROBE P1's fix, pinned. Without the scope the alias checks matched a
    // same-named key in a DIFFERENT record and survived a real de-alias (exit 0).
    const src = source()
    const glass = recordBody(src, 'MAP_GLASS_COLORS')
    const sheet = recordBody(src, 'SHEET_COLORS')
    expect(glass, 'the glass record must not swallow the sheet record').not.toContain('backgroundGradient')
    expect(sheet).toContain('backgroundGradient')
    // Both declare `text:`, which is the collision that made the unscoped scan unfalsifiable.
    expect(glass).toContain('text:')
    expect(sheet).toContain('text:')
    expect(() => recordBody(src, 'NO_SUCH_RECORD')).toThrow(/record not found/)
  })
})

describe('MAP_GLASS_COLORS (A83, D5 — the floating map chrome)', () => {
  it('aliases every shared key to the palette rather than re-typing its hex', () => {
    const src = source()
    const ALIASES = {
      text: 'text',
      textSecondary: 'textSecondary',
      textTertiary: 'textTertiary',
      primary: 'primary',
      // NOT the filters glyph — that is `textPrimary` on the phone (`MapControls.tsx:177`), and
      // the two-state rule the plan attributed to it was the deleted Clear pill's. Kept as an
      // alias for U5.4's `CaseMapPicker` accent (matrix row 18); see the key's docblock.
      primaryLight: 'primaryLight',
    } as const
    for (const [key, token] of Object.entries(ALIASES)) {
      expect(MAP_GLASS_COLORS[key as keyof typeof ALIASES], `${key} value`).toBe(colors[token])
      expect(
        aliasesPaletteToken(src, 'MAP_GLASS_COLORS', key, token),
        `${key} must READ colors.${token} inside MAP_GLASS_COLORS, not re-type its hex`,
      ).toBe(true)
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

  it('DELETED clearActiveBg with the Clear pill that read it', () => {
    // U5.1 shipped it derived and said so: *"U5.2 deletes this key's one reader with the Clear
    // pill"* — and the phone's collapsed chrome has no active-filter wash at all, because the
    // active state is now the badge on the filters button. An unread token in a module whose
    // own docblock refuses to carry the phone's five unread `MAP_SURFACE_COLORS` keys would be
    // the same defect on the other side of the file.
    expect(MAP_GLASS_COLORS).not.toHaveProperty('clearActiveBg')
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
    const src = source()
    for (const [key, token] of [
      ['text', 'text'],
      ['textDim', 'textSecondary'],
      // A19's binding rider. This key's ONE reader is `MapCanvas`'s retry button, a FILLED
      // control, so it pairs with the DEEP shade: `onPrimary` on `primary` measures 3.73,
      // on `primaryDark` 5.80. It was `#1a8fc2` — an accent on no ramp in the palette.
      ['accent', 'primaryDark'],
    ] as const) {
      expect(
        aliasesPaletteToken(src, 'SHEET_COLORS', key, token),
        `${key} must READ colors.${token} inside SHEET_COLORS`,
      ).toBe(true)
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

  it('carries no surface projection keys — the fragments are the recipe (U5.4)', () => {
    // U5.1's R2 refuted matrix A84's "`rowBg`/`rowBorder` -> nestedCard" and held the ruling
    // here as three projection keys so U5.4 could paint from them. U5.4 adopted the FRAGMENTS
    // instead (`glassCard` on the row, `glassCardNested` on the info cards), which is what
    // "the same recipe `Card.tsx` paints" (phone `LocationRow.tsx:5-7`) means on the web and
    // which carries the lit edge and the tier inset a flat colour key cannot.
    //
    // This pin is the ANTI-REGROWTH half: re-adding a surface key here is how the map island
    // grew its own parallel tier vocabulary the first time. The tier ruling itself is pinned
    // where it renders — `LocationRow.test.tsx` ("draws four sides on the card tier") and
    // `LocationDetailCard.test.tsx` ("paints every info card on the nested tier"), the latter
    // asserting the two tiers do not collapse into one another.
    for (const key of ['rowBg', 'rowBorder', 'infoBg', 'textFaint']) {
      expect(SHEET_COLORS, `SHEET_COLORS.${key} has no reader`).not.toHaveProperty(key)
    }
    // Positive control: the keys that DO have readers are still here, so an empty record or a
    // renamed export cannot pass this as a clean read.
    for (const key of ['backgroundGradient', 'border', 'handle', 'divider', 'text', 'textDim', 'accent']) {
      expect(SHEET_COLORS).toHaveProperty(key)
    }
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

describe('the marks painted ONTO the tiles — theme-invariant, and still the phone’s values', () => {
  it('derives the proximity fills FROM the accent instead of hand-writing their rgba', () => {
    // Phone `constants/index.ts:77-84`, whose docblock states the bug this closes: "hand-written
    // rgba drifted the moment `PIN_COLORS.working` moved off the old #00BFFF". The demo held
    // three literals and a comment ASSERTING the identity; now the identity is the code.
    expect(PROXIMITY_COLORS.accent).toBe(MAP_PIN_COLORS.working)
    expect(PROXIMITY_COLORS.fillLight).toBe(withAlpha(MAP_PIN_COLORS.working, 0.15))
    expect(PROXIMITY_COLORS.fillMedium).toBe(withAlpha(MAP_PIN_COLORS.working, 0.2))
    // STRUCTURAL, and here it is the only pin that means anything: the three literals the
    // demo shipped ALREADY equalled these values, so the three value assertions above passed
    // over the un-derived code (measured — they were green before the edit landed). What
    // changes is whether they still hold after `MAP_PIN_COLORS.working` moves.
    const body = recordBody(source(), 'PROXIMITY_COLORS')
    for (const [key, call] of [
      ['accent', 'MAP_PIN_COLORS\\.working'],
      ['fillLight', 'withAlpha\\(MAP_PIN_COLORS\\.working, 0\\.15\\)'],
      ['fillMedium', 'withAlpha\\(MAP_PIN_COLORS\\.working, 0\\.2\\)'],
    ] as const) {
      expect(new RegExp(`\\b${key}\\s*:\\s*${call}`).test(body), `${key} must DERIVE from the pin colour`).toBe(true)
    }
  })

  it('re-bases the cluster bubble onto the badge-blue ground at the phone opacity', () => {
    // Phone `CLUSTER_CIRCLE_STYLE` (`constants/index.ts:222-223`) — `circleColor:
    // Colors.dark.background`, `circleOpacity: 0.65`. The demo composes the two into one CSS
    // value, and it was still composing them from the RETIRED navy.
    //
    // `palette.dark`, not `colors`, and that is the point: this is a mark painted onto satellite
    // tiles, which never follow a theme, so it must NOT move when the scheme flips. The phone
    // anchors it on `Colors.dark` for the same reason (`:55-56`).
    expect(CLUSTER_COLORS.circle).toBe(withAlpha(palette.dark.background, 0.65))
  })

  it('stops hand-copying the callout chrome and reads the map surfaces', () => {
    // Phone `CAMERA_MARKER` `:133`/`:135` are literally `MAP_SURFACE_COLORS.controlsBg` and
    // `.borderStrong`. The demo asserted both in a DOCBLOCK and then re-typed the old navy —
    // the exact shape `tokens/__tests__/palette.test.ts`'s alias pins exist to catch.
    expect(CAMERA_MARKER.calloutBg).toBe(MAP_SURFACE_COLORS.controlsBg)
    expect(CAMERA_MARKER.calloutBorder).toBe(MAP_SURFACE_COLORS.borderStrong)
    // `:131` — the white base's border. Was the retired navy at the same 55%.
    expect(CAMERA_MARKER.baseBorder).toBe(withAlpha(palette.dark.background, 0.55))
    // Frozen by the plan's U5.1 row and by the phone: a monochrome camera on a white base is
    // what sets it apart from the coloured status pins (`constants/index.ts:125-129`).
    expect(CAMERA_MARKER.glyphColor).toBe('#111111')
    expect(CAMERA_MARKER.baseColor).toBe('#ffffff')
  })
})

describe('the retired ramp is gone from the map island, in rgb() form too', () => {
  /**
   * U5.1's closing scan. `tokens/__tests__/palette.test.ts`'s `RETIRED` sweep is HEX-ONLY, and
   * the map island's entire surviving drift was spelled in `rgba()`, where no hex sweep could
   * see it. Measured under `ui/` at this commit, the retired ramp still survives at ~24
   * `rgba()` occurrences across 15 files owned by U6, U7 and U8 — so widening `RETIRED`
   * repo-wide would redden files this package must not open. The ban is therefore scoped to
   * the ONE file U5.1 owns, and the repo-wide widening is PROPOSED as a deferral with U5.4 as
   * its trigger (U5.4 removes the last such occurrences from `screens/map/`).
   *
   * Whitespace-stripped and lower-cased on both sides, per §4.7: the demo mixes `rgba(19,34,54,`
   * and `rgba(19, 34, 54,` for one colour, and a spacing-sensitive sweep passes over live drift.
   */
  const RETIRED_IN_RGB: ReadonlyArray<[name: string, form: string]> = [
    ['the retired background navy', 'rgba(13, 27, 42,'],
    ['the retired background navy, opaque', 'rgb(13, 27, 42)'],
    ['the retired border navy', 'rgba(30, 58, 95,'],
    ['the retired raised navy', 'rgba(19, 34, 54,'],
    ['the hand-rolled sheet ground', 'rgb(10, 22, 36)'],
    // The two split-brain sheet text tones, which had no owner in either palette half.
    ['the second "primary text" white', '#e7eef6'],
    ['the second "secondary text" blue', '#9fb6d0'],
    // The sheet accent that sat on no ramp at all.
    ['the off-ramp sheet accent', '#1a8fc2'],
  ]
  const norm = (s: string): string => s.toLowerCase().replace(/\s+/g, '')

  it('carries none of them, in code OR in a comment', () => {
    // Deliberately NOT comment-stripped, unlike `source()` above: `palette.test.ts`'s own
    // sweep reads raw text, and a retired value quoted in a comment is exactly how a later
    // reader reintroduces it. (This landed as a real red during slice 1.)
    const text = norm(readFileSync(MAP_TOKENS_SRC, 'utf8'))
    const offenders = RETIRED_IN_RGB.filter(([, form]) => text.includes(norm(form))).map(
      ([name, form]) => `${name} (${form})`,
    )
    expect(offenders, `mapTokens.ts still carries:\n${offenders.join('\n')}`).toEqual([])
  })

  it('is a scan that can actually fail (positive control)', () => {
    // Without this the case above is indistinguishable from a scan reading an empty string:
    // a `readFileSync` of a moved path, a `norm` that lower-cases into a mismatch, a typo in
    // every entry. It proves the mechanism, on the real file, on every box.
    const text = norm(readFileSync(MAP_TOKENS_SRC, 'utf8'))
    expect(text).toContain(norm('rgba(0, 40, 83, 0.82)'))
    expect(text.length).toBeGreaterThan(1000)
  })
})

