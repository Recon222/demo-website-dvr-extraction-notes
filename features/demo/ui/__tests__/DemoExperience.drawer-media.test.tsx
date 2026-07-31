import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act, within } from '@testing-library/react'
import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'

/**
 * P4.2 / matrix row 80 — the drawer's Media accordion, through the bridge.
 *
 * This is THE entry point that made §1.11/§1.12 reachable at all: before it, `mediaCapture`,
 * `audioRecording` and the media library had no affordance anywhere in the demo. The rows'
 * copy and a11y labels are pinned at the component level (`controls/__tests__`); what is
 * pinned HERE is what each one does to the store — the half a presentational test cannot see.
 *
 * `mediaCapture` deliberately has no screen yet (P4.3). Landing on the honest placeholder is
 * the CORRECT interim behaviour, and that arm says so, so a future package replacing the
 * placeholder does not have to guess whether the routing was ever verified. `audioRecording`
 * reached its screen in P4.6; what is pinned here is still the ROUTING — the screen's own
 * behaviour lives in `screens/__tests__/AudioRecordingFlow.test.tsx` and the bridge's store
 * write in `DemoExperience.audio.test.tsx`.
 */

function seed() {
  const store = createDemoStore()
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-M', displayName: 'Media', unit: 'Robbery' })
    const locId = store.getState().addLocation(caseId, { locationName: 'Site' })
    store.getState().switchLocation(locId)
    store.getState().setView('dvrInfo')
  })
  return store
}

/** Open the drawer from the wizard header and expand the Media section. */
function openMediaSection(store: DemoStore) {
  act(() => store.getState().setDrawerOpen(true))
  fireEvent.click(screen.getByRole('button', { name: 'Media section' }))
}

describe('drawer Media accordion — wiring (row 80)', () => {
  it('Capture Media launches the mediaCapture view, closes the drawer, and keeps the chapter', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openMediaSection(store)

    fireEvent.click(screen.getByRole('button', { name: 'Open camera to capture media' }))

    const s = store.getState()
    expect(s.view).toBe('mediaCapture')
    expect(s.drawerOpen).toBe(false)
    // `launch`, not `setView`: the wizard step the visitor came from stays the anchor, so
    // closing the launch screen returns there and the rail narration never jumps.
    expect(s.currentChapter).toBe('dvrInfo')
    // Honest interim: the screen is a fast-follow and says so rather than rendering nothing.
    expect(screen.getByText(/“mediaCapture” screen is a fast-follow/)).toBeInTheDocument()
  })

  it('Record Audio launches the audioRecording view on the same terms', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openMediaSection(store)

    fireEvent.click(screen.getByRole('button', { name: 'Record audio note' }))

    const s = store.getState()
    expect(s.view).toBe('audioRecording')
    expect(s.drawerOpen).toBe(false)
    expect(s.currentChapter).toBe('dvrInfo')
    // P4.6 replaced the placeholder with the real recorder; under vitest (no mediaDevices) it
    // opens on its honest sample treatment.
    expect(screen.getByText('AUDIO CAPTURE')).toBeInTheDocument()
  })

  it('Media Library opens the sheet and closes the drawer when a location is open', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openMediaSection(store)

    fireEvent.click(screen.getByRole('button', { name: 'Open media library' }))

    expect(store.getState().modal).toBe('mediaLibrary')
    expect(store.getState().drawerOpen).toBe(false)
    expect(screen.getByRole('dialog', { name: 'Media Library' })).toBeInTheDocument()
  })

  it('the sheet closes through onClose, clearing the modal id (never the phone’s B6 gap)', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openMediaSection(store)
    fireEvent.click(screen.getByRole('button', { name: 'Open media library' }))

    // Scoped to the sheet: the drawer is on its way out but still mounted for its exit
    // animation, and it carries a `Close` of its own.
    const sheet = screen.getByRole('dialog', { name: 'Media Library' })
    fireEvent.click(within(sheet).getByRole('button', { name: 'Close' }))

    expect(store.getState().modal).toBeNull()
    expect(screen.queryByRole('dialog', { name: 'Media Library' })).not.toBeInTheDocument()
  })

  it('with no location open: notices, opens nothing, and LEAVES THE DRAWER UP (phone parity)', () => {
    // The phone toasts "No Location / Select a location first." and does not close the menu —
    // the visitor's next move is to go choose one, and closing it would take the way there away.
    const store = createDemoStore()
    render(<DemoExperience store={store} />)
    openMediaSection(store)

    fireEvent.click(screen.getByRole('button', { name: 'Open media library' }))

    expect(store.getState().modal).toBeNull()
    expect(store.getState().drawerOpen).toBe(true)
    expect(screen.getByText('No Location — Select a location first.')).toBeInTheDocument()
  })

  it('records the library visit under its own id, so the snapshot guard accepts it', () => {
    // `visited` is persisted and every key is checked against MODAL_IDS on rehydrate: a modal
    // id that opens but is not registered would be silently dropped at boot.
    const store = seed()
    render(<DemoExperience store={store} />)
    openMediaSection(store)
    fireEvent.click(screen.getByRole('button', { name: 'Open media library' }))

    expect(store.getState().visited.mediaLibrary).toBe(true)
  })
})
