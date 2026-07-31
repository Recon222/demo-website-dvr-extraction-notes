import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

/**
 * The Case Map builder is a LAZY chunk (it carries the ~85 KB template, which must stay out of
 * /demo's First Load). A lazy chunk can genuinely fail to arrive — the visitor is offline, or a
 * deploy has rotated the chunk hash under an open tab. Unhandled, that rejection is a button
 * that does nothing at all, silently, which is the one outcome this demo never ships.
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
vi.mock('mapbox-gl', () => ({
  default: { Map: vi.fn(function () { return mapInstance }), Marker: vi.fn(), accessToken: '' },
}))
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
    fireEvent.click(screen.getByTestId('export-map-button'))

    expect(await screen.findByTestId('demo-notification')).toHaveTextContent(
      "Export Error — the Case Map builder couldn't be loaded. Check your connection and try again.",
    )
    // No half-written file, and the failure is observable in the console too.
    expect(clicks).toEqual([])
    expect(warn).toHaveBeenCalled()
  })
})
