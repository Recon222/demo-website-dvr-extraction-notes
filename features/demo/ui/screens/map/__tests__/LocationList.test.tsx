import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationList } from '@/features/demo/ui/screens/map/LocationList'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'

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
})
