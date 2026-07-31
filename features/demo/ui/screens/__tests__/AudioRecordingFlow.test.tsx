import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'

import {
  NO_CAPTURE_STORAGE_NOTICE,
  SAMPLE_MEDIA,
  SAMPLE_MEDIA_NOTICE,
  type CapturedMedia,
} from '@/features/demo/engine/logic/media'
import type { MetadataFormValue } from '@/features/demo/ui/inputs/MetadataForm'
import {
  AudioRecordingFlow,
  type AudioRecordingFlowDeps,
  type AudioRecordingFlowProps,
} from '@/features/demo/ui/screens/AudioRecordingFlow'
import {
  domError,
  fakeRecorder,
  fakeRecorderIo,
  fakeStream,
  type FakeRecorder,
} from '@/features/demo/ui/inputs/__tests__/capture-media-io'
import { fakeAnalyser, fakeAnalyserIo } from '@/features/demo/ui/inputs/__tests__/audio-analyser-io'
import type { MediaDevicesLike } from '@/features/demo/ui/inputs/capture-media'
import type { ObjectUrlIo } from '@/features/demo/ui/inputs/object-urls'

/**
 * The flow that joins P4.1's capability to the two screens (matrix rows 67-69).
 *
 * Two paths matter and both are exercised end to end: the SAMPLE path (the suite default —
 * `vitest.setup.ts` leaves `navigator.mediaDevices` undefined) and the LIVE path with the
 * capability's seams injected.
 */

function urlIo() {
  const revoked: string[] = []
  let seq = 0
  const io: ObjectUrlIo = {
    create: () => `blob:mint/${++seq}`,
    revoke: (url) => {
      revoked.push(url)
    },
  }
  return { io, revoked }
}

function liveDeps(over: Partial<AudioRecordingFlowDeps> = {}) {
  const { io, revoked } = urlIo()
  const recorder = fakeRecorder('audio/webm;codecs=opus')
  const stream = fakeStream(['audio'])
  let nowMs = 1_000_000
  const mediaDevices: MediaDevicesLike = {
    getUserMedia: vi.fn(async () => stream),
    enumerateDevices: vi.fn(async () => [] as MediaDeviceInfo[]),
  }
  const deps: AudioRecordingFlowDeps = {
    mediaDevices,
    // Chrome's answer: no MP4 audio, WebM/Opus yes — so the negotiated container matches the
    // recorder's own mimeType, as a real pairing would.
    recorder: fakeRecorderIo(recorder, (type) => type.includes('webm')),
    objectUrls: io,
    analyser: fakeAnalyserIo(fakeAnalyser()),
    reducedMotion: false,
    now: () => nowMs,
    capturedAt: () => '2026-07-31 14:05:09',
    ...over,
  }
  return { deps, recorder, stream, revoked, mediaDevices, advance: (ms: number) => (nowMs += ms) }
}

function mount(over: Partial<AudioRecordingFlowProps> = {}) {
  // Defaults to a store that TAKES the note; the refusal arm passes its own (R-1 / §60c).
  const onSave = vi.fn((_captured: CapturedMedia, _meta: MetadataFormValue) => true)
  const onClose = vi.fn()
  const utils = render(
    <AudioRecordingFlow defaultFilenameBase="audio-note-1" onSave={onSave} onClose={onClose} {...over} />,
  )
  return { ...utils, onSave, onClose }
}

beforeEach(() => {
  vi.useFakeTimers()
})
afterEach(() => {
  vi.useRealTimers()
})

/** Let the mount-time `open()` settle. */
async function settle() {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0)
  })
}

/**
 * Roll the take forward. The elapsed readout — and with it the Stop gate — is published by
 * `useMediaCapture`'s 200ms tick, so the injected clock and the timers have to move together;
 * advancing only the clock leaves `canStop` false and the Stop press is (correctly) refused.
 */
async function roll(advance: (ms: number) => void, ms: number) {
  advance(ms)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(Math.max(ms, 250))
  })
}

/** Drive a complete take: start, roll past the 500ms gate, stop, and let the recorder flush. */
async function recordAndStop(recorder: FakeRecorder, advance: (ms: number) => void, ms = 3000) {
  fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
  await roll(advance, ms)
  fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))
  await act(async () => {
    recorder.emitData('opus-bytes')
    recorder.emitStop()
    await vi.advanceTimersByTimeAsync(0)
  })
}

