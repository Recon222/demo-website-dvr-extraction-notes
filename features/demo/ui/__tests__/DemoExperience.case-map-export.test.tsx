import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act, within, waitFor } from '@testing-library/react'
import { createDemoStore } from '@/features/demo/engine/store/create-store'

// mapbox-gl is mocked (no WebGL); constructable (non-arrow) so `new mapboxgl.Map(...)` works.
//
// `Marker` is CHAINABLE here, unlike the thinner mock the sibling map suites use. `MapCanvas`
// does `new Marker(...).setLngLat(...).addTo(map)` (MapCanvas.tsx:160-162), which throws on a
// bare `vi.fn()`. Those suites never observe it because they assert synchronously and the
// marker pass runs after the map's async `load`; this file waits for the export footer to
// settle, so the throw reaches the error boundary and takes the whole screen down.
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
  function Marker(this: Record<string, unknown>) {
    this.setLngLat = () => this
    this.addTo = () => this
    this.remove = () => this
    return this
  }
  return { default: { Map: vi.fn(function () { return mapInstance }), Marker, accessToken: '' } }
})

import { DemoExperience } from '@/features/demo/ui/DemoExperience'

/**
 * The Case Map export is the demo's ONE real download (decision D4), so these drive the
 * genuine save path and inspect the file that actually leaves — no mock of the builders.
 */
const saved: Array<{ url: string; filename: string; blob: Blob }> = []

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', 'pk.test')
  saved.length = 0
  // Capture the real Blob at the moment the real anchor is clicked at the real object URL.
  const blobsByUrl = new Map<string, Blob>()
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob: Blob | MediaSource) => {
    const url = `blob:test/${blobsByUrl.size}`
    blobsByUrl.set(url, blob as Blob)
    return url
  })
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    const url = this.getAttribute('href') ?? ''
    saved.push({ url, filename: this.download, blob: blobsByUrl.get(url) ?? new Blob() })
  })
})
afterEach(() => {
  vi.unstubAllEnvs()
  vi.restoreAllMocks()
})

/**
 * Boot into a case's map, with one plotted location by default, and WAIT for the Case Map
 * builder chunk to arrive — the footer disables itself until then (review R-8), and the export
 * is synchronous from that point on.
 */
async function openMap(opts: { located?: boolean } = {}) {
  const store = createDemoStore()
  render(<DemoExperience store={store} />)
  act(() => {
    const c = store.getState().createCase({ caseNumber: 'PR25-MAP', displayName: 'MapCase', unit: 'Central Robbery' })
    store.getState().updateIncidentLocation(c, {
      incidentBusinessName: '',
      incidentStreetAddress: '1 Main St',
      incidentCity: 'Mississauga',
      incidentCoordinates: { lat: 43.7, lng: -79.4, source: 'geocoded' },
    })
    store.getState().addLocation(c, {
      locationName: 'Front Counter',
      streetAddress: '1450 Eglinton Ave W',
      city: 'Mississauga',
      ...(opts.located === false ? {} : { gps: { lat: 43.6, lng: -79.6, source: 'geocoded' as const } }),
    })
  })
  fireEvent.click(screen.getByLabelText('Map'))
  fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('MapCase'))
  await waitFor(() => expect(screen.getByTestId('export-map-button')).toBeEnabled())
  return store
}

/** Press Export Map. Synchronous by contract once the builder is resident, so the terminal
 *  dialog is up by the time this returns. */
const pressExportMap = () => fireEvent.click(screen.getByTestId('export-map-button'))
const terminal = () => screen.getByRole('alertdialog')

const savedHtml = async () => (saved.length ? await saved[0].blob.text() : '')

