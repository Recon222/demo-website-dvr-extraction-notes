import { afterEach, describe, expect, it, vi, type Mock } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'

import { CAPTURE_PERMISSION_COPY, MAX_RECORDING_DURATION_MS, SAMPLE_MEDIA } from '@/features/demo/engine/logic/media'
import { RECORDING_TICK_MS } from '@/features/demo/ui/inputs/useMediaCapture'
import {
  MediaCaptureScreen,
  type MediaCaptureScreenDeps,
  type SaveMediaRequest,
} from '@/features/demo/ui/screens/MediaCaptureScreen'
import type { MediaDevicesLike } from '@/features/demo/ui/inputs/capture-media'
import type { ObjectUrlIo } from '@/features/demo/ui/inputs/object-urls'
import {
  domError,
  fakeCanvas,
  fakeRecorder,
  fakeRecorderIo,
  fakeStream,
  type FakeRecorder,
} from '@/features/demo/ui/inputs/__tests__/capture-media-io'

/**
 * P4.3 — the photo/video capture screen (matrix rows 49–55).
 *
 * Two worlds are exercised here, deliberately:
 *
 * 1. The SAMPLE world, which is the suite's default (`vitest.setup.ts` leaves
 *    `navigator.mediaDevices` undefined on purpose) and therefore the contract most likely to
 *    regress unnoticed — every assertion here runs with no injected capability at all.
 * 2. The LIVE world, reached only by injecting `deps`. jsdom has no `getUserMedia`, no
 *    `MediaRecorder` and no canvas 2d context, so the stream, the recorder and the frame grab
 *    are all hand-built (shared fakes from P4.1's `capture-media-io`).
 *
 * The lifecycle-shaped assertions carry their mutation probe in the test itself: the
 * object-URL pins fail if `handOff()` is deleted OR if it is called unconditionally, and the
 * Stop-gate pin fails if the `canStop` guard is dropped.
 */

const CAPTURED_AT = '2026-07-30 14:05:06'

/** A counting object-URL io — leaks and over-revocations both become assertions. */
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

function deviceInfo(deviceId: string, label: string): MediaDeviceInfo {
  return { deviceId, kind: 'videoinput', label, groupId: 'g' } as MediaDeviceInfo
}

interface Harness {
  deps: MediaCaptureScreenDeps
  saved: SaveMediaRequest[]
  onSave: Mock<(request: SaveMediaRequest) => boolean>
  onCancel: Mock<() => void>
  revoked: string[]
  getUserMedia: Mock<(constraints: MediaStreamConstraints) => Promise<MediaStream>>
  recorder: FakeRecorder
  advance(ms: number): void
}

/**
 * @param live   inject a working `getUserMedia`/`MediaRecorder` (the browser world).
 * @param accept what `onSave` reports back — `false` is the bridge refusing (no location open).
 */
function harness(
  options: {
    live?: boolean
    accept?: boolean
    devices?: MediaDeviceInfo[]
    getUserMedia?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  } = {},
): Harness {
  const { io, revoked } = urlIo()
  const recorder = fakeRecorder('video/webm')
  const saved: SaveMediaRequest[] = []
  let nowMs = 1_000_000

  const getUserMedia = vi.fn(
    options.getUserMedia ?? (async () => fakeStream(['video', 'audio'])),
  )
  const mediaDevices: MediaDevicesLike | null = options.live
    ? { getUserMedia, enumerateDevices: async () => options.devices ?? [] }
    : null

  const onSave = vi.fn((request: SaveMediaRequest) => {
    saved.push(request)
    return options.accept ?? true
  })

  return {
    deps: {
      mediaDevices,
      recorder: options.live ? fakeRecorderIo(recorder) : null,
      objectUrls: io,
      now: () => nowMs,
      capturedAt: () => CAPTURED_AT,
      createCanvas: () => fakeCanvas(),
    },
    saved,
    onSave,
    onCancel: vi.fn(),
    revoked,
    getUserMedia,
    recorder,
    advance: (ms: number) => {
      nowMs += ms
    },
  }
}

