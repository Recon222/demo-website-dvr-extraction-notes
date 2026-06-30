import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NewCaseModal, type NewCaseFields } from '@/features/demo/ui/screens/NewCaseModal'

// Mock the autocomplete so we can fire a deterministic "pick" carrying coordinates
// (the real component needs the Mapbox SDK; without a token it never emits onPick).
vi.mock('@/features/demo/ui/inputs/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ label, value, onChange, onPick }: {
    label: string
    value: string
    onChange(v: string): void
    onPick(p: { streetAddress: string; city: string; coordinates?: { lng: number; lat: number } }): void
  }) => (
    <div>
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <button
        type="button"
        onClick={() => onPick({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga', coordinates: { lng: -79.6505, lat: 43.6087 } })}
      >
        mock-pick
      </button>
    </div>
  ),
}))

const blank: NewCaseFields = {
  caseNumber: '', displayName: '', unit: '', oicName: '', oicBadge: '', vcName: '', vcBadge: '',
  incidentBusinessName: '', incidentStreetAddress: '', incidentCity: '',
  incidentLatitude: '', incidentLongitude: '', incidentCoordinateSource: '', notes: '',
}

function renderModal(over: Partial<NewCaseFields> = {}, onChange = vi.fn()) {
  render(<NewCaseModal form={{ ...blank, ...over }} onChange={onChange} onSubmit={vi.fn()} onCancel={vi.fn()} />)
  return onChange
}

describe('NewCaseModal — incident coordinates', () => {
  it('renders Latitude and Longitude fields', () => {
    renderModal()
    expect(screen.getByLabelText('Latitude')).toBeInTheDocument()
    expect(screen.getByLabelText('Longitude')).toBeInTheDocument()
  })

  it('typing a latitude marks the source manual', () => {
    const onChange = renderModal()
    fireEvent.change(screen.getByLabelText('Latitude'), { target: { value: '43.65' } })
    expect(onChange).toHaveBeenCalledWith('incidentLatitude', '43.65')
    expect(onChange).toHaveBeenCalledWith('incidentCoordinateSource', 'manual')
  })

  it('shows an error when a coordinate is non-numeric on blur', () => {
    renderModal({ incidentLatitude: '43.6abc' })
    fireEvent.blur(screen.getByLabelText('Latitude'))
    expect(screen.getByText('Enter a valid number')).toBeInTheDocument()
  })

  it('shows a range error for an out-of-range latitude on blur', () => {
    renderModal({ incidentLatitude: '95' })
    fireEvent.blur(screen.getByLabelText('Latitude'))
    expect(screen.getByText('Latitude must be between -90 and 90')).toBeInTheDocument()
  })

  it('shows a range error for an out-of-range longitude on blur', () => {
    renderModal({ incidentLongitude: '200' })
    fireEvent.blur(screen.getByLabelText('Longitude'))
    expect(screen.getByText('Longitude must be between -180 and 180')).toBeInTheDocument()
  })

  it('renders a coordinate summary chip when both coordinates are valid', () => {
    renderModal({ incidentLatitude: '43.6087', incidentLongitude: '-79.6505', incidentCoordinateSource: 'geocoded' })
    expect(screen.getByText(/43\.608700, -79\.650500/)).toBeInTheDocument()
    expect(screen.getByText(/Geocoded/i)).toBeInTheDocument()
  })

  it('an address pick fills latitude + longitude and marks the source geocoded', () => {
    const onChange = renderModal()
    fireEvent.click(screen.getByText('mock-pick'))
    expect(onChange).toHaveBeenCalledWith('incidentLatitude', '43.6087')
    expect(onChange).toHaveBeenCalledWith('incidentLongitude', '-79.6505')
    expect(onChange).toHaveBeenCalledWith('incidentCoordinateSource', 'geocoded')
  })
})
