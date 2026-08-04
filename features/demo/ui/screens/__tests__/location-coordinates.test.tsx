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
  it('forwards the picked coordinates stamped `geocoded` on the single coordinate write path', () => {
    const onChange = vi.fn()
    render(<NewLocationModal form={form} onChange={onChange} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    fireEvent.click(screen.getByText('mock-pick'))
    // One patch carries street, city AND the fix — `LocationFields` decides the provenance
    // stamp for both the pick and the capture path (P3.4).
    expect(onChange).toHaveBeenCalledWith({
      streetAddress: '1450 Eglinton Ave W',
      city: 'Mississauga',
      coordinates: { lat: 43.6087, lng: -79.6505, source: 'geocoded' },
    })
  })

  it('has no manual Latitude/Longitude fields (geocode-or-capture only)', () => {
    render(<NewLocationModal form={form} onChange={vi.fn()} onSubmit={vi.fn()} onCancel={vi.fn()} />)
    expect(screen.queryByLabelText('Latitude')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Longitude')).not.toBeInTheDocument()
  })
})

describe('SubmissionScreen — geocoded coordinates', () => {
  const fields = { requesterName: '', requesterBadge: '', requesterUnit: '', requesterPhone: '', requesterEmail: '', businessName: '', streetAddress: '', city: '', locationContact: '', locationPhone: '' }
  it('stamps an address pick as `geocoded` on the single coordinate write path', () => {
    const onCoordinates = vi.fn()
    render(<SubmissionScreen occNumber="OCC" fields={fields} isFieldVisible={() => true} onChange={vi.fn()} onNext={vi.fn()} onBack={vi.fn()} onMenu={vi.fn()} onCoordinates={onCoordinates} />)
    fireEvent.click(screen.getByText('mock-pick'))
    expect(onCoordinates).toHaveBeenCalledWith({ lat: 43.6087, lng: -79.6505, accuracyM: undefined, source: 'geocoded' })
  })

  it('does NOT stamp coordinates from a pick while the coordinate group is hidden (R-2b)', () => {
    // The gate is not display-only: with the group off there is no control that can show,
    // verify or clear a coordinate, so nothing may create one. Street and city are always-on
    // and still write — the visitor's address entry is untouched.
    const onCoordinates = vi.fn()
    const onChange = vi.fn()
    render(
      <SubmissionScreen
        occNumber="OCC"
        fields={fields}
        isFieldVisible={(id) => id !== 'submission.latitude'}
        onChange={onChange}
        onNext={vi.fn()}
        onBack={vi.fn()}
        onMenu={vi.fn()}
        onCoordinates={onCoordinates}
      />,
    )
    fireEvent.click(screen.getByText('mock-pick'))
    expect(onCoordinates).not.toHaveBeenCalled()
    expect(onChange).toHaveBeenCalledWith('streetAddress', '1450 Eglinton Ave W')
    expect(onChange).toHaveBeenCalledWith('city', 'Mississauga')
  })
})
