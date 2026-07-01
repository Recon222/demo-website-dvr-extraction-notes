import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MapBottomSheet } from '@/features/demo/ui/screens/map/MapBottomSheet'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'

const items: SheetItem[] = [
  { kind: 'incident', id: 'c1', caseNumber: 'PR25-1', displayName: 'Kim B&E', businessName: 'Kim', streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.6, 43.6] },
  { kind: 'location', id: 'l1', locationName: 'Rear door', businessName: 'Kim', address: '1450 Eglinton, Mississauga', status: 'started', coord: [-79.61, 43.61], streetAddress: '1450 Eglinton', city: 'Mississauga', requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', locationContact: '', locationPhone: '', coordinateSource: 'geocoded' },
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
})
