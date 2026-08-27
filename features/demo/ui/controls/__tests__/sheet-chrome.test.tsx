import { describe, it, expect } from 'vitest'
import type { CSSProperties } from 'react'
import { render } from '@testing-library/react'
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
  sheetSubtitle,
  sheetSurface,
  sheetTitle,
} from '@/features/demo/ui/controls/sheet-chrome'
import { glassHeaderBar } from '@/features/demo/ui/controls/header-chrome'
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
const header = GLASS_TIER[scheme].header

/** `toHaveStyle` is typed for `Record<string, unknown>`; `CSSProperties` has no index signature. */
function decl(fragment: CSSProperties): Record<string, unknown> {
  return { ...fragment }
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

  it('takes its border and lit edge from the same tier', () => {
    expect(sheetSurface.borderColor).toBe(sheet.border)
    expect(sheetSurface.borderTopColor).toBe(sheet.highlightTop)
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

  it('renders the lit edge on FIRST PAINT, not the side tint', () => {
    const el = paint(sheetSurface)
    expect(el.style.borderTopColor).toBe('rgba(184, 212, 240, 0.14)')
    expect(el.style.borderRightColor).toBe('rgba(28, 78, 132, 0.6)')
    expect(el.style.borderTopWidth).toBe('2px')
    expect(el.style.borderRightWidth).toBe('1px')
  })

  it('keeps the lit edge when a consumer re-tints the sides — the W1 duplicate-key hazard', () => {
    // `glass-tokens.ts:129-130`'s documented escape hatch ("set `borderColor` then re-set
    // `borderTopColor`") is BROKEN over a fragment that already carries `borderTopColor`:
    // re-assigning a spread key keeps its ORIGINAL position, so `borderColor` lands last and
    // repaints the top edge. Measured in jsdom: the edge renders `rgb(1, 1, 1)`.
    //
    // This fragment defends against it by ordering: `borderColor` is already at index 3, so a
    // consumer's override holds THAT slot and `borderTopColor` at index 4 still wins.
    const retinted: CSSProperties = { ...sheetSurface, borderColor: 'rgb(1, 1, 1)' }
    const el = paint(retinted)
    expect(el.style.borderRightColor).toBe('rgb(1, 1, 1)')
    expect(el.style.borderTopColor).toBe('rgba(184, 212, 240, 0.14)')
  })

  it('keeps the lit edge across an UPDATE, with no shorthand-conflict warning', () => {
    // React warns (and can drop a declaration) when a style object mixes a shorthand with one
    // of its longhands ACROSS renders. This fragment is longhands only, so re-rendering it
    // with a changed sibling key must neither warn nor repaint the edge.
    const { rerender, container } = render(<div data-paint style={{ ...sheetSurface, opacity: 1 }} />)
    rerender(<div data-paint style={{ ...sheetSurface, opacity: 0.5 }} />)
    const el = container.querySelector<HTMLElement>('[data-paint]')!
    expect(el.style.borderTopColor).toBe('rgba(184, 212, 240, 0.14)')
    expect(el.style.borderRightColor).toBe('rgba(28, 78, 132, 0.6)')
  })

  it('spells the border in longhands only — the two shorthands are absent by design', () => {
    // The structural half of the two pins above: they observe the OUTCOME, this observes the
    // cause. A refactor back to `{ border, borderTop }` passes both DOM pins and re-opens the
    // hazard for every consumer.
    expect(sheetSurface).not.toHaveProperty('border')
    expect(sheetSurface).not.toHaveProperty('borderTop')
    expect(Object.keys(sheetSurface).indexOf('borderColor')).toBeLessThan(
      Object.keys(sheetSurface).indexOf('borderTopColor'),
    )
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