function mount(h: Harness) {
  return render(<MediaCaptureScreen onCancel={h.onCancel} onSave={h.onSave} deps={h.deps} />)
}

/** Walk the permission stage: press Grant and let the acquisition resolve. */
async function grant() {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Grant' }))
  })
}

const shutter = (name: string) => screen.getByRole('button', { name })

afterEach(() => {
  vi.useRealTimers()
})

// ---- The sample world (the default tested contract) -------------------------

describe('no capture capability — the honest sample path', () => {
  it('names the state with the phone’s own headline and offers the sample, not a site setting', () => {
    mount(harness())

    // Phone verbatim (VisionCameraScreen.tsx:497), reached through `captureFailureMessage`.
    expect(screen.getByText('No camera device available')).toBeInTheDocument()
    expect(screen.getByText(CAPTURE_PERMISSION_COPY.camera.unavailableBody)).toBeInTheDocument()
    // The remedy for "this browser has none" is NOT the remedy for "you said no".
    expect(screen.queryByText(CAPTURE_PERMISSION_COPY.camera.deniedBody)).not.toBeInTheDocument()
    // The chrome stays: this is the OCR screen's precedent, not a dead end.
    expect(shutter('Attach sample photo')).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Photo mode' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('says what the shutter will really do — never the phone’s “Take photo” over a bundled file', () => {
    mount(harness())
    expect(screen.queryByRole('button', { name: 'Take photo' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Video mode' }))
    expect(shutter('Attach sample clip')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Start recording' })).not.toBeInTheDocument()
  })

  it('attaches the sample photo and reviews it, labelled at every step', () => {
    mount(harness())
    fireEvent.click(shutter('Attach sample photo'))

    expect(screen.getByText('Review Image')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Captured image preview' })).toHaveAttribute(
      'src',
      SAMPLE_MEDIA.photo.url,
    )
    expect(screen.getByText('Sample data')).toBeInTheDocument()
    // The notice states the mechanism — a badge alone leaves the visitor to guess.
    expect(screen.getByText(/bundled sample instead\. Nothing was recorded\./)).toBeInTheDocument()
  })

  it('attaches the sample clip in video mode, with the sample’s own duration', () => {
    mount(harness())
    fireEvent.click(screen.getByRole('button', { name: 'Video mode' }))
    fireEvent.click(shutter('Attach sample clip'))

    expect(screen.getByText('Review Video')).toBeInTheDocument()
    expect(screen.getByLabelText('Video playback preview')).toHaveAttribute('src', SAMPLE_MEDIA.video.url)
    expect(screen.getByText('Duration: 00:04')).toBeInTheDocument()
  })

  it('retake drops the capture and returns to the camera stage', () => {
    mount(harness())
    fireEvent.click(shutter('Attach sample photo'))
    fireEvent.click(screen.getByRole('button', { name: 'Retake image' }))

    expect(screen.queryByText('Review Image')).not.toBeInTheDocument()
    expect(shutter('Attach sample photo')).toBeInTheDocument()
  })

  it('hands the bridge the capture plus the interim filename base, not a finished filename', () => {
    const h = harness()
    mount(h)
    fireEvent.click(shutter('Attach sample photo'))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    expect(h.saved).toHaveLength(1)
    // The BASE — `buildMediaItem`/`mediaFilename` own the extension, so the container the
    // browser really produced is what names the file (§58c).
    expect(h.saved[0].filename).toBe('photo-20260730-140506')
    expect(h.saved[0].caption).toBe('')
    expect(h.saved[0].captured.sample).toBe(true)
    expect(h.saved[0].captured.kind).toBe('photo')
    // The screen also shows the visitor the name it is about to save under.
    expect(h.onSave).toHaveBeenCalledTimes(1)
  })

  it('leaves the review stage once the store has taken the capture', () => {
    const h = harness({ accept: true })
    mount(h)
    fireEvent.click(shutter('Attach sample photo'))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    expect(screen.queryByText('Review Image')).not.toBeInTheDocument()
  })

  it('KEEPS the capture when the bridge refuses it — a refused save is not a save', () => {
    // Mutation probe for `if (accepted) handOff()`: calling handOff unconditionally clears the
    // capture here and this assertion fails.
    const h = harness({ accept: false })
    mount(h)
    fireEvent.click(shutter('Attach sample photo'))
    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))

    expect(screen.getByText('Review Image')).toBeInTheDocument()
  })

  it('closes through onCancel from the camera and from the review stage', () => {
    const h = harness()
    mount(h)
    fireEvent.click(screen.getByRole('button', { name: 'Close camera' }))
    expect(h.onCancel).toHaveBeenCalledTimes(1)

    fireEvent.click(shutter('Attach sample photo'))
    fireEvent.click(screen.getByRole('button', { name: 'Exit media capture' }))
    expect(h.onCancel).toHaveBeenCalledTimes(2)
  })
})

// ---- The permission stages --------------------------------------------------

describe('permission stages (phone PermissionsView, browser-corrected)', () => {
  it('asks before it prompts, with the phone’s headline and body verbatim', () => {
    mount(harness({ live: true }))

    expect(screen.getByText(CAPTURE_PERMISSION_COPY.camera.title)).toBeInTheDocument()
    expect(screen.getByText(CAPTURE_PERMISSION_COPY.camera.body)).toBeInTheDocument()
    // ONE grant control: a browser answers for both facilities in a single prompt, so two
    // independently-grantable rows would be a control the page cannot honour.
    expect(screen.getAllByRole('button', { name: /Grant/ })).toHaveLength(1)
    // No viewfinder until the visitor has said yes — the phone replaces the camera entirely.
    expect(screen.queryByLabelText('Live camera preview')).not.toBeInTheDocument()
  })

  it('opens the stream on Grant and lands on the live viewfinder', async () => {
    const h = harness({ live: true })
    mount(h)
    await grant()

    expect(h.getUserMedia).toHaveBeenCalledTimes(1)
    // `withAudio` is unconditional (phone `audio={mic granted}`), so a video take carries sound
    // without re-opening the stream on a mode flip.
    expect(h.getUserMedia.mock.calls[0][0]).toEqual({ video: true, audio: true })
    expect(screen.getByLabelText('Live camera preview')).toBeInTheDocument()
    expect(shutter('Take photo')).toBeInTheDocument()
  })

  it('a refusal is a refusal: denied copy, a retry, and no sample offered', async () => {
    const h = harness({
      live: true,
      getUserMedia: async () => {
        throw domError('NotAllowedError')
      },
    })
    mount(h)
    await grant()

    expect(screen.getByText(CAPTURE_PERMISSION_COPY.camera.deniedBody)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Try again' })).toBeInTheDocument()
    // The honesty contract: a sample is never substituted for a capture that was refused.
    expect(screen.queryByRole('button', { name: /Attach sample/ })).not.toBeInTheDocument()
    expect(screen.getByText(/access was denied — nothing was captured/)).toBeInTheDocument()
  })
})

// ---- The live camera --------------------------------------------------------

describe('live viewfinder', () => {
  it('grabs a real frame and reviews it — no sample badge on a live capture', async () => {
    const h = harness({ live: true })
    mount(h)
    await grant()

    const preview = screen.getByLabelText('Live camera preview')
    Object.defineProperty(preview, 'videoWidth', { value: 1280, configurable: true })
    Object.defineProperty(preview, 'videoHeight', { value: 720, configurable: true })

    await act(async () => {
      fireEvent.click(shutter('Take photo'))
    })

    expect(screen.getByText('Review Image')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Captured image preview' })).toHaveAttribute('src', 'blob:mint/1')
    expect(screen.queryByText('Sample data')).not.toBeInTheDocument()
    expect(screen.getByText('photo-20260730-140506.jpg')).toBeInTheDocument()
  })

  it('reports a frame grab that produced nothing, rather than reviewing a blank picture', async () => {
    const h = harness({ live: true })
    h.deps.createCanvas = () => fakeCanvas({ context: false })
    mount(h)
    await grant()

    const preview = screen.getByLabelText('Live camera preview')
    Object.defineProperty(preview, 'videoWidth', { value: 1280, configurable: true })
    Object.defineProperty(preview, 'videoHeight', { value: 720, configurable: true })

    await act(async () => {
      fireEvent.click(shutter('Take photo'))
    })

    expect(screen.queryByText('Review Image')).not.toBeInTheDocument()
    expect(screen.getByText(/could not turn the camera frame into an image/)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Dismiss' }))
    expect(screen.queryByText(/could not turn the camera frame into an image/)).not.toBeInTheDocument()
  })

  it('surfaces a silent take instead of converting it into a camera error (§58e)', async () => {
    let call = 0
    const h = harness({
      live: true,
      getUserMedia: async () => {
        // First (camera + mic) fails on a mic-less machine; the ladder retries video-only.
        if (++call === 1) throw domError('NotFoundError')
        return fakeStream(['video'])
      },
    })
    mount(h)
    await grant()

    expect(screen.getByLabelText('Live camera preview')).toBeInTheDocument()
    // Photo mode says nothing about audio — the warning belongs to the take that would be silent.
    expect(screen.queryByText(/the take will be silent/)).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'Video mode' }))
    expect(screen.getByText(/gave the page a camera but no microphone — the take will be silent/)).toBeInTheDocument()
  })

  it('offers the device picker only when there is another device to pick', async () => {
    const single = harness({ live: true, devices: [deviceInfo('cam-a', 'FaceTime HD')] })
    const { unmount } = mount(single)
    await grant()
    // A picker row that cannot change anything is the UI version of a fake success.
    expect(screen.queryByRole('button', { name: 'Switch camera' })).not.toBeInTheDocument()
    unmount()

    const many = harness({
      live: true,
      devices: [deviceInfo('cam-a', 'FaceTime HD'), deviceInfo('cam-b', 'Rear')],
    })
    mount(many)
    await grant()

    expect(screen.getByText('FaceTime HD')).toBeInTheDocument()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Switch camera' }))
    })

    // Re-opened pinned to the NEXT device — `exact`, so a vanished camera fails loudly rather
    // than silently opening a different one than the caption claims.
    expect(many.getUserMedia).toHaveBeenCalledTimes(2)
    expect(many.getUserMedia.mock.calls[1][0]).toEqual({
      video: { deviceId: { exact: 'cam-b' } },
      audio: true,
    })
    expect(screen.getByText('Rear')).toBeInTheDocument()
  })
})