describe('AudioRecordingFlow — the sample path (no capture API, the suite default)', () => {
  it('offers the sample instead of a record button, and says why', () => {
    mount()
    expect(screen.getByText(SAMPLE_MEDIA_NOTICE.microphone)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()
  })

  it('carries a sample all the way to a save, labelled and named after the bundled asset', () => {
    const { onSave } = mount()

    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))

    expect(screen.getByText('Review Audio')).toBeInTheDocument()
    expect(screen.getByText('Sample')).toBeInTheDocument()
    // Named for what it IS. `audio-note-1` would hide a bundled asset behind a filename that
    // reads like something the visitor recorded.
    expect(screen.getByText('sample-note.m4a')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    expect(onSave).toHaveBeenCalledTimes(1)
    expect(onSave.mock.calls[0][0]).toMatchObject({ kind: 'audio', url: SAMPLE_MEDIA.audio.url, sample: true })
    expect(onSave.mock.calls[0][1]).toEqual({ filename: 'sample-note', caption: '' })
  })

  it('never opens a stream it does not have', () => {
    const { mediaDevices } = liveDeps()
    mount({ deps: { mediaDevices: null } })
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
  })

  it('takes the sample path when the browser can listen but cannot record', () => {
    // Safari before 14.1: getUserMedia works, MediaRecorder does not. The notice must not claim
    // there is no microphone — the visitor can see one being opened.
    const { deps } = liveDeps({ recorder: null })
    mount({ deps })
    expect(screen.getByText(/cannot record audio to a file/)).toBeInTheDocument()
    expect(screen.queryByText(SAMPLE_MEDIA_NOTICE.microphone)).not.toBeInTheDocument()
  })

  it('takes the sample path when the page cannot HOLD a captured file (FD-2)', async () => {
    // `{ stream: true, record: true, objectUrls: false }` — a hardened or embedded WebView. The
    // flow used to spell the rule as `!stream || !record`, so this browser read `live`: the
    // visitor got the full recorder with an open microphone and a moving meter, and a COMPLETED
    // take then answered "This browser doesn't expose a microphone to this page".
    const { deps, mediaDevices } = liveDeps({ objectUrls: null })
    mount({ deps })
    await settle()

    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()
    // The microphone is never opened for a recorder that could not keep what it caught.
    expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
    // The sentence names the BINDING reason. Both device sentences would be false here — the
    // device is open and the recorder works — and the old ternary could not produce this one at
    // all, structurally.
    expect(screen.getByText(NO_CAPTURE_STORAGE_NOTICE)).toBeInTheDocument()
    expect(screen.queryByText(SAMPLE_MEDIA_NOTICE.microphone)).not.toBeInTheDocument()
    expect(screen.queryByText(/cannot record audio to a file/)).not.toBeInTheDocument()

    // And the flow still works: the sample is reachable and reviewable.
    fireEvent.click(screen.getByRole('button', { name: 'Attach a sample audio note' }))
    expect(screen.getByText('Review Audio')).toBeInTheDocument()
  })
})

