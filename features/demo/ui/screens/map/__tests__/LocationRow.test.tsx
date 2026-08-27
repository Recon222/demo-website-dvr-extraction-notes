import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { sheetIncident, sheetLocation } from '@/features/demo/ui/screens/map/__tests__/test-utils'
import { glassCard } from '@/features/demo/ui/glass-tokens'
import { MAP_PIN_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { STATUS_ACCENT, severityTone } from '@/features/demo/ui/tokens/status'

const locItem = sheetLocation({
  businessName: 'Kim', address: '1450 Eglinton, Mississauga',
  streetAddress: '1450 Eglinton', city: 'Mississauga',
})
const incItem = sheetIncident({
  displayName: 'Kim B&E', businessName: 'Kim',
  streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.6, 43.6],
})

/** jsdom rewrites an inline hex to `rgb(r, g, b)` on read-back (mutation-testing SKILL). */
const hexToJsdomRgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
/** ...and re-spaces `rgba(28,78,132,0.5)` to `rgba(28, 78, 132, 0.5)` (matrix A53). Normalising
 *  the EXPECTATION keeps every channel compared; loosening the assertion would not. */
const respace = (value: string) => value.replace(/,(?=\S)/g, ', ')

describe('LocationRow', () => {
  it('location variant renders name + business + address and selects on press', () => {
    const onSelect = vi.fn()
    render(<LocationRow item={locItem} selected={false} onSelect={onSelect} />)
    expect(screen.getByText('Rear door')).toBeInTheDocument()
    expect(screen.getByText('1450 Eglinton, Mississauga')).toBeInTheDocument()
    fireEvent.click(screen.getByText('Rear door'))
    expect(onSelect).toHaveBeenCalledWith('l1')
  })

  it('incident variant renders the headline + an "Incident" chip', () => {
    render(<LocationRow item={incItem} selected={false} onSelect={vi.fn()} />)
    expect(screen.getByText('Kim B&E')).toBeInTheDocument()
    expect(screen.getByText('Incident')).toBeInTheDocument()
  })

  // D4 / phone `7df5148b`. The phone's own `LocationRow.tsx:51-56` states the end state in words:
  // "The border is UNIFORM. It used to reserve a 4px left edge ... Selection is not indicated here
  // at all now: tapping a row opens that location's own sheet, which is the signal."
  //
  // The paint is compared BETWEEN the two states rather than against a literal, because the whole
  // claim is that selection changes nothing: an assertion on one state alone stays green when a
  // future edit re-tints the OTHER one.
  it('paints identically selected and unselected — selection is not indicated (D4)', () => {
    const { unmount } = render(<LocationRow item={locItem} selected={false} onSelect={vi.fn()} />)
    const unselected = screen.getByTestId('location-row').getAttribute('style')
    unmount()
    render(<LocationRow item={locItem} selected onSelect={vi.fn()} />)
    const row = screen.getByTestId('location-row')
    expect(row.getAttribute('style')).toBe(unselected)
    // The state still reaches the DOM for a consumer that wants it — it just carries no paint.
    expect(row.dataset.selected).toBe('true')
  })

  // The four-sided border D4 restores, plus the lit edge the card tier carries (A31). Read per
  // side: jsdom does not synthesize the `border-color` shorthand from its four longhands, and a
  // `border`/`borderColor` written after the `glassCard` spread would silently erase the edge.
  it('draws four sides on the card tier, lit edge intact (A84 R2, THE LIT-EDGE RULE)', () => {
    render(<LocationRow item={locItem} selected={false} onSelect={vi.fn()} />)
    const row = screen.getByTestId('location-row')
    const side = respace(glassCard.borderRightColor)
    expect(row.style.borderRightColor).toBe(side)
    expect(row.style.borderBottomColor).toBe(side)
    expect(row.style.borderLeftColor).toBe(side)
    // The lit top edge is a DIFFERENT token — if a shorthand flattened the family this collapses.
    expect(row.style.borderTopColor).toBe(respace(glassCard.borderTopColor))
    expect(row.style.borderTopColor).not.toBe(side)
    // No shorthand survives in the emitted declaration.
    expect(row.getAttribute('style')).not.toMatch(/(^|;)\s*border(-color)?:/)
  })

  // A70's split: a BARE DOT takes `STATUS_ACCENT`, never `PIN_COLORS`. This is the phone's
  // "reported by nobody" bug — `working` = `#00BFFF` measured 2.87:1 in DARK inside the sheet.
  it('paints the status dot from STATUS_ACCENT, not the tile pins (A70)', () => {
    render(<LocationRow item={sheetLocation({ status: 'working' })} selected={false} onSelect={vi.fn()} />)
    const dot = screen.getByTestId('location-row-status-dot')
    expect(dot.style.background).toBe(hexToJsdomRgb(colors[STATUS_ACCENT.working]))
    expect(dot.style.background).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.working))
  })

  // Phone `LocationRow.tsx:230-241` — the incident chip is the D8(a) `errorLight`/`errorOnLight`
  // PAIR, not bare `PIN_COLORS.incident` text (which measured 3.19:1 on the light glass card).
  it('fills the incident chip from the error severity pair (A70)', () => {
    render(<LocationRow item={incItem} selected={false} onSelect={vi.fn()} />)
    const chip = screen.getByText('Incident')
    const tone = severityTone('error')
    expect(chip.style.background).toBe(hexToJsdomRgb(tone.background))
    expect(chip.style.color).toBe(hexToJsdomRgb(tone.color))
    expect(chip.style.color).not.toBe(hexToJsdomRgb(MAP_PIN_COLORS.incident))
  })
})