describe('DemoExperience — Export Map', () => {
  it('the list footer offers Export Map once a case is on the map', async () => {
    await openMap()
    const button = screen.getByTestId('export-map-button')
    expect(button).toHaveTextContent('Export Map')
    expect(button).toHaveAccessibleName('Export case map')
  })

  it('downloads a real, self-contained HTML file named after the case', async () => {
    await openMap()
    pressExportMap()
    await waitFor(() => expect(saved).toHaveLength(1))

    expect(saved[0].filename).toBe('MapCase-Case-Map.html')
    expect(saved[0].blob.type).toBe('text/html')
    const html = await savedHtml()
    expect(html.startsWith('<!DOCTYPE html>')).toBe(true)
    // Self-contained: the CSS and the app JS are inlined, no relative asset is requested.
    expect(html).not.toMatch(/<script src="(?!https:\/\/)/)
    expect(html).toContain('<title>Case Map — PR25-MAP</title>')
  })

  it('embeds the visitor’s own case — incident, located site, and the injected token', async () => {
    await openMap()
    pressExportMap()
    await waitFor(() => expect(saved).toHaveLength(1))

    const html = await savedHtml()
    const geojson = JSON.parse(
      html.match(/<script type="application\/json" id="case-geojson">([\s\S]*?)<\/script>/)![1],
    )
    expect(geojson.features.map((f: { properties: { featureType: string } }) => f.properties.featureType)).toEqual([
      'incident',
      'location',
    ])
    expect(geojson.features[1].properties.locationName).toBe('Front Counter')

    const meta = JSON.parse(html.match(/<script type="application\/json" id="case-meta">([\s\S]*?)<\/script>/)![1])
    expect(meta).toMatchObject({ caseNumber: 'PR25-MAP', displayName: 'MapCase', unit: 'Central Robbery' })
    expect(html).toContain("var TOKEN = 'pk.test'")
  })

  it('claims only what it can know — the browser was ASKED (review R-2)', async () => {
    // `HTMLAnchorElement.click()` is fire-and-forget; a suppressed download throws nothing. The
    // phone's "exported successfully" is true on a filesystem and unknowable in a tab.
    await openMap()
    pressExportMap()
    const notice = terminal()
    expect(notice).toHaveTextContent('Case Map Ready')
    expect(notice).toHaveTextContent(
      'Your browser was asked to save MapCase-Case-Map.html. Check your downloads.',
    )
    expect(notice).not.toHaveTextContent('exported successfully')
  })

  it('names the locations left off the map, even when the incident pin is on it (review R-1)', async () => {
    // The pin the old predicate counted. An incident-only case is NOT an empty map — but its
    // one recovery site is missing from the file, and that was said nowhere: the banner read a
    // bare "Success" and this test used to pin the silence.
    await openMap({ located: false })
    pressExportMap()
    const notice = terminal()
    expect(notice).toHaveTextContent('None of its 1 location have coordinates yet, so none of them are on the map.')
    // Still not an "empty map" — the incident teardrop is there.
    expect(notice).not.toHaveTextContent('opens with an empty map')
    await waitFor(() => expect(saved).toHaveLength(1))
    const features = JSON.parse((await savedHtml()).match(/id="case-geojson">([\s\S]*?)<\/script>/)![1]).features
    expect(features.map((f: { properties: { featureType: string } }) => f.properties.featureType)).toEqual(['incident'])
  })

  it('counts the un-plotted locations in the demo’s normal mixed state (review R-1)', async () => {
    // 1 picked, 2 typed — the probe-verified scenario. The file genuinely holds one of three,
    // and the sentence has to say so.
    const store = await openMap()
    act(() => {
      const caseId = store.getState().cases[0].id
      store.getState().addLocation(caseId, { locationName: 'Rear Alley', streetAddress: '9 Back Ln', city: 'Mississauga' })
      store.getState().addLocation(caseId, { locationName: 'Loading Bay', streetAddress: '11 Dock Rd', city: 'Mississauga' })
    })
    pressExportMap()
    expect(terminal()).toHaveTextContent(
      '2 of 3 locations have no coordinates yet and are not on the map.',
    )
    await waitFor(() => expect(saved).toHaveLength(1))
    const features = JSON.parse((await savedHtml()).match(/id="case-geojson">([\s\S]*?)<\/script>/)![1]).features
    expect(features.filter((f: { properties: { featureType: string } }) => f.properties.featureType === 'location')).toHaveLength(1)
  })

  it('does not call a camera-only map empty (delta D-1)', async () => {
    // Probe-reproduced. No incident fix, a location typed rather than picked (no `gps`), and a
    // camera carrying a fix from P3.7's crosshair — so the collection is CAMERA-ONLY.
    // `hasPlottableFeatures` reads false (no site framing, §71g's question), but the exported
    // file renders that camera pin, so the old sentence was flatly false about a file the
    // visitor is holding, printed beside a true coverage clause.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-CAM', displayName: 'CamCase', unit: 'R' })
      const locId = store.getState().addLocation(c, {
        locationName: 'Rear Alley', streetAddress: '9 Back Ln', city: 'Mississauga',
      })
      store.getState().switchLocation(locId)
      store.getState().updateField('form.cameras', [
        { id: 'cam1', cameraName: 'Till', resolution: '', recordingFps: '' },
      ])
      store.getState().setCameraGps('cam1', {
        lat: 43.61, lng: -79.61, source: 'gps', capturedAt: '2025-03-08T12:00:00.000Z',
      })
    })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('CamCase'))
    await waitFor(() => expect(screen.getByTestId('export-map-button')).toBeEnabled())
    pressExportMap()

    const notice = terminal()
    expect(notice).not.toHaveTextContent('opens with an empty map')
    // The true half still fires: the SITE is missing, and that is a different sentence.
    expect(notice).toHaveTextContent('None of its 1 location have coordinates yet')
    await waitFor(() => expect(saved).toHaveLength(1))
    const features = JSON.parse((await savedHtml()).match(/id="case-geojson">([\s\S]*?)<\/script>/)![1]).features
    expect(features.map((f: { properties: { featureType: string } }) => f.properties.featureType)).toEqual(['camera'])
  })

  it('says nothing about coverage when every location made it in', async () => {
    await openMap()
    pressExportMap()
    const notice = terminal()
    expect(notice).not.toHaveTextContent('not on the map')
    expect(notice).not.toHaveTextContent('no locations yet')
  })

  it('warns that the basemap will be blank when no Mapbox token is configured', async () => {
    vi.stubEnv('NEXT_PUBLIC_MAPBOX_TOKEN', '')
    await openMap()
    pressExportMap()
    expect(terminal()).toHaveTextContent(
      'Without a Mapbox token its basemap stays blank.',
    )
    // The file is still real, and still carries the case data.
    await waitFor(() => expect(saved).toHaveLength(1))
    expect(await savedHtml()).toContain("var TOKEN = ''")
  })

  it('reports an honest failure — and no fake success — when the browser refuses to save', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {
      throw new Error('blocked')
    })
    await openMap()
    pressExportMap()
    const notice = terminal()
    expect(notice).toHaveTextContent('Export Error')
    expect(notice).toHaveTextContent('this browser refused to save it, so no file was handed over')
    expect(saved).toHaveLength(0)
    expect(warn).toHaveBeenCalled()
  })

  it('BLOCKS on every outcome — a real file is not something to auto-dismiss (review R-9)', async () => {
    // Every simulated ZIP terminal already blocked; the one REAL export's outcomes went to the
    // 2.6 s self-dismissing banner, which is D4's rule inverted. Both arms are dialogs now.
    await openMap()
    pressExportMap()
    expect(terminal()).toBeInTheDocument()
    expect(screen.queryByTestId('demo-notification')).not.toBeInTheDocument()
    fireEvent.click(screen.getByText('OK'))
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument()
  })

  it('leaves no window between the press and its outcome (review R-8)', async () => {
    // The handler used to fetch its own 22 kB chunk, so the press produced NOTHING visible
    // while the network worked — and a visitor who pressed again got N builds and N downloads,
    // with the later ones tripping Chrome's multiple-download blocking. The chunk is fetched
    // when the map opens now, so the run is synchronous: no `await`, no `waitFor`, the file and
    // the dialog both exist the instant the handler returns. That absence of a window is what
    // removes the pressure to press twice.
    await openMap()
    pressExportMap()
    expect(saved).toHaveLength(1)
    expect(terminal()).toBeInTheDocument()
  })

  it('is not pressable again while its terminal is up (review R-8)', async () => {
    // The phone's Alert is OS-modal; the demo's dialog renders a scrim that stops a real
    // pointer. The button disables as well, because "the overlay happens to cover it" is
    // geometry, not a contract — the same reasoning §70i applied to the validation prompt.
    await openMap()
    pressExportMap()
    expect(screen.getByTestId('export-map-button')).toBeDisabled()
    fireEvent.click(screen.getByText('OK'))
    expect(screen.getByTestId('export-map-button')).toBeEnabled()
    expect(saved).toHaveLength(1)
  })

  it('will not accept a press before the builder chunk has arrived (review R-8)', async () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-WAIT', displayName: 'WaitCase', unit: 'R' })
      store.getState().addLocation(c, {
        locationName: 'Front', streetAddress: '1 A St', city: 'Mississauga',
        gps: { lat: 43.6, lng: -79.6, source: 'geocoded' as const },
      })
    })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('WaitCase'))
    // Disabled on the very first frame — the chunk is fetched on arrival, not on the click, so
    // the click can never be separated from the gesture that authorised it.
    const button = screen.getByTestId('export-map-button')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await waitFor(() => expect(button).toBeEnabled())
    expect(button).not.toHaveAttribute('aria-busy')
  })
})