describe('AudioRecordingFlow — the live path', () => {
  it('opens the microphone on arrival, as the phone requests permission on mount', async () => {
    const { deps, mediaDevices } = liveDeps()
    mount({ deps })
    await settle()
    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
  })

  it('records, gates Stop under 500ms, and hands the take to review', async () => {
    const { deps, recorder, advance } = liveDeps()
    mount({ deps })
    await settle()

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    expect(screen.getByText('REC')).toBeInTheDocument()
    // The engine's gate, seen through the flow: nothing recorded yet, so Stop is refused.
    expect(screen.getByRole('button', { name: 'Stop recording' })).toHaveAttribute('aria-disabled', 'true')

    await roll(advance, 3000)
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))
    await act(async () => {
      recorder.emitData('opus-bytes')
      recorder.emitStop()
    })

    expect(screen.getByText('Review Audio')).toBeInTheDocument()
    expect(screen.getByText('Duration: 00:03')).toBeInTheDocument()
    // The filename names the container the browser really produced (§58c) — not `.m4a`.
    expect(screen.getByText('audio-note-1.webm')).toBeInTheDocument()
  })

  it('releases the microphone once the take exists — a live indicator over review would lie', async () => {
    const { deps, recorder, stream, advance } = liveDeps()
    mount({ deps })
    await settle()
    await recordAndStop(recorder, advance)

    expect(screen.getByText('Review Audio')).toBeInTheDocument()
    for (const track of stream.tracks) expect(track.stop).toHaveBeenCalled()
  })

  it('pauses and resumes the recorder itself, not just the label', async () => {
    const { deps, recorder, advance } = liveDeps()
    mount({ deps })
    await settle()

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await roll(advance, 1000)
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }))
    expect(recorder.paused).toBe(true)
    expect(screen.getByText('PAUSED')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Resume' }))
    expect(recorder.paused).toBe(false)
    expect(screen.getByText('REC')).toBeInTheDocument()
  })

  it('hands the URL off to the store on save, so the unmount sweep leaves it alive', async () => {
    // Mutation probe: drop `capture.handOff()` from handleSave and this fails — the saved note
    // would point at a revoked blob and render as nothing.
    const { deps, recorder, revoked, advance } = liveDeps()
    const { onSave, unmount } = mount({ deps })
    await settle()
    await recordAndStop(recorder, advance)

    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))
    const savedUrl = onSave.mock.calls[0][0].url as string
    unmount()

    expect(savedUrl).toMatch(/^blob:/)
    expect(revoked).not.toContain(savedUrl)
  })

  it('does NOT hand off a REFUSED save — the hook keeps the URL so its sweep can free it', async () => {
    // R-1 / §60c, the other half of the guard. Mutation probe: change `if (accepted)` back to an
    // unconditional `capture.handOff()` and this reddens — the refused take's bytes would be
    // pinned for the tab's life with nothing left holding a reference to revoke them.
    const { deps, recorder, revoked, advance } = liveDeps()
    const onSave = vi.fn((_captured: CapturedMedia, _meta: MetadataFormValue) => false)
    const { unmount } = mount({ deps, onSave })
    await settle()
    await recordAndStop(recorder, advance)

    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))
    const refusedUrl = onSave.mock.calls[0][0].url as string
    unmount()

    expect(refusedUrl).toMatch(/^blob:/)
    expect(revoked).toContain(refusedUrl)
  })

  it('carries the visitor’s filename and notes up to the bridge, not the default', async () => {
    // Row 56's audio half. The default is a PRE-FILL — what gets stored is what is in the field.
    const { deps, recorder, advance } = liveDeps()
    const { onSave } = mount({ deps })
    await settle()
    await recordAndStop(recorder, advance)

    expect(screen.getByLabelText('Filename')).toHaveValue('audio-note-1')
    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'manager statement' } })
    fireEvent.change(screen.getByLabelText('Notes'), { target: { value: 'retention period, 30 days' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save Audio' }))

    expect(onSave.mock.calls[0][1]).toEqual({
      filename: 'manager statement',
      caption: 'retention period, 30 days',
    })
  })

  it('starts a re-recorded take from the default, never the discarded take’s name', async () => {
    // The metadata state lives INSIDE the preview screen, which unmounts on Record Again.
    // Lifting it into this flow (or into a ref that outlives the take) is the regression this
    // pins: an abandoned take's name would silently ride onto the next recording.
    const { deps, recorder, advance } = liveDeps()
    mount({ deps })
    await settle()
    await recordAndStop(recorder, advance)

    fireEvent.change(screen.getByLabelText('Filename'), { target: { value: 'wrong take' } })
    fireEvent.click(screen.getByRole('button', { name: 'Record Again' }))
    await settle()
    await recordAndStop(recorder, advance)

    expect(screen.getByLabelText('Filename')).toHaveValue('audio-note-1')
  })

  it('revokes the discarded take on Record Again and returns to a live recorder', async () => {
    const { deps, recorder, revoked, advance, mediaDevices } = liveDeps()
    mount({ deps })
    await settle()
    await recordAndStop(recorder, advance)

    fireEvent.click(screen.getByRole('button', { name: 'Record Again' }))
    await settle()

    expect(revoked).toEqual(['blob:mint/1'])
    expect(screen.getByText('AUDIO CAPTURE')).toBeInTheDocument()
    // The microphone was released at stop, so coming back has to re-open it.
    expect(mediaDevices.getUserMedia).toHaveBeenCalledTimes(2)
  })

  it('shows the capability layer’s failure when a take produced no bytes, and KEEPS the mic', async () => {
    const { deps, recorder, stream, advance } = liveDeps()
    mount({ deps })
    await settle()

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await roll(advance, 3000)
    fireEvent.click(screen.getByRole('button', { name: 'Stop recording' }))
    await act(async () => {
      recorder.emitStop() // no data ever arrived
    })

    // Never a review screen over an empty file: an empty .webm in a case file looks like
    // evidence.
    expect(screen.queryByText('Review Audio')).not.toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('nothing was saved')

    // R-12: the half §61g claimed was pinned and was not. `handleStop` closes the stream ONLY
    // on a real take; closing it here drops `mode` to 'offer' and replaces the live recorder
    // with an "Enable microphone" button — taking away the retry affordance at the exact moment
    // the visitor needs it. The two assertions above survive that regression; these do not.
    for (const track of stream.tracks) expect(track.stop).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Start recording' })).toBeInTheDocument()
  })

  it('abandons a take in flight when the visitor cancels', async () => {
    const { deps, recorder, stream, advance } = liveDeps()
    const { onClose } = mount({ deps })
    await settle()

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    await roll(advance, 2000)
    fireEvent.click(screen.getByRole('button', { name: 'Cancel recording' }))

    expect(recorder.stopCalls).toBeGreaterThan(0)
    for (const track of stream.tracks) expect(track.stop).toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('renders the denied view — and no sample — when the visitor refuses the microphone', async () => {
    const { deps } = liveDeps({
      mediaDevices: {
        getUserMedia: vi.fn(async () => Promise.reject(domError('NotAllowedError'))),
        enumerateDevices: vi.fn(async () => [] as MediaDeviceInfo[]),
      },
    })
    mount({ deps })
    await settle()

    expect(screen.getByText('Microphone Access Required')).toBeInTheDocument()
    // A refusal is never converted into a sample (P4.1's honesty contract).
    expect(screen.queryByRole('button', { name: 'Attach a sample audio note' })).not.toBeInTheDocument()
  })

  it('reads the format row off the live track and the negotiated container', async () => {
    const track = { kind: 'audio', stop: vi.fn(), getSettings: () => ({ sampleRate: 48000, channelCount: 1 }) }
    const stream = {
      getTracks: () => [track],
      getAudioTracks: () => [track],
      getVideoTracks: () => [],
    } as unknown as MediaStream
    const { deps } = liveDeps({
      mediaDevices: {
        getUserMedia: vi.fn(async () => stream),
        enumerateDevices: vi.fn(async () => [] as MediaDeviceInfo[]),
      },
    })
    mount({ deps })
    await settle()

    expect(screen.getByText('48.0kHz')).toBeInTheDocument()
    expect(screen.getByText('/ MONO')).toBeInTheDocument()
    expect(screen.getByText('OPUS')).toBeInTheDocument()
  })
})

describe('AudioRecordingFlow — the 1-hour ceiling', () => {
  it('explains the auto-stop that moved the visitor to review on its own, and releases the mic', async () => {
    const { deps, recorder, stream, advance } = liveDeps()
    mount({ deps })
    await settle()

    fireEvent.click(screen.getByRole('button', { name: 'Start recording' }))
    // Past the ceiling, then let the capability's tick notice.
    advance(60 * 60 * 1000 + 1000)
    await act(async () => {
      // One capability tick past the ceiling is what fires `onMaxDuration` + the auto-stop.
      await vi.advanceTimersByTimeAsync(260)
      recorder.emitData('opus-bytes')
      recorder.emitStop()
      await vi.advanceTimersByTimeAsync(0)
    })

    expect(screen.getByText('Review Audio')).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Maximum Duration Reached')
    // R-21: the auto-stop fires inside useMediaCapture's tick and never passes through
    // `handleStop`, so a release that lived there left the browser's recording indicator
    // asserting a live microphone over a finished take. The release is now a reaction to the
    // take existing, which covers both paths.
    for (const track of stream.tracks) expect(track.stop).toHaveBeenCalled()
  })
})
