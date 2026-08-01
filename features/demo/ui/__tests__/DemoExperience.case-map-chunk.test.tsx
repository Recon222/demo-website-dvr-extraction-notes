import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

/**
 * The Case Map builder is a LAZY chunk (it carries the ~85 KB template, which must stay out of
 * /demo's First Load). A lazy chunk can genuinely fail to arrive — the visitor is offline, or a
 * deploy has rotated the chunk hash under an open tab. Unhandled, that rejection is a button
 * that does nothing at all, silently, which is the one outcome this demo never ships.
 *
 * Since the P5 fix round the chunk is fetched when the map OPENS (review R-8), so the failure
 * is discovered before the press rather than during it — and the press still gets the honest
 * blocking terminal (review R-9).
 *
 * Its own file: `vi.doMock` on a dynamically-imported module id sticks for the rest of the
 * suite file even after `doUnmock` + `resetModules` (measured — the sibling export tests all
 * failed behind it), and vitest's module isolation is per FILE. Keeping it here means the
 * failure arm is pinned without the happy paths having to live around it.
 */

const { mapInstance } = vi.hoisted(() => {
  const mapInstance = {
    on: vi.fn((evt: string, cb: () => void) => {
      if (evt === 'load') cb()
    }),
    remove: vi.fn(), flyTo: vi.fn(), fitBounds: vi.fn(), setCenter: vi.fn(), setZoom: vi.fn(),
  }
  return { mapInstance }
})
vi.mock('mapbox-gl', () => {
  // Chainable Marker — see the sibling suite's note; `MapCanvas` does
  // `new Marker(...).setLngLat(...).addTo(map)` and this file waits long enough to observe it.
  function Marker(this: Record<string, unknown>) {
    this.setLngLat = () => this
    this.addTo = () => this
    this.remove = () => this
    return this
  }
  return { default: { Map: vi.fn(function () { return mapInstance }), Marker, accessToken: '' } }
})
vi.mock('@/features/demo/engine/logic/case-map', () => {
  throw new Error('ChunkLoadError: Loading chunk 225 failed')
})

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

beforeEach(() => vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test'))
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

describe('DemoExperience — Export Map, builder chunk unavailable', () => {
  it('says the builder could not be loaded instead of failing silently', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const clicks: string[] = []
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
      clicks.push(this.download)
    })

    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-CHUNK', displayName: 'ChunkCase', unit: 'R' })
      store.getState().addLocation(c, {
        locationName: 'Front Counter',
        streetAddress: '1450 Eglinton Ave W',
        city: 'Mississauga',
        gps: { lat: 43.6, lng: -79.6, source: 'geocoded' },
      })
    })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('ChunkCase'))
    // The prefetch settles as 'failed', which leaves the button LIVE — a mystery-disabled
    // control explains nothing, whereas a press gets the honest sentence.
    await waitFor(() => expect(screen.getByTestId('export-map-button')).toBeEnabled())
    fireEvent.click(screen.getByTestId('export-map-button'))

    // A BLOCKING dialog (review R-9), not the 2.6 s self-dismissing banner: this is a failure
    // about a real file.
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveTextContent('Export Error')
    expect(dialog).toHaveTextContent('The Case Map builder could not be loaded, so nothing was generated.')
    expect(dialog).toHaveTextContent('check your connection and try again')
    expect(screen.queryByTestId('demo-notification')).not.toBeInTheDocument()
    // No half-written file, and the failure is observable in the console too.
    expect(clicks).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})
