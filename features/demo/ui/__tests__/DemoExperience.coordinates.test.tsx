import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// Mock the autocomplete so a "pick" deterministically forwards coordinates through the bridge.
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

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

describe('DemoExperience — geocoded coordinates bridge', () => {
  it('a New Location address pick stores geocoded gps on the new location', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-GEO', displayName: 'X', unit: 'Robbery' })
      store.getState().openModal('newLocation')
    })
    fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Rear Door' } })
    fireEvent.click(screen.getByText('mock-pick'))
    fireEvent.click(screen.getByText('Create Location'))

    const loc = store.getState().locations.find((l) => l.locationName === 'Rear Door')
    expect(loc?.gps).toEqual({ lat: 43.6087, lng: -79.6505, accuracyM: 0, source: 'geocoded' })
  })

  it('a Submission address pick updates the current location gps', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-SUB', displayName: 'X', unit: 'Robbery' })
      store.getState().addLocation(c, { locationName: 'Front Counter' })
      store.getState().setView('submission')
    })
    fireEvent.click(screen.getByText('mock-pick'))

    const loc = store.getState().locations.find((l) => l.locationName === 'Front Counter')
    expect(loc?.gps).toEqual({ lat: 43.6087, lng: -79.6505, accuracyM: 0, source: 'geocoded' })
  })
})
