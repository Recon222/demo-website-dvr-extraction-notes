import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { SAMPLE_MEDIA } from '@/features/demo/engine/logic/media'

/**
 * P4.3 through the STORE BRIDGE — the half the component tests cannot see.
 *
 * `MediaCaptureScreen` is presentational: it hands a `CapturedMedia` out and is told whether
 * the store took it. Everything downstream of that boolean lives here — which bucket the item
 * lands in, what filename it is stored under, what the visitor is told, and where the launch
 * screen goes afterwards.
 *
 * The whole file runs on the SAMPLE path, because that is this machine's honest state
 * (`vitest.setup.ts` leaves `navigator.mediaDevices` undefined on purpose) and because the
 * live capture paths are already pinned at the hook (P4.1) and screen levels.
 *
 * The load-bearing case is the LAST one: the drawer's Capture Media row is ungated on an open
 * location (deferred §59f, phone parity), and `addMedia` early-returns without one. A save
 * that hit that early return with no notice would be a capture silently thrown away.
 */

function seed(withLocation = true) {
  const store = createDemoStore()
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-M', displayName: 'Media', unit: 'Robbery' })
    if (withLocation) {
      const locId = store.getState().addLocation(caseId, { locationName: 'Site' })
      store.getState().switchLocation(locId)
    }
    store.getState().setView('dvrInfo')
  })
  return store
}

/** Drawer → Media → Capture Media, which is the only way into this screen. The accordion's
 *  expanded state is drawer-local and survives a close/reopen, so the section toggle is only
 *  pressed when the rows are not already showing. */
function openCapture(store: DemoStore) {
  act(() => store.getState().setDrawerOpen(true))
  if (!screen.queryByRole('button', { name: 'Open camera to capture media' })) {
    fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
  }
  fireEvent.click(screen.getByRole('button', { name: 'Open camera to capture media' }))
}

const mediaOf = (store: DemoStore) =>
  store.getState().locations.find((l) => l.id === store.getState().currentLocationId)!.form.media

describe('DemoExperience — media capture bridge', () => {
  it('files a saved photo in the photos bucket with the real container’s extension', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openCapture(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    const media = mediaOf(store)
    expect(media.videos).toHaveLength(0)
    expect(media.photos).toHaveLength(1)
    const [photo] = media.photos
    expect(photo.kind).toBe('photo')
    // `.jpg` because the bundled sample IS a JPEG — derived from the mime type, not stamped on
    // from the phone's extension table (§58c). The base is the sample's own name, which is what
    // the metadata form (P4.4) opens pre-filled with for a bundled asset.
    expect(photo.filename).toBe(`${SAMPLE_MEDIA.photo.suggestedFilename}.jpg`)
    expect(photo.url).toBe(SAMPLE_MEDIA.photo.url)
    expect(photo.sample).toBe(true)
    expect(photo.caption).toBe('')
  })

  it('stores the filename and notes the visitor actually typed', () => {
    // Row 56's four field keys, end to end: the form's two values survive the bridge.
    const store = seed()
    render(<DemoExperience store={store} />)
    openCapture(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'rack front' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'north wall, 3rd shelf' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    expect(mediaOf(store).photos[0]).toMatchObject({
      filename: 'rack front.jpg',
      caption: 'north wall, 3rd shelf',
    })
  })

  it('files a saved clip in the videos bucket, duration and all', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openCapture(store)

    fireEvent.click(screen.getByRole('button', { name: 'Video mode' }))
    fireEvent.click(screen.getByRole('button', { name: 'Attach sample clip' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save video' }))

    const media = mediaOf(store)
    expect(media.photos).toHaveLength(0)
    expect(media.videos).toHaveLength(1)
    expect(media.videos[0].durationSec).toBe(SAMPLE_MEDIA.video.durationSec)
    expect(media.videos[0].filename).toMatch(/\.mp4$/)
  })

  it('returns to the wizard step the visitor launched from, and says what was saved', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openCapture(store)
    expect(store.getState().view).toBe('mediaCapture')

    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    // `closeLaunch`, so the anchor chapter is where it lands — never the top of the wizard.
    expect(store.getState().view).toBe('dvrInfo')
    // Phone verbatim (`media-capture.tsx:192-193`), joined into the demo's one-line banner. The
    // filename is the user's, WITHOUT the extension, exactly as the phone's toast reports it.
    expect(screen.getByText(`Photo Saved — ${SAMPLE_MEDIA.photo.suggestedFilename} saved to case`)).toBeInTheDocument()
  })

  it('mints an id per capture, so two saves are two rows', () => {
    const store = seed()
    render(<DemoExperience store={store} />)

    openCapture(store)
    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    openCapture(store)
    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    const { photos } = mediaOf(store)
    expect(photos).toHaveLength(2)
    expect(photos[0].id).not.toBe(photos[1].id)
  })

  it('cancelling leaves the store untouched and returns to the chapter', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openCapture(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    const before = store.getState()
    fireEvent.click(screen.getByRole('button', { name: 'Exit media capture' }))

    // Nothing about the case changed — a discarded capture is not a state change.
    expect(store.getState().locations).toBe(before.locations)
    expect(store.getState().view).toBe('dvrInfo')
  })

  it('with no location open: tells the visitor, saves nothing, and closes the screen', () => {
    // `addMedia` early-returns without a `currentLocationId`. The drawer row that opened this
    // screen is deliberately ungated (§59f), so this is the ONLY place the flow can discover
    // there is nowhere to put the photo — and it must not discover it silently.
    const store = seed(false)
    render(<DemoExperience store={store} />)
    openCapture(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach sample photo' }))
    const before = store.getState()
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    expect(store.getState().locations).toBe(before.locations)
    expect(
      screen.getByText('Cannot Save Media — No location selected. Please navigate from a case first.'),
    ).toBeInTheDocument()
    expect(store.getState().view).toBe('dvrInfo')
  })
})
