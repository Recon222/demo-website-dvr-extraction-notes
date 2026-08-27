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

/** Opens the New Location modal through the real affordance (Cases → expand the card →
 *  "Add Location"), which is what mints the draft write-guard token — `openModal('newLocation')`
 *  alone bypasses it. */
function openNewLocationModal(caseNumber: string) {
  // Expanding is a toggle, and the card stays expanded across a modal open/close — so only
  // expand when the action row isn't already on screen.
  if (!screen.queryByText('Add Location')) fireEvent.click(screen.getByText(caseNumber))
  fireEvent.click(screen.getByText('Add Location'))
}

/** Grants the render a location service for the duration of `run`. */
async function withGeolocation(geolocation: { getCurrentPosition: (ok: (p: GeolocationPosition) => void) => void }, run: () => Promise<void>) {
  Object.defineProperty(navigator, 'geolocation', { value: geolocation, configurable: true })
  try {
    await run()
  } finally {
    Reflect.deleteProperty(navigator, 'geolocation')
  }
}

const fixAt = (lat: number, lng: number, accuracy: number) =>
  ({
    coords: { latitude: lat, longitude: lng, accuracy, altitude: null, altitudeAccuracy: null, heading: null, speed: null },
    timestamp: Date.UTC(2026, 6, 30, 12, 0, 0),
  }) as GeolocationPosition

describe('DemoExperience — New Location GPS capture (P3.4, deferred §24)', { timeout: 20000 }, () => {
  it('creates the location with the captured fix stamped `gps`', async () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-LOCGPS', displayName: 'X', unit: 'Robbery' })
      store.getState().setView('cases')
    })
    openNewLocationModal('PR25-LOCGPS')
    fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Rear Door' } })

    await withGeolocation({ getCurrentPosition: (ok) => ok(fixAt(43.7, -79.4, 4)) }, async () => {
      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
      })
    })
    fireEvent.click(screen.getByText('Create Location'))

    const loc = store.getState().locations.find((l) => l.locationName === 'Rear Door')
    expect(loc?.gps).toEqual({ lat: 43.7, lng: -79.4, accuracyM: 4, source: 'gps' })
  })

  it('a capture abandoned by closing the modal cannot land on the NEXT draft', async () => {
    // The hazard this pins: `locForm` lives in DemoExperience and OUTLIVES the modal, so a fix
    // delivered after the close writes into whatever draft is open by then. The fix is therefore
    // delivered AFTER the reopen — before it, `addLocation`'s blank-on-open reset would mask the
    // contamination and make this test green for the wrong reason.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      store.getState().createCase({ caseNumber: 'PR25-ABANDON', displayName: 'X', unit: 'Robbery' })
      store.getState().setView('cases')
    })

    let deliver!: (p: GeolocationPosition) => void
    await withGeolocation({ getCurrentPosition: (ok) => { deliver = ok } }, async () => {
      openNewLocationModal('PR25-ABANDON')
      fireEvent.click(screen.getByRole('button', { name: 'Use Current Location' }))
      // The visitor gives up on the capture and closes the sheet, then starts a new one.
      fireEvent.click(screen.getByRole('button', { name: 'Close new location' }))
      openNewLocationModal('PR25-ABANDON')
      fireEvent.change(screen.getByLabelText('Location Name'), { target: { value: 'Untouched' } })

      await act(async () => {
        deliver(fixAt(43.7, -79.4, 4))
      })
    })

    expect(screen.queryByTestId('coordinate-display')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('Create Location'))

    const loc = store.getState().locations.find((l) => l.locationName === 'Untouched')
    expect(loc).toBeDefined()
    expect(loc?.gps).toBeUndefined()
  })
})
