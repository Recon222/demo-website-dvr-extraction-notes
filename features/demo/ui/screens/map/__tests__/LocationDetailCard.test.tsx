import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationDetailCard } from '@/features/demo/ui/screens/map/LocationDetailCard'
import type { LocationSheetItem, IncidentSheetItem } from '@/features/demo/ui/screens/map/mapData'

const fullLoc: LocationSheetItem = {
  kind: 'location', id: 'l1', locationName: 'Rear door', businessName: 'Kim Convenience', address: '1450 Eglinton, Mississauga',
  status: 'working', coord: [-79.61, 43.61], streetAddress: '1450 Eglinton', city: 'Mississauga',
  requesterName: 'Liam McHugh', requesterBadge: '4471', requesterUnit: 'Central Robbery', requesterPhone: '905-555-1234', requesterEmail: 'det@peel.ca',
  locationContact: 'Sandeep Gill', locationPhone: '905-555-0142', coordinateSource: 'geocoded',
}
const bareLoc: LocationSheetItem = { ...fullLoc, id: 'l2', requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', locationContact: '', locationPhone: '' }
const incItem: IncidentSheetItem = { kind: 'incident', id: 'c1', caseNumber: 'PR25-1', displayName: 'Kim B&E', businessName: 'Kim', streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.5, 43.5] }

const cb = () => ({ onBack: vi.fn(), onCall: vi.fn(), onEmail: vi.fn(), onGoToLocation: vi.fn() })

describe('LocationDetailCard', () => {
  it('location variant renders requester + contact and fires call/email/go-to', () => {
    const c = cb()
    render(<LocationDetailCard item={fullLoc} {...c} />)
    expect(screen.getByText(/Liam McHugh/)).toBeInTheDocument()
    expect(screen.getByText('Central Robbery')).toBeInTheDocument()
    expect(screen.getByText('Sandeep Gill')).toBeInTheDocument()
    fireEvent.click(screen.getByText('905-555-1234'))
    expect(c.onCall).toHaveBeenCalledWith('905-555-1234')
    fireEvent.click(screen.getByText('det@peel.ca'))
    expect(c.onEmail).toHaveBeenCalledWith('det@peel.ca')
    fireEvent.click(screen.getByText('905-555-0142'))
    expect(c.onCall).toHaveBeenCalledWith('905-555-0142')
    fireEvent.click(screen.getByText('Go to Location'))
    expect(c.onGoToLocation).toHaveBeenCalledWith('l1')
  })

  it('hides the requester and contact cards when those fields are empty', () => {
    render(<LocationDetailCard item={bareLoc} {...cb()} />)
    expect(screen.queryByText('Requester')).not.toBeInTheDocument()
    expect(screen.queryByText('Contact')).not.toBeInTheDocument()
  })

  it('incident variant shows the headline + Incident chip and no Go to Location', () => {
    render(<LocationDetailCard item={incItem} {...cb()} />)
    expect(screen.getByText('Kim B&E')).toBeInTheDocument()
    expect(screen.getByText('Incident')).toBeInTheDocument()
    expect(screen.queryByText('Go to Location')).not.toBeInTheDocument()
  })

  it('back fires onBack', () => {
    const c = cb()
    render(<LocationDetailCard item={fullLoc} {...c} />)
    fireEvent.click(screen.getByText(/All Locations/))
    expect(c.onBack).toHaveBeenCalled()
  })
})
