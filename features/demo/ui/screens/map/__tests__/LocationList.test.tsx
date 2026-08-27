import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { EMPTY_COPY, LocationList } from '@/features/demo/ui/screens/map/LocationList'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, touchTarget } from '@/features/demo/ui/tokens/scale'

/** jsdom rewrites an inline hex to `rgb(r, g, b)` and re-spaces `rgba(...)` on read-back. */
const hexToJsdomRgb = (hex: string) =>
  `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`
const respace = (value: string) => value.replace(/,(?=\S)/g, ', ')
const norm = (value: string) => respace(value).replace(/#[0-9a-f]{6}/gi, hexToJsdomRgb)

const item: SheetItem = {
  kind: 'location',
  id: 'l1',
  locationName: 'Front Counter',
  businessName: '',
  address: '1450 Eglinton Ave W, Mississauga',
  status: 'working',
  coord: [-79.6, 43.6],
  streetAddress: '1450 Eglinton Ave W',
  city: 'Mississauga',
  requesterName: '',
  requesterBadge: '',
  requesterUnit: '',
  requesterPhone: '',
  requesterEmail: '',
  locationContact: '',
  locationPhone: '',
  coordinateSource: 'geocoded',
  cameras: [],
  cameraTotal: 0,
}

describe('LocationList — Export Map footer', () => {
  it('is absent without a handler, so no button can swallow a press', () => {
    render(<LocationList items={[item]} selectedId={null} onSelect={() => undefined} />)
    expect(screen.queryByTestId('export-map-button')).not.toBeInTheDocument()
  })

  it('renders below the rows and reports the press', () => {
    const onExportMap = vi.fn()
    render(<LocationList items={[item]} selectedId={null} onSelect={() => undefined} onExportMap={onExportMap} />)
    fireEvent.click(screen.getByTestId('export-map-button'))
    expect(onExportMap).toHaveBeenCalledTimes(1)
    // Below the rows, as the phone's `ListFooterComponent` is.
    const row = screen.getByText('Front Counter')
    expect(row.compareDocumentPosition(screen.getByTestId('export-map-button'))).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING,
    )
  })

  it('renders on an empty list too — the phone footer does not depend on there being rows', () => {
    render(<LocationList items={[]} selectedId={null} onSelect={() => undefined} onExportMap={() => undefined} />)
    expect(screen.getByText(/No located locations yet/)).toBeInTheDocument()
    expect(screen.getByTestId('export-map-button')).toBeInTheDocument()
  })

  // A68 + PR #118 D-4. Phone `LocationList.tsx:66-77`: the CTA is the shared
  // `<Button variant="primary" fullWidth>`, and `styles.footer:98-100` records the deletion —
  // "It used to be a locally-authored gradient button (one of six local button implementations
  // on this screen, at a seventh height and radius)". The icon went with PR #118 D-4.
  it('drives the export CTA from buttonStyle and drops the map-outline icon (A68)', () => {
    render(<LocationList items={[item]} selectedId={null} onSelect={() => undefined} onExportMap={() => undefined} />)
    const cta = screen.getByTestId('export-map-button')
    const primary = buttonStyle({ variant: 'primary' })
    expect(cta.style.backgroundImage).toBe(norm(primary.background as string))
    expect(cta.style.borderRadius).toBe(`${radius.control}px`)
    expect(cta.style.minHeight).toBe(`${touchTarget.comfortable}px`)
    expect(cta.style.boxShadow).toBe(respace(primary.boxShadow as string))
    expect(cta.querySelector('svg')).toBeNull()
  })

  // D10 + the recipe's own note: `opacity: 0.45` over a LIVE gradient is "a disabled idiom that
  // the phone does not have". The recipe's disabled arm fills `colors.disabled` instead.
  it('paints the pending CTA from the recipe disabled arm, not an opacity wash', () => {
    render(<LocationList items={[item]} selectedId={null} onSelect={() => undefined} onExportMap={() => undefined} exportMapPending />)
    const cta = screen.getByTestId('export-map-button')
    expect(cta.style.background).toBe(hexToJsdomRgb(colors.disabled))
    expect(cta.style.color).toBe(hexToJsdomRgb(colors.disabledText))
    expect(cta.style.opacity).toBe('')
    // The demo-only "preparing" affordance survives the recipe adoption.
    expect(cta.style.cursor).toBe('progress')
    expect(cta).toHaveAccessibleName('Export case map (preparing)')
  })
})

// ---- U5.4 — the empty state (A80) ------------------------------------------------------------
describe('LocationList — empty state', () => {
  // A80's tenth site. U3.4's sweep left it — partner legwork §S2 measured `screens/map/` with no
  // `EmptyState` consumer — and `controls/EmptyState.tsx:46-47` names this file as an expected
  // first caller. The three-reason discrimination (review R-6) is demo-only and unchanged; only
  // the chrome moves.
  it('renders the reason copy through the shared EmptyState recipe', () => {
    render(<LocationList items={[]} selectedId={null} onSelect={() => undefined} emptyReason="proximity" />)
    const wrapper = screen.getByTestId('map-sheet-empty')
    expect(wrapper.dataset.emptyReason).toBe('proximity')
    const message = screen.getByText(EMPTY_COPY.proximity)
    expect(message.style.fontSize).toBe('18px')
    expect(message.style.color).toBe(hexToJsdomRgb(colors.textSecondary))
    expect(message.style.textAlign).toBe('center')
    // A80 bans all five: no italic, no glass, no border, no icon, no illustration.
    expect(message.style.fontStyle).toBe('')
    expect(wrapper.style.border).toBe('')
  })

  it('offers Clear filters as the action slot, on the button recipe', () => {
    const onClearFilters = vi.fn()
    render(<LocationList items={[]} selectedId={null} onSelect={() => undefined} emptyReason="filters" onClearFilters={onClearFilters} />)
    const clear = screen.getByTestId('map-sheet-clear-filters')
    expect(clear.style.borderRadius).toBe(`${radius.control}px`)
    expect(clear.style.backgroundImage).toBe(norm(buttonStyle({ variant: 'primary' }).background as string))
    fireEvent.click(clear)
    expect(onClearFilters).toHaveBeenCalledTimes(1)
  })

  it('offers no action for the other two reasons — neither would bring the rows back', () => {
    render(<LocationList items={[]} selectedId={null} onSelect={() => undefined} emptyReason="no-data" onClearFilters={vi.fn()} />)
    expect(screen.queryByTestId('map-sheet-clear-filters')).not.toBeInTheDocument()
  })
})
