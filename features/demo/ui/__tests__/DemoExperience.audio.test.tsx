import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

import { DemoExperience } from '@/features/demo/ui/DemoExperience'
import { createDemoStore, type DemoStore } from '@/features/demo/engine/store/create-store'
import { SAMPLE_MEDIA } from '@/features/demo/engine/logic/media'

/**
 * P4.6 through the bridge (matrix rows 67-69) — the half a screen test cannot see: what a
 * saved audio note does to the STORE, and where the visitor lands afterwards.
 *
 * Under vitest `navigator.mediaDevices` is undefined, so the recorder opens on its sample
 * treatment and the sample take is the end-to-end path exercised here. The live path is
 * covered with injected seams in `screens/__tests__/AudioRecordingFlow.test.tsx`.
 */

function seed(withLocation = true) {
  const store = createDemoStore()
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'Audio', unit: 'Robbery' })
    if (withLocation) {
      const locId = store.getState().addLocation(caseId, { locationName: 'Site' })
      store.getState().switchLocation(locId)
    }
    store.getState().setView('dvrInfo')
  })
  return store
}

function openRecorder(store: DemoStore) {
  act(() => store.getState().launch('audioRecording'))
}

const audios = (store: DemoStore) =>
  store.getState().locations.find((l) => l.id === store.getState().currentLocationId)?.form.media.audios ?? []

describe('audio recording — the bridge', () => {
  it('writes the note into the OPEN LOCATION and returns to the wizard step it launched from', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openRecorder(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    expect(audios(store)).toHaveLength(1)
    expect(audios(store)[0]).toMatchObject({
      kind: 'audio',
      url: SAMPLE_MEDIA.audio.url,
      filename: 'sample-note.m4a',
      caption: '',
      sample: true,
      durationSec: 4,
    })
    // `closeLaunch`, not `setView`: the anchor was never moved, so the visitor lands back on
    // the step they left.
    expect(store.getState().view).toBe('dvrInfo')
    expect(store.getState().currentChapter).toBe('dvrInfo')
  })

  it('stores the filename and notes the visitor typed into the metadata form', () => {
    // Row 56's audio field keys, end to end through the bridge.
    const store = seed()
    render(<DemoExperience store={store} />)
    openRecorder(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'manager statement' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'retention period, 30 days' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    expect(audios(store)[0]).toMatchObject({
      // The base is the visitor's; the extension is still the container's (§58c).
      filename: 'manager statement.m4a',
      caption: 'retention period, 30 days',
    })
  })

  it('tells the visitor the note landed, naming it (phone Audio Saved toast)', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openRecorder(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'manager statement' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    // The BASE, as on the phone — the route appends `.m4a` after building the toast.
    expect(screen.getByText('Audio Saved. manager statement saved to case')).toBeInTheDocument()
  })

  it('with no location open: tells the visitor, saves nothing, and closes the recorder (R-1)', () => {
    // The blocker. `addMedia` early-returns without a `currentLocationId`, and the Record Audio
    // drawer row is deliberately ungated (§59f, phone parity), so this is the ONLY place the
    // flow can discover there is nowhere to put the take. Before the guard, the recording was
    // discarded and `closeLaunch()` returned the visitor to the anchor exactly as a real save
    // does — the two outcomes were byte-identical from their seat.
    const store = seed(false)
    render(<DemoExperience store={store} />)
    openRecorder(store)

    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    const before = store.getState()
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    expect(store.getState().locations).toBe(before.locations)
    expect(
      screen.getByText('Cannot Save Audio. No location selected. Please navigate from a case first.'),
    ).toBeInTheDocument()
    // Never the success line as well as the refusal.
    expect(screen.queryByText(/Audio Saved/)).not.toBeInTheDocument()
    expect(store.getState().view).toBe('dvrInfo')
  })

  it('mints an id that a rehydrated session cannot collide with', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openRecorder(store)
    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    // The `ui-…N` shape is what `maxIdSeq` re-seeds `uiSeq` past at boot; an id with no numeric
    // tail would be invisible to it.
    expect(audios(store)[0].id).toMatch(/^ui-m\d+$/)
  })

  it('numbers a second take rather than reusing the first name', () => {
    const store = seed()
    render(<DemoExperience store={store} />)

    openRecorder(store)
    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))
    openRecorder(store)
    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    expect(audios(store)).toHaveLength(2)
    expect(audios(store).map((a) => a.id)).toHaveLength(new Set(audios(store).map((a) => a.id)).size)
    // Both are samples here, so both carry the bundled asset's own name — the DEFAULT base
    // (audio-note-N) is what the second take would use for a live recording.
    expect(audios(store).every((a) => a.filename === 'sample-note.m4a')).toBe(true)
  })

  it('cancelling writes nothing at all', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openRecorder(store)

    const locationsBefore = store.getState().locations
    fireEvent.click(screen.getByRole('button', { name: 'Cancel recording' }))

    expect(store.getState().view).toBe('dvrInfo')
    // Identity, not length: cancelling routes through `closeLaunch` (a real write), so the
    // pin has to be that the DATA was left alone, not that nothing happened at all.
    expect(store.getState().locations).toBe(locationsBefore)
    expect(audios(store)).toHaveLength(0)
  })

  it('discarding a take at review writes nothing either', () => {
    const store = seed()
    render(<DemoExperience store={store} />)
    openRecorder(store)
    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))

    const before = store.getState()
    fireEvent.click(screen.getByRole('button', { name: 'Record Again' }))

    expect(store.getState()).toBe(before)
    expect(audios(store)).toHaveLength(0)
    expect(screen.getByText('AUDIO CAPTURE')).toBeInTheDocument()
  })
})
