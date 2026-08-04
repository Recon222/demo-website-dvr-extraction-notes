import { describe, it, expect, afterEach, vi } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'

import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import type { GeolocationLike } from '@/features/demo/ui/inputs/capture-gps'

/**
 * Per-camera GPS through the STORE BRIDGE (P3.7) — the layer the component tests can't reach.
 *
 * The bug this file exists to prevent: `listEditHandlers.change(index, patch)` closes over the
 * camera array of the render that created it. A precise capture runs for up to 120 s, so by the
 * time its fix lands that array can be stale — and writing it back would resurrect any row
 * removed meanwhile, or land the fix on whatever camera now occupies that index. The bridge
 * therefore routes camera fixes through `setCameraGps`, which re-resolves the camera BY ID
 * against current state.
 */

const position = (accuracy: number) =>
  ({
    coords: {
      latitude: 43.608701,
      longitude: -79.650502,
      accuracy,
      altitude: null,
      altitudeAccuracy: null,
      heading: null,
      speed: null,
    },
    timestamp: Date.UTC(2026, 6, 30, 14, 5, 6),
  }) as GeolocationPosition

/** vitest.setup.ts deliberately leaves `navigator.geolocation` undefined (the UNSUPPORTED path
 *  is the default tested contract), so a bridge test that needs a real capture installs one for
 *  its own duration and removes it again. */
function installGeolocation(geo: GeolocationLike): void {
  Object.defineProperty(navigator, 'geolocation', { value: geo, configurable: true, writable: true })
}
afterEach(() => {
  Reflect.deleteProperty(navigator, 'geolocation')
  vi.restoreAllMocks()
})

function camerasScreen(store: DemoStore) {
  act(() => {
    store.getState().createCase({ caseNumber: 'PR25-CAMGPS', displayName: 'X', unit: 'Robbery' })
    store.getState().addLocation(store.getState().cases[0].id, {
      locationName: 'Rear Door',
      businessName: '',
      streetAddress: '1450 Eglinton Ave W',
      city: 'Mississauga',
    })
    store.getState().setView('cameras')
  })
}

const camerasOf = (store: DemoStore) =>
  store.getState().locations.find((l) => l.id === store.getState().currentLocationId)!.form.cameras

describe('DemoExperience — per-camera GPS bridge', { timeout: 20000 }, () => {
  it('commits the fix onto the camera it was captured for', () => {
    installGeolocation({ getCurrentPosition: (onSuccess) => onSuccess(position(6)) })
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    camerasScreen(store)

    fireEvent.click(screen.getByText('+ Add Camera'))
    const [cam] = camerasOf(store)

    return act(async () => {
      fireEvent.click(within(screen.getByTestId(`camera-gps-${cam.id}`)).getByRole('button'))
    }).then(() => {
      expect(camerasOf(store)[0].gps).toEqual({
        lat: 43.608701,
        lng: -79.650502,
        accuracyM: 6,
        source: 'gps',
        capturedAt: '2026-07-30T14:05:06.000Z',
      })
    })
  })

  it('does NOT resurrect a row removed while another row was capturing', async () => {
    // The regression this package's bridge wiring exists to prevent.
    let deliver!: (p: GeolocationPosition) => void
    installGeolocation({ getCurrentPosition: (onSuccess) => { deliver = onSuccess } })
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    camerasScreen(store)

    fireEvent.click(screen.getByText('+ Add Camera'))
    fireEvent.click(screen.getByText('+ Add Camera'))
    const [first, second] = camerasOf(store)

    fireEvent.click(within(screen.getByTestId(`camera-gps-${first.id}`)).getByRole('button'))
    // The visitor deletes the SECOND camera while the first is still sampling.
    fireEvent.click(screen.getAllByText('Remove')[1])
    expect(camerasOf(store).map((c) => c.id)).toEqual([first.id])

    await act(async () => {
      deliver(position(5))
    })

    expect(camerasOf(store).map((c) => c.id)).toEqual([first.id])
    expect(camerasOf(store)[0].gps?.source).toBe('gps')
    expect(camerasOf(store).some((c) => c.id === second.id)).toBe(false)
  })

  it('writes nothing when the CAPTURING row is removed mid-capture', async () => {
    let deliver!: (p: GeolocationPosition) => void
    installGeolocation({ getCurrentPosition: (onSuccess) => { deliver = onSuccess } })
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    camerasScreen(store)

    fireEvent.click(screen.getByText('+ Add Camera'))
    fireEvent.click(screen.getByText('+ Add Camera'))
    const [first, second] = camerasOf(store)

    fireEvent.click(within(screen.getByTestId(`camera-gps-${second.id}`)).getByRole('button'))
    fireEvent.click(screen.getAllByText('Remove')[1])

    await act(async () => {
      deliver(position(5))
    })

    expect(camerasOf(store).map((c) => c.id)).toEqual([first.id])
    expect(camerasOf(store)[0].gps).toBeUndefined()
  })
})