// ---- Recording --------------------------------------------------------------

describe('video recording', () => {
  async function startRecording(h: Harness) {
    mount(h)
    await grant()
    fireEvent.click(screen.getByRole('button', { name: 'Video mode' }))
    fireEvent.click(shutter('Start recording'))
  }

  it('shows the recording badge and ticks it off the injected clock, not a render-time Date', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const h = harness({ live: true })
    await startRecording(h)

    const badge = screen.getByRole('timer')
    expect(badge).toHaveAccessibleName('Recording 00:00')

    // The wall clock moves; the tick is what reads it.
    act(() => {
      h.advance(1_500)
      vi.advanceTimersByTime(400)
    })
    expect(screen.getByRole('timer')).toHaveAccessibleName('Recording 00:01')
  })

  it('locks the mode pill and the device switch while recording, as the phone does', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const h = harness({
      live: true,
      devices: [deviceInfo('cam-a', 'FaceTime HD'), deviceInfo('cam-b', 'Rear')],
    })
    await startRecording(h)

    expect(screen.getByRole('button', { name: 'Photo mode' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Video mode' })).toBeDisabled()
    // Phone parity: flipping the camera mid-take would tear the stream out from under the
    // recorder (`camera-flip-button` carries `disabled={isRecording}`).
    expect(screen.getByRole('button', { name: 'Switch camera' })).toBeDisabled()
    expect(h.getUserMedia).toHaveBeenCalledTimes(1)
  })

  it('refuses Stop until the take can produce bytes, then stops and reviews', async () => {
    // Mutation probe for the `canStop` gate: drop it and the first assertion's click stops a
    // recorder that has emitted nothing, which P4.1 assembles into RECORDING_FAILED.
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const h = harness({ live: true })
    await startRecording(h)

    expect(shutter('Stop recording')).toBeDisabled()
    fireEvent.click(shutter('Stop recording'))
    expect(h.recorder.stopCalls).toBe(0)

    act(() => {
      h.advance(600)
      vi.advanceTimersByTime(400)
    })
    expect(shutter('Stop recording')).toBeEnabled()

    h.recorder.emitData('video-bytes')
    await act(async () => {
      fireEvent.click(shutter('Stop recording'))
      h.recorder.emitStop()
    })

    expect(h.recorder.stopCalls).toBe(1)
    expect(screen.getByText('Review Video')).toBeInTheDocument()
    // Recorded duration, not the wall time of the take — and the honest WebM extension.
    expect(screen.getByText('Duration: 00:01')).toBeInTheDocument()
    expect(screen.getByText('video-20260730-140506.webm')).toBeInTheDocument()
  })

  it('auto-stops at the one-hour ceiling and says the take was cut there', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const h = harness({ live: true })
    await startRecording(h)
    h.recorder.emitData('an hour of video')

    await act(async () => {
      h.advance(MAX_RECORDING_DURATION_MS)
      vi.advanceTimersByTime(RECORDING_TICK_MS)
      // The hook's tick calls stop() for us; the recorder still has to deliver its `stop`.
      h.recorder.emitStop()
    })

    expect(h.recorder.stopCalls).toBe(1)
    expect(screen.getByText('Review Video')).toBeInTheDocument()
    expect(screen.getByText(/stopped at the one-hour limit/)).toBeInTheDocument()

    // A retake clears the notice — it described the take that was just thrown away.
    fireEvent.click(screen.getByRole('button', { name: 'Record again' }))
    expect(screen.queryByText(/stopped at the one-hour limit/)).not.toBeInTheDocument()
  })

  it('reports a recording that produced no bytes instead of saving an empty file', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: false })
    const h = harness({ live: true })
    await startRecording(h)
    act(() => {
      h.advance(600)
      vi.advanceTimersByTime(400)
    })

    await act(async () => {
      fireEvent.click(shutter('Stop recording'))
      h.recorder.emitStop()
    })

    expect(screen.queryByText('Review Video')).not.toBeInTheDocument()
    expect(screen.getByText(/recording failed and produced no audio or video/)).toBeInTheDocument()
  })
})

