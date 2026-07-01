import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { NewLocationModal } from '@/features/demo/ui/screens/NewLocationModal'
import { SubmissionScreen } from '@/features/demo/ui/screens/SubmissionScreen'

// Recovery locations are geocode-only (no manual coord fields — a DVR always has a real address).
// Mock the autocomplete so a "pick" deterministically carries coordinates.
vi.mock('@/features/demo/ui/inputs/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ label, value, onChange, onPick }: {
    label: string
    value: string
    onChange(v: string): void
    onPick(p: { streetAddress: string; city: string; coordinates?: { lng: number; lat: number } }): void
  }) => (
    <div>
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => onPick({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga', coordinates: { lng: -79.6505, lat: 43.6087 } })}>
        mock-pick
      </button>
    </div>
  ),
}))

describe('NewLocationModal — geocoded coordinates', () => {
  const form = { locationName: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }
  it('forwards { lat, lng } to onPickCoords on an address pick', () => {
    const onPickCoords = vi.fn()
    render(<NewLocationModal form={form} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} onCaptureGps={vi.fn()} onPickCoords={onPickCoords} />)
    fireEvent.click(screen.getByText('mock-pick'))
    expect(onPickCoords).toHaveBeenCalledWith({ lat: 43.6087, lng: -79.6505 })
  })

  it('has no manual Latitude/Longitude fields (geocode-only)', () => {
    render(<NewLocationModal form={form} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} onCaptureGps={vi.fn()} onPickCoords={vi.fn()} />)
    expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Longitude')).not.toBeInTheDocument()
  })
})

describe('SubmissionScreen — geocoded coordinates', () => {
  const fields = { requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }
  it('forwards { lat, lng } to onPickCoords on an address pick', () => {
    const onPickCoords = vi.fn()
    render(<SubmissionScreen occNumber="OCC" fields={fields} onChange={vi.fn()} onNext={vi.fn()} onBack={vi.fn()} onMenu={vi.fn()} onPickCoords={onPickCoords} />)
    fireEvent.click(screen.getByText('mock-pick'))
    expect(onPickCoords).toHaveBeenCalledWith({ lat: 43.6087, lng: -79.6505 })
  })
})
