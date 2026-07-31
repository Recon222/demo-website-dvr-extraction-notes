import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { LocationDetailCard } from '@/features/demo/ui/screens/map/LocationDetailCard'
import type { LocationSheetItem, IncidentSheetItem } from '@/features/demo/ui/screens/map/mapData'

const fullLoc: LocationSheetItem = {
  kind: 'location', id: 'l1', locationName: 'Rear door', businessName: 'Kim Convenience', address: '1450 Eglinton, Mississauga',
  status: 'working', coord: [-79.61, 43.61], streetAddress: '1450 Eglinton', city: 'Mississauga',
  requesterName: 'Liam McHugh', requesterBadge: '4471', requesterUnit: 'Central Robbery', requesterPhone: '905-555-1234', requesterEmail: 'det@peel.ca',
  locationContact: 'Sandeep Gill', locationPhone: '905-555-0142', coordinateSource: 'geocoded', cameras: [],
}
const bareLoc: LocationSheetItem = { ...fullLoc, id: 'l2', requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', locationContact: '', locationPhone: '' }
const incItem: IncidentSheetItem = { kind: 'incident', id: 'c1', caseNumber: 'PR25-1', displayName: 'Kim B&E', businessName: 'Kim', streetAddress: '1450 Eglinton', city: 'Mississauga', address: '1450 Eglinton, Mississauga', coord: [-79.5, 43.5] }

const cb = () => ({ onBack: vi.fn(), onCall: vi.fn(), onEmail: vi.fn(), onGoToLocation: vi.fn(), onEditIncident: vi.fn() })

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

  // Matrix row 22's sole delta: the incident card is the ONLY entry to the incident editor
  // (row 23). Without this button the modal is unreachable.
  it('incident variant offers Edit Incident Location, firing with the case id', () => {
    const c = cb()
    render(<LocationDetailCard item={incItem} {...c} />)
    fireEvent.click(screen.getByText('Edit Incident Location'))
    expect(c.onEditIncident).toHaveBeenCalledWith('c1')
  })

  it('does NOT offer Edit Incident Location on a recovery location', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} />)
    expect(screen.queryByText('Edit Incident Location')).not.toBeInTheDocument()
  })

  it('back fires onBack', () => {
    const c = cb()
    render(<LocationDetailCard item={fullLoc} {...c} />)
    fireEvent.click(screen.getByText(/All Locations/))
    expect(c.onBack).toHaveBeenCalled()
  })
})

// ---- cameras toggle (P6.1) ------------------------------------------------------------------
describe('LocationDetailCard — cameras toggle', () => {
  const cam = (id: string, name: string) => ({ id, locationId: 'l1', cameraName: name, lng: -79.61, lat: 43.61 })
  const withCameras = { ...fullLoc, cameras: [cam('l1:c1', 'Front'), cam('l1:c2', 'Rear')] }

  it('is absent when the location has no geolocated cameras', () => {
    render(<LocationDetailCard item={fullLoc} {...cb()} onToggleCameras={vi.fn()} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })

  it('is absent when no handler can act on it — never a button that swallows the press', () => {
    render(<LocationDetailCard item={withCameras} {...cb()} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })

  it('offers "Show cameras (N)" while hidden, with the phone accessibility label', () => {
    render(<LocationDetailCard item={withCameras} {...cb()} onToggleCameras={vi.fn()} />)
    const toggle = screen.getByTestId('detail-cameras-toggle')
    expect(toggle).toHaveTextContent('Show cameras (2)')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    expect(toggle).toHaveAccessibleName('Show 2 cameras on the map')
  })

  it('flips to "Hide cameras (N)" when shown', () => {
    render(<LocationDetailCard item={withCameras} {...cb()} camerasShown onToggleCameras={vi.fn()} />)
    const toggle = screen.getByTestId('detail-cameras-toggle')
    expect(toggle).toHaveTextContent('Hide cameras (2)')
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(toggle).toHaveAccessibleName('Hide 2 cameras on the map')
  })

  it('singularises a lone camera in the accessibility label', () => {
    render(<LocationDetailCard item={{ ...fullLoc, cameras: [cam('l1:c1', 'Front')] }} {...cb()} onToggleCameras={vi.fn()} />)
    expect(screen.getByTestId('detail-cameras-toggle')).toHaveAccessibleName('Show 1 camera on the map')
  })

  it('fires the toggle', () => {
    const onToggleCameras = vi.fn()
    render(<LocationDetailCard item={withCameras} {...cb()} onToggleCameras={onToggleCameras} />)
    fireEvent.click(screen.getByTestId('detail-cameras-toggle'))
    expect(onToggleCameras).toHaveBeenCalledTimes(1)
  })

  it('never appears on the incident variant', () => {
    render(<LocationDetailCard item={incItem} {...cb()} camerasShown onToggleCameras={vi.fn()} />)
    expect(screen.queryByTestId('detail-cameras-toggle')).not.toBeInTheDocument()
  })
})