describe('DemoExperience — Export Map, empty case', () => {
  it('exports an honest empty map for a case with no coordinates anywhere', async () => {
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    act(() => {
      const c = store.getState().createCase({ caseNumber: 'PR25-BARE', displayName: 'BareCase', unit: 'R' })
      store.getState().addLocation(c, { locationName: 'Unlocated', streetAddress: '5 Elm St', city: 'Mississauga' })
    })
    fireEvent.click(screen.getByLabelText('Map'))
    fireEvent.click(within(screen.getByTestId('case-map-picker')).getByText('BareCase'))
    await waitFor(() => expect(screen.getByTestId('export-map-button')).toBeEnabled())

    // The footer is still there — the phone renders it as the list footer regardless of rows.
    pressExportMap()
    const notice = terminal()
    // Both facts, because they are different facts: the one location is missing from the file,
    // AND with no incident either the map has nothing on it at all.
    expect(notice).toHaveTextContent('None of its 1 location have coordinates yet, so none of them are on the map.')
    expect(notice).toHaveTextContent('Nothing plots yet, so it opens with an empty map.')
    await waitFor(() => expect(saved).toHaveLength(1))
    const html = await saved[0].blob.text()
    expect(JSON.parse(html.match(/id="case-geojson">([\s\S]*?)<\/script>/)![1]).features).toEqual([])
  })
})
