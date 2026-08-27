import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SheetHandle } from '@/features/demo/ui/screens/map/SheetHandle'
import { MAP_PIN_COLORS, SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { severityTone, STATUS_SEVERITY } from '@/features/demo/ui/tokens/status'
import { withAlpha } from '@/features/demo/ui/tokens/scale'

/** jsdom rewrites an inline hex to `rgb(r, g, b)` on read-back (mutation-testing SKILL). */
const hexToJsdomRgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`

describe('SheetHandle', () => {
  it('list mode shows the count and a badge per non-zero status', () => {
    render(<SheetHandle contentMode="list" locationCount={3} statusCounts={{ started: 1, working: 2, complete: 0 }} />)
    expect(screen.getByText('3 Locations')).toBeInTheDocument()
    expect(screen.getByText(/1 Started/)).toBeInTheDocument()
    expect(screen.getByText(/2 Working/)).toBeInTheDocument()
    expect(screen.queryByText(/Complete/)).not.toBeInTheDocument() // 0 → hidden
  })

  it('uses the singular for one location', () => {
    render(<SheetHandle contentMode="list" locationCount={1} statusCounts={{ started: 1, working: 0, complete: 0 }} />)
    expect(screen.getByText('1 Location')).toBeInTheDocument()
  })

  it('detail mode shows "Location Details" and hides the badges', () => {
    render(<SheetHandle contentMode="detail" locationCount={3} statusCounts={{ started: 1, working: 2, complete: 0 }} />)
    expect(screen.getByText('Location Details')).toBeInTheDocument()
    expect(screen.queryByText(/Started/)).not.toBeInTheDocument()
  })

  // A70. Phone `SheetHandle.tsx:90-113`: "the `*Light` tone fills, the saturated accent stays on
  // the (decorative) border, and the `*OnLight` foreground carries both the dot and the label.
  // These badges used to read PIN_COLORS, which is theme-invariant by design and measured 1.33:1
  // in light mode once the sheet started following the theme."
  it('paints each badge from its severity trio, not from the tile pins (A70)', () => {
    render(<SheetHandle contentMode="list" locationCount={2} statusCounts={{ started: 0, working: 2, complete: 0 }} />)
    const badge = screen.getByTestId('status-badge-working')
    const tone = severityTone(STATUS_SEVERITY.working)
    expect(badge.style.background).toBe(hexToJsdomRgb(tone.background))
    expect(badge.style.borderColor).toBe(hexToJsdomRgb(tone.borderColor))
    expect(badge.style.color).toBe(hexToJsdomRgb(tone.color))
    // The three parts are three DIFFERENT tokens — a collapse to one would pass a single-key pin.
    expect(tone.background).not.toBe(tone.borderColor)
    // And none of them is the pin the badge used to read.
    expect(badge.style.background).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.working))
    expect(badge.style.color).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.working))
  })

  // Phone `:110` — the dot takes the `*OnLight` FOREGROUND, not the accent and not the fill.
  it('paints the badge dot from the foreground token (A70)', () => {
    render(<SheetHandle contentMode="list" locationCount={1} statusCounts={{ started: 1, working: 0, complete: 0 }} />)
    const dot = screen.getByTestId('status-badge-dot-started')
    const tone = severityTone(STATUS_SEVERITY.started)
    expect(dot.style.background).toBe(hexToJsdomRgb(tone.color))
    expect(dot.style.background).not.toBe(hexToJsdomRgb(tone.accent))
  })

  // Phone `:53-63` + `:136-149`. The strip is a genuinely MISSING element in the demo, and the
  // pill had drifted to the 38x4/radius-2 shape the phone's own docblock records as the drift it
  // repaired ("Handle geometry matches GlassBottomSheet (40x4 pill, 2pt accent strip, 8/4 zone
  // padding); the two had drifted to 36x4 / 1pt / 14/10 with nothing enforcing the pairing").
  it('renders the 2px accent strip and the 40x4 pill (SheetHandle.tsx:136-149)', () => {
    render(<SheetHandle contentMode="list" locationCount={1} statusCounts={{ started: 1, working: 0, complete: 0 }} />)
    const strip = screen.getByTestId('sheet-accent-strip')
    expect(strip.style.height).toBe('2px')
    // Three stops, transparent -> 0.45 -> transparent, all derived from `primary`.
    expect(strip.style.background).toContain(withAlpha(colors.primary, 0.45))
    expect(strip.style.background).toContain('90deg')

    const pill = screen.getByTestId('handle-pill')
    expect(pill.style.width).toBe('40px')
    expect(pill.style.height).toBe('4px')
    expect(pill.style.background).toBe(SHEET_COLORS.handle)
  })
})