// ---- Object-URL ownership ---------------------------------------------------

describe('object-URL ownership (the saved photo must not blank)', () => {
  async function capturePhotoLive(h: Harness) {
    const view = mount(h)
    await grant()
    const preview = screen.getByLabelText('Live camera preview')
    Object.defineProperty(preview, 'videoWidth', { value: 640, configurable: true })
    Object.defineProperty(preview, 'videoHeight', { value: 480, configurable: true })
    await act(async () => {
      fireEvent.click(shutter('Take photo'))
    })
    return view
  }

  it('hands the URL off on a successful save, so unmount leaves it alive', async () => {
    // Mutation probe for `handOff()`: delete the call and the unmount sweep revokes the URL the
    // store is now rendering — the saved photo blanks with no error anywhere.
    const h = harness({ live: true, accept: true })
    const view = await capturePhotoLive(h)

    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    expect(h.saved[0].captured.url).toBe('blob:mint/1')

    view.unmount()
    expect(h.revoked).not.toContain('blob:mint/1')
  })

  it('still revokes when the bridge refused the save — nothing owns those bytes', async () => {
    const h = harness({ live: true, accept: false })
    const view = await capturePhotoLive(h)

    fireEvent.click(screen.getByRole('button', { name: 'Save image' }))
    view.unmount()
    expect(h.revoked).toContain('blob:mint/1')
  })

  it('revokes the frame a retake throws away', async () => {
    const h = harness({ live: true })
    await capturePhotoLive(h)

    fireEvent.click(screen.getByRole('button', { name: 'Retake image' }))
    expect(h.revoked).toContain('blob:mint/1')
  })
})
