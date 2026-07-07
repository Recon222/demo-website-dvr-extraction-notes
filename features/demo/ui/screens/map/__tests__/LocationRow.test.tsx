import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import type { LocationSheetItem, IncidentSheetItem } from '@/features/demo/ui/screens/map/mapData'

const locItem: LocationSheetItem = {
  kind: 'location', id: 'l1', locationName: 'Rear door', businessName: 'Kim', address: '1450 Eglinton, Mississauga',
  status: 'started', coord: [-79.6, 43.6], streetAddress: '1450 Eglinton', city: 'Mississauga',
  requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '',
  locationContact: '', locationPhone: '', coordinateSource: 'geocoded',
}
const incItem: IncidentSheetItem = {
  kind: 'incident', id: 'c1', caseNumber: 'PR25-1', displayName: 'Kim B&E', businessName: 'Kim',
  streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.6, 43.6],
}

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
})
