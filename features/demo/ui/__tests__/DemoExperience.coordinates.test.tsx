import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// Mock the autocomplete so a "pick" deterministically forwards coordinates through the bridge.
vi.mock('@/features/demo/ui/inputs/AddressAutocomplete', () => ({
  AddressAutocomplete: ({ label, value, onChange, onPick }: {
    label: string
    value: string
    onChange(v: string): void
    onPick(p: { streetAddress: string; city: string; coordinates?: { lng: number; lat: number }; accuracyM?: number }): void
  }) => (
    <div>
      <input aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} />
      <button type="button" onClick={() => onPick({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga', coordinates: { lng: -79.6505, lat: 43.6087 } })}>
        mock-pick
      </button>
      <button type="button" onClick={() => onPick({ streetAddress: '1450 Eglinton Ave W', city: 'Mississauga', coordinates: { lng: -79.6505, lat: 43.6087 }, accuracyM: 5 })}>
        mock-pick-rooftop
      </button>
    </div>
  ),
}))

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

// Generous suite timeout (R-6): full-experience renders are heavy under jsdom and this file
// runs alongside sibling suites under CPU contention (observed 5.8s on a loaded runner) —
// not a loop; isolation runs finish well inside the default.
describe('DemoExperience — geocoded coordinates bridge', { timeout: 20000 }, () => {
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
    // No accuracyM: a non-rooftop geocode measured nothing, and the demo stores no placeholder
    // for it (a "±0m · Excellent" chip would be fabricated precision).
    expect(loc?.gps).toEqual({ lat: 43.6087, lng: -79.6505, source: 'geocoded' })
  })

  it('carries the rooftop accuracy estimate through a New Location pick', () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-ROOF', displayName: 'X', unit: 'Robbery' })
      store.getState().openModal('newLocation')
    })
    fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Roof Cam' } })
    fireEvent.click(screen.getByText('mock-pick-rooftop'))
    fireEvent.click(screen.getByText('Create Location'))

    const loc = store.getState().locations.find((l) => l.locationName === 'Roof Cam')
    expect(loc?.gps).toEqual({ lat: 43.6087, lng: -79.6505, accuracyM: 5, source: 'geocoded' })
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
    expect(loc?.gps).toEqual({ lat: 43.6087, lng: -79.6505, source: 'geocoded' })
  })

  it('a Submission GPS capture stores the fix stamped `gps`, over a prior geocoded pick', async () => {
    // The reconciliation row 29 asks for: both coordinate sources take the same write path, so a
    // real capture always supersedes (and re-stamps) whatever the address pick left behind.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-GPS', displayName: 'X', unit: 'Robbery' })
      store.getState().addLocation(c, { locationName: 'Loading Bay' })
      store.getState().setView('submission')
    })
    fireEvent.click(screen.getByText('mock-pick'))
    expect(store.getState().locations[0]?.gps?.source).toBe('geocoded')

    // Grant the browser a location service for this render only.
    const geolocation = {
      getCurrentPosition: (onSuccess: (p: GeolocationPosition) => void) =>
        onSuccess({
          coords: { latitude: 43.7, longitude: -79.4, accuracy: 4, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
          timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
        } as GeolocationPosition),
    }
    Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
    try {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
      })
    } finally {
      Reflect.deleteProperty(navigator, 'geolocation')
    }

    expect(store.getState().locations[0]?.gps).toEqual({ lat: 43.7, lng: -79.4, accuracyM: 4, source: 'gps' })
    expect(screen.getByTestId('coordinate-display-source')).toHaveTextContent('GPS')
  })
})
