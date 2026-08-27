import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapBottomSheet } from '@/features/demo/ui/screens/map/MapBottomSheet'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { sheetIncident, sheetLocation } from '@/features/demo/ui/screens/map/__tests__/test-utils'
import { SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing } from '@/features/demo/ui/tokens/scale'

const items: SheetItem[] = [
  sheetIncident({ displayName: 'Kim B&E', businessName: 'Kim', streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.6, 43.6] }),
  sheetLocation({ businessName: 'Kim', address: '1450 Eglinton, Mississauga', coord: [-79.61, 43.61], streetAddress: '1450 Eglinton', city: 'Mississauga' }),
]
const counts = { started: 1, working: 0, complete: 0 }

function renderSheet(over: Partial<Parameters<typeof MapBottomSheet>[0]> = {}) {
  const props = {
    items,
    statusCounts: counts,
    snapIndex: 0,
    onSnapChange: vi.fn(),
    contentMode: 'list' as const,
    selectedId: null,
    onSelect: vi.fn(),
    ...over,
  }
  render(<MapBottomSheet {...props} />)
  return props
}

describe('MapBottomSheet', () => {
  it('renders the handle and a row per item in list mode', () => {
    renderSheet()
    expect(screen.getByTestId('sheet-handle')).toBeInTheDocument()
    expect(screen.getByText('Rear door')).toBeInTheDocument()
    expect(screen.getByText('Kim B&E')).toBeInTheDocument() // the incident row
  })

  it('dragging the handle up snaps to the next detent', () => {
    const props = renderSheet({ snapIndex: 0 })
    const handle = screen.getByTestId('sheet-handle')
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientY: 380, pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(handle, { clientY: 380, pointerId: 1 })
    expect(props.onSnapChange).toHaveBeenCalledWith(1)
  })

  it('dragging the handle down snaps to the previous detent', () => {
    const props = renderSheet({ snapIndex: 2 })
    const handle = screen.getByTestId('sheet-handle')
    fireEvent.pointerDown(handle, { clientY: 200, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientY: 360, pointerId: 1, buttons: 1 })
    fireEvent.pointerUp(handle, { clientY: 360, pointerId: 1 })
    expect(props.onSnapChange).toHaveBeenCalledWith(1)
  })

  it('does not drag on a hover move with no pointer-down', () => {
    const props = renderSheet({ snapIndex: 0 })
    const handle = screen.getByTestId('sheet-handle')
    fireEvent.pointerMove(handle, { clientY: 380, pointerId: 1, buttons: 0 })
    expect(props.onSnapChange).not.toHaveBeenCalled()
  })

  it('ends the drag on a released-button move and ignores further moves (no stuck sheet)', () => {
    const props = renderSheet({ snapIndex: 0 })
    const handle = screen.getByTestId('sheet-handle')
    fireEvent.pointerDown(handle, { clientY: 500, pointerId: 1 })
    fireEvent.pointerMove(handle, { clientY: 380, pointerId: 1, buttons: 0 }) // button released → end drag
    fireEvent.pointerMove(handle, { clientY: 200, pointerId: 1, buttons: 0 }) // stray hover → ignored
    expect(props.onSnapChange).toHaveBeenCalledTimes(1)
    expect(props.onSnapChange).toHaveBeenCalledWith(1)
  })

  it('selecting a row fires onSelect', () => {
    const props = renderSheet()
    fireEvent.click(screen.getByText('Rear door'))
    expect(props.onSelect).toHaveBeenCalledWith('l1')
  })

  // U5.1 (A84). The GROUND and the RADIUS were the two halves U4.1's A46 comment reserved for
  // this package. Read off the rendered element rather than off the token, because the token
  // being right is worthless if the surface stops painting it — and the ground moved from a
  // flat `backgroundColor`-shaped value to a gradient, which is exactly the substitution that
  // can silently stop rendering.
  it('paints the phone sheet ground and radius (A84 / SheetBackground.tsx:40-41)', () => {
    renderSheet()
    const sheet = document.querySelector('[data-map-sheet]') as HTMLElement
    expect(sheet).not.toBeNull()
    // jsdom rewrites an inline hex to `rgb(r, g, b)` on read-back, gradient stops included
    // (mutation-testing SKILL, "jsdom REWRITES the inline values it does accept"). Normalising
    // the EXPECTATION rather than loosening the assertion keeps it byte-exact: all three stops,
    // both positions, and the 180deg are still compared.
    const hexToJsdomRgb = (hex: string) =>
      `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
    expect(sheet.style.background).toBe(
      `linear-gradient(180deg, ${hexToJsdomRgb(colors.background)} 0%, ${hexToJsdomRgb(colors.backgroundSecondary)} 50%, ${hexToJsdomRgb(colors.background)} 100%)`,
    )
    expect(SHEET_COLORS.backgroundGradient).toContain(colors.backgroundSecondary)
    // Per side: jsdom does not synthesize the `border-radius` shorthand from its corners.
    expect(sheet.style.borderTopLeftRadius).toBe(`${radius.sheet}px`)
    expect(sheet.style.borderTopRightRadius).toBe(`${radius.sheet}px`)
    expect(radius.sheet, 'the phone sheet radius, not the demo’s old hand-set 20').toBe(22)
  })

  // U5.4. Phone `MapBottomSheet.tsx:212-216` + `styles.divider` `:258-261` — a 1px rule inset by
  // `spacing.lg`, separating the handle from the content. The demo had `SHEET_COLORS.divider`
  // and no divider: the key's only reader was `LocationDetailCard`'s info-card BORDER, which is
  // the nested tier's job. Ordered between the drag zone and the body, which is where it is on
  // the phone and the only place it separates anything.
  it('rules the handle off from the content (MapBottomSheet.tsx:212-216)', () => {
    renderSheet()
    const divider = screen.getByTestId('sheet-divider')
    expect(divider.style.height).toBe('1px')
    expect(divider.style.background).toBe(SHEET_COLORS.divider)
    expect(divider.style.margin).toBe(`0px ${spacing.lg}px`)
    const handle = screen.getByTestId('sheet-handle')
    expect(handle.compareDocumentPosition(divider)).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })
})
