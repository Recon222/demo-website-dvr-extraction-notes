import { describe, it, expect } from 'vitest'
import type { CSSProperties } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import {
  SCRIM_FADE_KEYFRAME,
  SHEET_ENTER_MS,
  SHEET_EXIT_MS,
  SHEET_SHADOW,
  SHEET_SLIDE_KEYFRAME,
  sheetAccentDot,
  sheetAccentStrip,
  sheetBody,
  sheetBodyFill,
  sheetFooter,
  sheetHandle,
  sheetHandleZone,
  sheetHeaderBand,
  sheetHeaderTitleRow,
  sheetScrim,
  sheetSubtitle,
  sheetSurface,
  sheetTitle,
} from '@/features/demo/ui/controls/sheet-chrome'
import { glassHeaderBar } from '@/features/demo/ui/controls/header-chrome'
import { ExportActionSheet } from '@/features/demo/ui/screens/ExportActionSheet'
import { MapBottomSheet } from '@/features/demo/ui/screens/map/MapBottomSheet'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'
import { GLASS_TIER } from '@/features/demo/ui/tokens/glass-tiers'
import { colors, scheme } from '@/features/demo/ui/tokens/palette'
import { radius, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * SEAM(U4.1) — matrix A38 / A46 / A58.
 *
 * Every colour expectation composes its right-hand side from `GLASS_TIER[scheme]` or
 * `colors`, never from a retyped literal, for the reason U1.4's file states: a pin that
 * restates the production string is green through exactly the edit it exists to catch. What
 * these assert is the RELATIONSHIP — that the sheet surface reads the `sheet` tier and the
 * header band reads the `header` tier, of the CONSUMED scheme.
 *
 * The two non-relational pins are deliberate: `SHEET_SHADOW` and the geometry numbers are
 * lifted values with no token to derive from, so they are spelled out with their phone
 * `file:line` and are change-detectors on purpose.
 */

const sheet = GLASS_TIER[scheme].sheet
/** What the lit edge reads back as once jsdom has normalised it. */
const LIT = 'rgba(184, 212, 240, 0.14)'
const header = GLASS_TIER[scheme].header

/** `toHaveStyle` is typed for `Record<string, unknown>`; `CSSProperties` has no index signature. */
function decl(fragment: CSSProperties): Record<string, unknown> {
  return { ...fragment }
}

/**
 * The four border colours as the DOM resolved them.
 *
 * Per-side on purpose: jsdom does NOT synthesize the `border-color` shorthand back from four
 * longhands, so `el.style.borderColor` reads `''` over this fragment — a pin written against the
 * shorthand would assert over an empty declaration and stay green after the tint is deleted
 * (plan §4.2's trap). Verified by the negative assertion in the first-paint cell below.
 * U4.2/U4.3 should read their adopted surfaces the same way.
 */
function sides(el: HTMLElement) {
  return {
    top: el.style.borderTopColor,
    right: el.style.borderRightColor,
    bottom: el.style.borderBottomColor,
    left: el.style.borderLeftColor,
  }
}

/** Render a fragment onto a div and read back what the DOM actually resolved. */
function paint(style: CSSProperties): HTMLElement {
  const { container } = render(<div data-paint style={style} />)
  return container.querySelector<HTMLElement>('[data-paint]')!
}

describe('sheetSurface — the A38 ground', () => {
  it('paints the sheet tier of the CONSUMED scheme, both stops, top to bottom', () => {
    expect(sheetSurface.background).toBe(
      `linear-gradient(180deg,${sheet.gradient[0]},${sheet.gradient[1]})`,
    )
  })

  it('takes its three side tints and its lit edge from the same tier', () => {
    expect(sheetSurface.borderTopColor).toBe(sheet.highlightTop)
    expect(sheetSurface.borderRightColor).toBe(sheet.border)
    expect(sheetSurface.borderBottomColor).toBe(sheet.border)
    expect(sheetSurface.borderLeftColor).toBe(sheet.border)
  })

  it('is 1px on three sides and 2px on the lit top edge (A58)', () => {
    expect(sheetSurface.borderWidth).toBe(1)
    expect(sheetSurface.borderTopWidth).toBe(2)
    // Without an explicit style the four widths render nothing at all: `border-style`
    // initialises to `none`, and a 2px `none` edge is invisible.
    expect(sheetSurface.borderStyle).toBe('solid')
  })

  it('rounds only the top corners, at radius.sheet (22)', () => {
    expect(sheetSurface.borderTopLeftRadius).toBe(radius.sheet)
    expect(sheetSurface.borderTopRightRadius).toBe(radius.sheet)
    expect(radius.sheet).toBe(22)
    expect(sheetSurface.borderBottomLeftRadius).toBeUndefined()
    expect(sheetSurface.borderBottomRightRadius).toBeUndefined()
  })

  it('casts A46 upward, and carries NO inset — the tier`s innerShadow is unconsumed here', () => {
    // The phone's sheet composes `Layout.shadow.sheet` and nothing else (GlassBottomSheet.tsx
    // :441, styles.sheet :481-488). An `inset 0 1px 0 <innerShadow>` would be a value the
    // phone does not render. Same finding as U1.4's header bars.
    expect(sheetSurface.boxShadow).toBe(SHEET_SHADOW)
    expect(SHEET_SHADOW).toBe('0 -8px 40px rgba(0,0,0,0.5)')
    expect(SHEET_SHADOW).not.toContain('inset')
    // Upward, not downward: the sheet rises from the bottom edge. This is the A45/A46 mistake
    // phone §1.5 records — Phase 5 put `sheet` on a dialog and inverted its cast.
    expect(SHEET_SHADOW).toContain('-8px')
  })

  it('reserves the bottom safe area on the constant, because jsdom cannot see it', () => {
    // Measured: jsdom's CSSOM DROPS `env(...)`, so `element.style.paddingBottom` reads `''`.
    // A DOM-level pin here would assert over an empty declaration and stay green after the
    // value is deleted — plan §4.2's trap. The constant is what the component spreads, so
    // pinning the constant is the falsifiable form.
    expect(sheetSurface.paddingBottom).toBe('env(safe-area-inset-bottom)')
    expect(paint(sheetSurface).style.paddingBottom).toBe('')
  })

  it('renders the lit edge on FIRST PAINT, not the side tint — on all four sides', () => {
    const el = paint(sheetSurface)
    const TINT = 'rgba(28, 78, 132, 0.6)'
    expect(sides(el)).toEqual({ top: LIT, right: TINT, bottom: TINT, left: TINT })
    expect(el.style.borderTopWidth).toBe('2px')
    expect(el.style.borderRightWidth).toBe('1px')
    // …and the shorthand is NOT synthesized back from them. This is why every cell in this file
    // reads per-side: `expect(el.style.borderColor).toBe(TINT)` would assert over nothing.
    expect(el.style.borderColor).toBe('')
  })

  /**
   * The consumer cells, from `reports/partner-lit-edge-ruling.md` §3. Every one is measured
   * across THREE paints, because the defect this fragment exists to avoid is invisible on the
   * first: React writes only the keys whose value changed, so a fragment carrying any shorthand
   * slot protects the edge on paint 1 and loses it on paint 2. U4.1's original pin asserted the
   * paint-1 cell of a form that was broken on update, and its "across an UPDATE" case toggled
   * `opacity` rather than the tint — so the failing cell was never exercised. These toggle the
   * tint itself.
   */
  const paints = (mk: (tint: string) => CSSProperties) => {
    const { container, rerender } = render(<div data-paint style={mk('rgb(1, 1, 1)')} />)
    const top = () => container.querySelector<HTMLElement>('[data-paint]')!.style.borderTopColor
    const p1 = top()
    rerender(<div data-paint style={mk('rgb(2, 2, 2)')} />)
    const p2 = top()
    rerender(<div data-paint style={mk('rgb(1, 1, 1)')} />)
    return [p1, p2, top()]
  }

  it('keeps the lit edge across every paint when a consumer re-tints with COLOUR LONGHANDS', () => {
    // The sanctioned consumer form, and the only one that holds on an update.
    expect(
      paints((tint) => ({
        ...sheetSurface,
        borderRightColor: tint,
        borderBottomColor: tint,
        borderLeftColor: tint,
      })),
    ).toEqual([LIT, LIT, LIT])
  })

  it('self-heals to its own tint when a consumer drops those longhands conditionally', () => {
    // The benign asymmetry the ruling measured: because the tint lives in longhands here too,
    // a conditional override that switches OFF restores this fragment's `sheet.border` rather
    // than collapsing the sides to `currentColor` — which is what every shorthand-carrying
    // form does in the same cell.
    const { container, rerender } = render(
      <div data-paint style={{ ...sheetSurface, borderLeftColor: 'rgb(1, 1, 1)' }} />,
    )
    const el = () => container.querySelector<HTMLElement>('[data-paint]')!
    expect(el().style.borderLeftColor).toBe('rgb(1, 1, 1)')
    rerender(<div data-paint style={{ ...sheetSurface }} />)
    expect(el().style.borderLeftColor).toBe('rgba(28, 78, 132, 0.6)')
    expect(el().style.borderTopColor).toBe(LIT)
  })

  it('fails a `borderColor` override on the FIRST paint — loudly, not on paint two', () => {
    // NOT a feature request: `borderColor` is a four-side shorthand and is off the consumer
    // rule. What this pins is that it breaks IMMEDIATELY. The form U4.1 shipped kept the edge
    // at paint 1 (`rgb(200,200,200)`) and lost it at paint 2 — a trap that passes review.
    expect(paints((tint) => ({ ...sheetSurface, borderColor: tint }))).toEqual([
      'rgb(1, 1, 1)',
      'rgb(2, 2, 2)',
      'rgb(1, 1, 1)',
    ])
  })

  it('carries no shorthand key at all — `border`, `borderTop` and `borderColor` are absent', () => {
    // The structural half: the cells above observe the OUTCOME, this observes the cause. A
    // refactor back to any shorthand slot re-opens the trap for every consumer, and
    // `borderColor` counts — it is a four-side shorthand, which is the half both seats missed.
    expect(sheetSurface).not.toHaveProperty('border')
    expect(sheetSurface).not.toHaveProperty('borderTop')
    expect(sheetSurface).not.toHaveProperty('borderColor')
  })
})

describe('sheetScrim — A22, the ONE backdrop token', () => {
  it('paints colors.scrim and owns no layering of its own', () => {
    // Was `rgba(4,8,14,0.55)`, carried here by U4.1 with a `SEAM(U4.4)` marker. `zIndex` stays
    // the shell's (D14 froze the numbers), so this fragment must not grow one.
    expect(sheetScrim.background).toBe(colors.scrim)
    expect(sheetScrim).not.toHaveProperty('zIndex')
  })
})

describe('sheetHeaderBand — the A37 header tier, not the sheet tier', () => {
  it('is the header tier`s gradient with its hairline on the bottom edge', () => {
    expect(sheetHeaderBand.background).toBe(glassHeaderBar.background)
    expect(sheetHeaderBand.borderBottom).toBe(`1px solid ${header.border}`)
    // …and NOT the sheet tier. A58 says "Header band on the `header` tier (A37)"; sourcing it
    // from `sheet` is the drift this pin exists for.
    expect(sheetHeaderBand.background).not.toContain(sheet.gradient[0])
  })

  it('spreads glassHeaderBar LAST so nothing below can erase a key the recipe owns', () => {
    const keys = Object.keys(sheetHeaderBand)
    for (const owned of Object.keys(glassHeaderBar)) {
      expect(keys.indexOf(owned)).toBeGreaterThan(keys.indexOf('padding'))
    }
  })

  it('pads 16/8/12 with the title row gapped 8 (A58)', () => {
    expect(sheetHeaderBand.padding).toBe('8px 16px 12px')
    expect(sheetHeaderTitleRow.gap).toBe(8)
    expect(sheetHeaderTitleRow.flex).toBe(1)
  })
})

describe('the header glyphs', () => {
  it('draws a 6px accent dot on `primary` with the dark-only 4px glow', () => {
    expect(sheetAccentDot.width).toBe(6)
    expect(sheetAccentDot.height).toBe(6)
    expect(sheetAccentDot.borderRadius).toBe(radius.full)
    expect(sheetAccentDot.background).toBe(colors.primary)
    expect(sheetAccentDot.boxShadow).toBe(`0 0 4px ${withAlpha(colors.primary, 0.4)}`)
  })

  it('sets the title 14/700 uppercase at ls .3 on `text`', () => {
    expect(decl(sheetTitle)).toMatchObject({
      fontSize: 14,
      fontWeight: 700,
      letterSpacing: 0.3,
      textTransform: 'uppercase',
      color: colors.text,
    })
    // A58's title is `colors.text`, not the picker's old `T.textDim` (#cdd9e6).
    expect(sheetTitle.color).toBe('#f0f4f8')
  })

  it('sets the subtitle 12/400 at marginTop 2 on `textSecondary`, un-uppercased', () => {
    expect(decl(sheetSubtitle)).toMatchObject({
      fontSize: 12,
      fontWeight: 400,
      marginTop: 2,
      color: colors.textSecondary,
    })
    // Explicit, because the title directly above it IS uppercased.
    expect(sheetSubtitle.textTransform).toBe('none')
  })
})

describe('the handle', () => {
  it('is a 40x4 pill at radius.full', () => {
    expect(sheetHandle.width).toBe(40)
    expect(sheetHandle.height).toBe(4)
    expect(sheetHandle.borderRadius).toBe(radius.full)
    expect(radius.full).toBe(9999)
  })

  it('takes textSecondary at 0.25 — A58`s rgba(153,186,221,0.25), reached through the token', () => {
    expect(sheetHandle.background).toBe(withAlpha(colors.textSecondary, 0.25))
    expect(paint(sheetHandle).style.background).toBe('rgba(153, 186, 221, 0.25)')
  })

  it('sits in a centred zone padded 8 above and 4 below', () => {
    expect(sheetHandleZone.paddingTop).toBe(8)
    expect(sheetHandleZone.paddingBottom).toBe(4)
    expect(sheetHandleZone.justifyContent).toBe('center')
  })
})

describe('the accent strip', () => {
  it('is 2px and tapers from `primary`, transparent at both edges', () => {
    expect(sheetAccentStrip.height).toBe(2)
    const stops = String(sheetAccentStrip.background)
    // Horizontal, matching RN's start {x:0,y:0} -> end {x:1,y:0}.
    expect(stops.startsWith('linear-gradient(90deg,')).toBe(true)
    // Dark ramp: peak 0.5 dead centre, shoulders 0.4, zero at both ends.
    expect(stops).toContain(`${withAlpha(colors.primary, 0)} 0%`)
    expect(stops).toContain(`${withAlpha(colors.primary, 0.4)} 30%`)
    expect(stops).toContain(`${withAlpha(colors.primary, 0.5)} 50%`)
    expect(stops).toContain(`${withAlpha(colors.primary, 0.4)} 70%`)
    expect(stops).toContain(`${withAlpha(colors.primary, 0)} 100%`)
  })

  it('derives every stop from the palette, so a re-tint moves the strip with it', () => {
    // The phone's whole reason for extracting this component: both hand-rolled copies invented
    // `rgba(53, 160, 214, ...)`, which is in no palette (GlassAccentStrip.tsx:8-12).
    expect(String(sheetAccentStrip.background)).not.toContain('53, 160, 214')
    expect(String(sheetAccentStrip.background)).not.toMatch(/#[0-9a-f]{3,8}/i)
  })
})

describe('body and footer', () => {
  it('gives the body no padding — content pads itself (A82 carries 16/16/8)', () => {
    expect(sheetBody).toEqual({ flexShrink: 1, overflowY: 'auto' })
    expect(sheetBodyFill).toEqual({ flex: 1, overflowY: 'auto' })
  })

  it('pads the footer 12 at the bottom and nothing else', () => {
    expect(sheetFooter).toEqual({ paddingBottom: 12 })
  })
})

describe('motion constants', () => {
  it('enters in 260ms and exits in 200ms (phone :30-31)', () => {
    expect(SHEET_ENTER_MS).toBe(260)
    expect(SHEET_EXIT_MS).toBe(200)
  })

  it('fades the scrim on a DIFFERENT keyframe from the one the sheet travels on', () => {
    // PR #127: the scrim used to ride up with the sheet because the RN Modal's own
    // `animationType="slide"` translated both. The two must not share a keyframe.
    expect(SCRIM_FADE_KEYFRAME).not.toBe(SHEET_SLIDE_KEYFRAME)
    expect(SHEET_SLIDE_KEYFRAME).toBe('sheetUp')
  })
})

describe('A46 — one upward cast, three sheets', () => {
  it('is the SAME shadow on the picker sheet, the export action sheet and the map sheet', () => {
    // The matrix calls these "four near-misses of one recipe". Three of them are sheets and
    // take it here; the fourth is `TabBar.tsx:80`, which is A63's flat bar and U8.3's row.
    // Relational on purpose: each assertion reads `SHEET_SHADOW`, so re-hardcoding any one of
    // them reds, and moving the recipe moves all three together.
    //
    // W2/F28: the title named the picker sheet and the body rendered only the other two. It is
    // the sheet that reaches the recipe through `GlassBottomSheet`'s `...sheetSurface` rather
    // than a `boxShadow` of its own, so it was the one worth rendering and the one missing.
    render(
      <PickerSheet title="Select Date" onClose={() => {}}>
        <div />
      </PickerSheet>,
    )
    expect(screen.getByRole('dialog').style.boxShadow).toBe(SHEET_SHADOW)
    cleanup()

    render(
      <ExportActionSheet
        options={[{ id: 'case', label: 'Export Case' }]}
        onSelect={() => {}}
        onCancel={() => {}}
      />,
    )
    expect(screen.getByTestId('export-action-sheet').style.boxShadow).toBe(SHEET_SHADOW)
    cleanup()

    render(
      <MapBottomSheet
        items={[]}
        statusCounts={{ started: 0, working: 0, complete: 0 }}
        snapIndex={1}
        onSnapChange={() => {}}
        contentMode="list"
      />,
    )
    expect(document.querySelector<HTMLElement>('[data-map-sheet]')!.style.boxShadow).toBe(SHEET_SHADOW)
  })
})
