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

function seed() {
  const store = createDemoStore()
  act(() => {
    const caseId = store.getState().createCase({ caseNumber: 'PR25-A', displayName: 'Audio', unit: 'Robbery' })
    const locId = store.getState().addLocation(caseId, { locationName: 'Site' })
    store.getState().switchLocation(locId)
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
