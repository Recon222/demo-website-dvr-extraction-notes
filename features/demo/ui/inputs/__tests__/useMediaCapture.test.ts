import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { MAX_RECORDING_DURATION_MS } from '@/features/demo/engine/logic/media/recording'
import { NO_RECORDER_NOTICE, SAMPLE_MEDIA, SAMPLE_MEDIA_NOTICE } from '@/features/demo/engine/logic/media/samples'
import {
  RECORDING_TICK_MS,
  useMediaCapture,
  type UseMediaCaptureOptions,
} from '@/features/demo/ui/inputs/useMediaCapture'
import { MEDIA_KINDS } from '@/features/demo/engine/types'
import type { MediaDevicesLike, RecorderIo } from '@/features/demo/ui/inputs/capture-media'
import type { ObjectUrlIo } from '@/features/demo/ui/inputs/object-urls'
import {
  domError,
  fakeCanvas,
  fakeRecorder,
  fakeRecorderIo,
  fakeStream,
  fakeVideo,
  type FakeRecorder,
} from '@/features/demo/ui/inputs/__tests__/capture-media-io'

/** A counting object-URL io, so leaks and revocations are observable. */
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

function devices(over: Partial<MediaDevicesLike> = {}): MediaDevicesLike {
  return {
    getUserMedia: vi.fn(async () => fakeStream(['video', 'audio'])),
    enumerateDevices: vi.fn(async () => [] as MediaDeviceInfo[]),
    ...over,
  }
}

/** Mount the hook with a controllable clock and object-URL io. */
function mount(over: Partial<UseMediaCaptureOptions> = {}, recorder?: RecorderIo | null) {
  const { io, revoked } = urlIo()
  let nowMs = 1_000_000
  const options: UseMediaCaptureOptions = {
    facility: 'camera',
    ...over,
    deps: {
      mediaDevices: devices(),
      recorder: recorder ?? null,
      objectUrls: io,
      now: () => nowMs,
      capturedAt: () => '2026-07-30 14:05:06',
      ...over.deps,
    },
  }
  const hook = renderHook(() => useMediaCapture(options))
  return { ...hook, revoked, advance: (ms: number) => (nowMs += ms), nowMs: () => nowMs }
}

describe('capability reporting', () => {
  it('reports every kind as sample when the page has no capture API (the suite default)', () => {
    const { result } = renderHook(() => useMediaCapture({ facility: 'camera' }))
    const { stream, record, objectUrls, modeFor } = result.current.capability
    // `objectUrls` is deterministically true here, not incidental: §58a establishes that under
    // Vitest the global `URL` is NODE's, which implements object URLs even though jsdom's
    // `window.URL` does not. Asserting `expect.any(Boolean)` (R-31) asserted nothing.
    expect({ stream, record, objectUrls }).toEqual({ stream: false, record: false, objectUrls: true })
    expect(MEDIA_KINDS.map(modeFor)).toEqual(['sample', 'sample', 'sample'])
    expect(result.current.permission).toBe('unavailable')
  })

  it('answers per operation: real photos, sample clips, on a browser with no MediaRecorder', () => {
    // R-3: the defect this replaced was a single stored `sampleOnly`, which answered the PHOTO
    // question and was consumed as the answer for everything.
    const { result } = mount({}, null)
    expect(result.current.capability.stream).toBe(true)
    expect(result.current.capability.record).toBe(false)
    expect(result.current.capability.modeFor('photo')).toBe('live')
    expect(result.current.capability.modeFor('video')).toBe('sample')
  })

  it('reports every kind live when a MediaRecorder exists', () => {
    const { result } = mount({}, fakeRecorderIo(fakeRecorder()))
    expect(result.current.capability.record).toBe(true)
    expect(MEDIA_KINDS.map(result.current.capability.modeFor)).toEqual(['live', 'live', 'live'])
  })

  it('falls back for every kind when object URLs are unavailable — captured bytes would be unviewable', () => {
    const { result } = mount({ deps: { objectUrls: null } }, fakeRecorderIo(fakeRecorder()))
    expect(result.current.capability.objectUrls).toBe(false)
    expect(MEDIA_KINDS.map(result.current.capability.modeFor)).toEqual(['sample', 'sample', 'sample'])
  })

  it('flips every kind to sample once the machine reports no camera at all', async () => {
    const { result } = mount({
      deps: { mediaDevices: devices({ getUserMedia: async () => Promise.reject(domError('NotFoundError')) }) },
    })
    expect(result.current.capability.modeFor('photo')).toBe('live')
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.permission).toBe('unavailable')
    expect(MEDIA_KINDS.map(result.current.capability.modeFor)).toEqual(['sample', 'sample', 'sample'])
  })

  it('carries the sentence for the binding reason, keyed to this surface’s facility', () => {
    expect(mount({}, null).result.current.capability.sampleNotice).toBe(NO_RECORDER_NOTICE.camera)
    expect(mount({ facility: 'microphone' }, null).result.current.capability.sampleNotice).toBe(
      NO_RECORDER_NOTICE.microphone,
    )
    expect(
      mount({ deps: { mediaDevices: null } }, fakeRecorderIo(fakeRecorder())).result.current.capability.sampleNotice,
    ).toBe(SAMPLE_MEDIA_NOTICE.camera)
  })
})

describe('the sample fallback is never automatic', () => {
  it('a denied camera yields a denied state and NO capture', async () => {
    // The whole honesty rule in one arm: a refusal must never become a picture.
    const { result } = mount({
      deps: { mediaDevices: devices({ getUserMedia: async () => Promise.reject(domError('NotAllowedError')) }) },
    })
    await act(async () => {
      await result.current.open()
    })
    expect(result.current.permission).toBe('denied')
    expect(result.current.captured).toBeNull()
    expect(result.current.failure).toMatchObject({ code: 'PERMISSION_DENIED' })
  })

  it('an unavailable capability yields no capture until the surface asks for one', () => {
    const { result } = renderHook(() => useMediaCapture({ facility: 'camera' }))
    expect(result.current.captured).toBeNull()
  })

  it('captureSample returns the bundled asset, labelled', () => {
    const { result } = mount()
    let media = null as ReturnType<typeof result.current.captureSample> | null
    act(() => {
      media = result.current.captureSample('photo')
    })
    expect(media).toMatchObject({ kind: 'photo', url: SAMPLE_MEDIA.photo.url, sample: true })
    expect(result.current.captured).toMatchObject({ sample: true })
  })

  it('never revokes a sample URL — it is a static file, not an object URL', () => {
    const { result, revoked } = mount()
    act(() => {
      result.current.captureSample('video')
    })
    act(() => {
      result.current.discard()
    })
    expect(revoked).toEqual([])
    expect(result.current.captured).toBeNull()
  })

  it('stamps the sample with the capture time from the clock seam', () => {
    const { result } = mount()
    act(() => {
      result.current.captureSample('audio')
    })
    expect(result.current.captured?.capturedAt).toBe('2026-07-30 14:05:06')
  })
})

describe('photo capture', () => {
  it('mints an object URL for the frame and reports its size', async () => {
    const { result } = mount()
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    })
    expect(result.current.captured).toMatchObject({
      kind: 'photo',
      url: 'blob:mint/1',
      mimeType: 'image/jpeg',
      sample: false,
    })
    expect(result.current.captured?.sizeBytes).toBeGreaterThan(0)
  })

  it('surfaces a frame-grab failure and captures NOTHING', async () => {
    const { result } = mount()
    await act(async () => {
      expect(
        await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas({ context: false }) }),
      ).toBeNull()
    })
    expect(result.current.captured).toBeNull()
    expect(result.current.failure).toMatchObject({ code: 'FRAME_GRAB_FAILED' })
  })

  it('revokes the previous frame on a retake', async () => {
    const { result, revoked } = mount()
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    })
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    })
    expect(revoked).toEqual(['blob:mint/1'])
    expect(result.current.captured?.url).toBe('blob:mint/2')
  })

  it('reports UNSUPPORTED rather than a URL-less capture when object URLs are missing', async () => {
    const { result } = mount({ deps: { objectUrls: null } })
    await act(async () => {
      expect(await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })).toBeNull()
    })
    expect(result.current.failure).toMatchObject({ code: 'UNSUPPORTED' })
  })
})

describe('recording lifecycle', () => {
  /** Opens the stream and starts a take, returning the fake recorder driving it. */
  async function rolling(facility: 'camera' | 'microphone' = 'microphone') {
    const recorder = fakeRecorder(facility === 'microphone' ? 'audio/webm' : 'video/webm')
    const harness = mount({ facility }, fakeRecorderIo(recorder))
    await act(async () => {
      await harness.result.current.open()
    })
    act(() => {
      expect(harness.result.current.startRecording()).toBe(true)
    })
    return { ...harness, recorder }
  }

  it('refuses to start without a stream, and says so', () => {
    const { result } = mount({ facility: 'microphone' }, fakeRecorderIo(fakeRecorder()))
    act(() => {
      expect(result.current.startRecording()).toBe(false)
    })
    expect(result.current.phase).toBe('idle')
    expect(result.current.failure).toMatchObject({ code: 'UNSUPPORTED' })
  })

  it('refuses to start with no MediaRecorder, and says so', async () => {
    const { result } = mount({ facility: 'microphone' }, null)
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      expect(result.current.startRecording()).toBe(false)
    })
    expect(result.current.failure).toMatchObject({ code: 'UNSUPPORTED' })
  })

  it('moves through recording → paused → recording → stopped', async () => {
    const { result, recorder, advance } = await rolling()
    expect(result.current.phase).toBe('recording')

    advance(1_000)
    act(() => {
      result.current.pauseRecording()
    })
    expect(result.current.phase).toBe('paused')
    expect(recorder.paused).toBe(true)
    expect(result.current.elapsedMs).toBe(1_000)

    advance(9_000) // paused: must not count
    act(() => {
      result.current.resumeRecording()
    })
    expect(result.current.phase).toBe('recording')
    expect(result.current.elapsedMs).toBe(1_000)

    advance(2_000)
    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
      recorder.emitData('bytes')
      recorder.emitStop()
    })
    await act(async () => {
      await pending
    })
    expect(result.current.phase).toBe('stopped')
    expect(result.current.captured).toMatchObject({ kind: 'audio', url: 'blob:mint/1', durationSec: 3 })
  })

  it('gates Stop on the phone 500ms minimum', async () => {
    const { result, advance } = await rolling()
    expect(result.current.canStop).toBe(false)
    advance(500)
    act(() => {
      result.current.pauseRecording() // any transition refreshes the elapsed readout
      result.current.resumeRecording()
    })
    expect(result.current.canStop).toBe(true)
  })

  it('reports a zero-byte take as a failure, never a saved capture', async () => {
    const { result, recorder } = await rolling()
    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
      recorder.emitStop() // no data ever arrived
    })
    await act(async () => {
      expect(await pending).toBeNull()
    })
    expect(result.current.captured).toBeNull()
    expect(result.current.failure).toMatchObject({ code: 'RECORDING_FAILED' })
  })

  it('names the container the recorder actually produced', async () => {
    const recorder = fakeRecorder('video/webm;codecs=vp9')
    const { result } = mount({ facility: 'camera' }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
    })
    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
      recorder.emitData('bytes')
      recorder.emitStop()
    })
    await act(async () => {
      await pending
    })
    expect(result.current.captured?.mimeType).toBe('video/webm;codecs=vp9')
  })

  it('ignores out-of-phase pause/resume', async () => {
    const { result } = mount({ facility: 'microphone' }, fakeRecorderIo(fakeRecorder()))
    act(() => {
      result.current.pauseRecording()
      result.current.resumeRecording()
    })
    expect(result.current.phase).toBe('idle')
  })

  it('stopRecording on an idle recorder resolves null without touching state', async () => {
    const { result } = mount({ facility: 'microphone' }, fakeRecorderIo(fakeRecorder()))
    await act(async () => {
      expect(await result.current.stopRecording()).toBeNull()
    })
    expect(result.current.phase).toBe('idle')
  })
})

describe('abort mid-recording', () => {
  it('returns to idle, discards the bytes and produces no capture and no failure', async () => {
    const recorder = fakeRecorder('audio/webm')
    const { result, revoked } = mount({ facility: 'microphone' }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      recorder.emitData('bytes')
      result.current.abortRecording()
      recorder.emitStop()
    })

    expect(result.current.phase).toBe('idle')
    expect(result.current.elapsedMs).toBe(0)
    expect(result.current.captured).toBeNull()
    // An abandoned take is neither a result nor an error the operator should be shown.
    expect(result.current.failure).toBeNull()
    expect(revoked).toEqual([])
  })

  it('leaves the recorder ready for another take', async () => {
    const first = fakeRecorder('audio/webm')
    const second = fakeRecorder('audio/webm')
    let call = 0
    const io: RecorderIo = { create: () => (call++ === 0 ? first : second), isTypeSupported: () => true }
    const { result } = mount({ facility: 'microphone' }, io)
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      result.current.abortRecording()
    })
    act(() => {
      expect(result.current.startRecording()).toBe(true)
    })
    expect(result.current.phase).toBe('recording')
  })
})

describe('object-URL ownership', () => {
  it('sweeps a pending capture on unmount', async () => {
    const { result, revoked, unmount } = mount()
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    })
    unmount()
    expect(revoked).toEqual(['blob:mint/1'])
  })

  it('handOff leaves the URL alive — the store owns it now', async () => {
    // The pin for the hand-off contract: after saving, unmount must NOT blank the photo the
    // visitor just added to the case.
    const { result, revoked, unmount } = mount()
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    })
    act(() => {
      result.current.handOff()
    })
    expect(result.current.captured).toBeNull()
    unmount()
    expect(revoked).toEqual([])
  })

  it('discard revokes immediately', async () => {
    const { result, revoked } = mount()
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    })
    act(() => {
      result.current.discard()
    })
    expect(revoked).toEqual(['blob:mint/1'])
    expect(result.current.captured).toBeNull()
  })

  it('stops a still-rolling recorder on unmount rather than leaving it encoding', async () => {
    // Nothing else stops it: the visitor navigated away mid-take, so no `stopRecording()` is
    // coming. Without the unmount abort the MediaRecorder keeps encoding into a component
    // that no longer exists.
    const recorder = fakeRecorder('audio/webm')
    const { result, unmount } = mount({ facility: 'microphone' }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      recorder.emitData('bytes')
    })
    expect(recorder.stopCalls).toBe(0)

    unmount()
    expect(recorder.stopCalls).toBe(1)
  })

  it('mints nothing after unmount when a stop() resolves late', async () => {
    const recorder = fakeRecorder('audio/webm')
    const { result, revoked, unmount } = mount({ facility: 'microphone' }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      recorder.emitData('bytes')
    })

    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
    })
    unmount()
    await act(async () => {
      recorder.emitStop()
      expect(await pending).toBeNull()
    })
    // A URL minted here would never be revoked — the registry has already been swept.
    expect(revoked).toEqual([])
  })
})

describe('the 1-hour auto-stop', () => {
  let recorder: FakeRecorder

  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('stops the take and notifies when the phone ceiling is reached', async () => {
    recorder = fakeRecorder('audio/webm')
    const onMaxDuration = vi.fn()
    const { result, advance } = mount({ facility: 'microphone', onMaxDuration }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      recorder.emitData('bytes')
    })

    advance(MAX_RECORDING_DURATION_MS)
    await act(async () => {
      vi.advanceTimersByTime(RECORDING_TICK_MS)
      recorder.emitStop()
      await Promise.resolve()
    })

    expect(onMaxDuration).toHaveBeenCalledTimes(1)
    expect(result.current.phase).toBe('stopped')
  })

  it('does not tick while paused', async () => {
    recorder = fakeRecorder('audio/webm')
    const onMaxDuration = vi.fn()
    const { result, advance } = mount({ facility: 'microphone', onMaxDuration }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      result.current.pauseRecording()
    })

    const pausedAt = result.current.elapsedMs
    advance(MAX_RECORDING_DURATION_MS * 2)
    act(() => {
      vi.advanceTimersByTime(RECORDING_TICK_MS * 10)
    })
    expect(onMaxDuration).not.toHaveBeenCalled()
    expect(result.current.phase).toBe('paused')
    // The readout must be frozen too — a ticking timer over a MediaRecorder that is emitting
    // nothing would display a duration the file does not contain.
    expect(result.current.elapsedMs).toBe(pausedAt)
  })
})


describe('the browser ending a take on its own (R-13)', () => {
  /** Open a stream and start a take, returning the driving fake recorder. */
  async function rolling() {
    const recorder = fakeRecorder('audio/webm')
    const harness = mount({ facility: 'microphone' }, fakeRecorderIo(recorder))
    await act(async () => {
      await harness.result.current.open()
    })
    act(() => {
      harness.result.current.startRecording()
      recorder.emitData('bytes')
    })
    return { ...harness, recorder }
  }

  it('stamps the RECORDED length, not the visitor\'s reaction time', async () => {
    // The defect: a take the browser ended at 10s, noticed at 30s, claimed 30s — an
    // unmeasured number rendered as fact in review, in the library row and in the info panel.
    const { result, recorder, advance } = await rolling()
    advance(10_000)
    await act(async () => {
      recorder.emitStop()
      await Promise.resolve()
    })
    advance(20_000)

    expect(result.current.captured?.durationSec).toBe(10)
  })

  it('freezes the elapsed readout at the real end instead of counting on', async () => {
    const { result, recorder, advance } = await rolling()
    advance(10_000)
    await act(async () => {
      recorder.emitStop()
      await Promise.resolve()
    })
    const atEnd = result.current.elapsedMs
    advance(20_000)

    expect(atEnd).toBe(10_000)
    expect(result.current.elapsedMs).toBe(10_000)
    expect(result.current.phase).toBe('stopped')
  })

  it('assembles the take rather than dropping it', async () => {
    const { result, recorder } = await rolling()
    await act(async () => {
      recorder.emitStop()
      await Promise.resolve()
    })
    expect(result.current.captured).toMatchObject({ kind: 'audio', url: 'blob:mint/1', sample: false })
  })

  it('a Stop pressed afterwards is a no-op, not a second assemble', async () => {
    const { result, recorder, revoked } = await rolling()
    await act(async () => {
      recorder.emitStop()
      await Promise.resolve()
    })
    const captured = result.current.captured
    await act(async () => {
      expect(await result.current.stopRecording()).toBeNull()
    })
    expect(result.current.captured).toBe(captured)
    expect(revoked).toEqual([])
  })

  it('reports a self-ended take that produced nothing as a failure', async () => {
    const recorder = fakeRecorder('audio/webm')
    const { result } = mount({ facility: 'microphone' }, fakeRecorderIo(recorder))
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
    })
    await act(async () => {
      recorder.emitStop() // no data ever arrived
      await Promise.resolve()
    })
    expect(result.current.captured).toBeNull()
    expect(result.current.failure).toMatchObject({ code: 'RECORDING_FAILED' })
  })
})


describe('a stale failure never outlives its cause (R-14)', () => {
  it('clears a frame-grab failure when a new acquisition starts', async () => {
    // `failure` is `ownFailure ?? streamState.failure`, and the stream hook clears only its
    // own half — so the grab sentence sat on top of every later acquisition state.
    const { result } = mount({}, null)
    await act(async () => {
      await result.current.open()
    })
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas({ context: false }) })
    })
    expect(result.current.failure).toMatchObject({ code: 'FRAME_GRAB_FAILED' })

    await act(async () => {
      await result.current.open()
    })
    expect(result.current.failure).toBeNull()
  })

  it('shows the NEW acquisition failure, not the old grab sentence', async () => {
    let deny = false
    const { result } = mount({
      deps: {
        mediaDevices: devices({
          getUserMedia: async () => {
            if (deny) throw domError('NotReadableError')
            return fakeStream(['video', 'audio'])
          },
        }),
      },
    })
    await act(async () => {
      await result.current.open()
    })
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas({ context: false }) })
    })

    deny = true
    await act(async () => {
      await result.current.selectDevice('cam-b')
    })
    expect(result.current.failure).toMatchObject({ code: 'DEVICE_BUSY' })
  })

  it('clears it on a device switch too', async () => {
    const { result } = mount({}, null)
    await act(async () => {
      await result.current.open()
    })
    await act(async () => {
      await result.current.capturePhoto(fakeVideo(640, 480), { createCanvas: () => fakeCanvas({ context: false }) })
    })
    await act(async () => {
      await result.current.selectDevice('cam-a')
    })
    expect(result.current.failure).toBeNull()
  })
})


describe('cancelling a take whose stop() is already in flight (FD-1)', () => {
  /** Open a stream and start a take, returning the driving fake recorder. */
  async function rolling() {
    const recorder = fakeRecorder('audio/webm')
    const harness = mount({ facility: 'microphone' }, fakeRecorderIo(recorder))
    await act(async () => {
      await harness.result.current.open()
    })
    act(() => {
      harness.result.current.startRecording()
      recorder.emitData('bytes')
    })
    return { ...harness, recorder }
  }

  it('discards the take instead of publishing it to review', async () => {
    // The window R-13's `finishTake` split closed off: `handleRef` was cleared BEFORE the
    // await, so `abortRecording`'s only route to the recorder hit nothing and the cancelled
    // take assembled, minted a URL and rendered as a result.
    const { result, recorder, revoked } = await rolling()

    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
    })
    act(() => {
      result.current.abortRecording()
    })
    await act(async () => {
      recorder.emitStop()
      expect(await pending).toBeNull()
    })

    expect(result.current.captured).toBeNull()
    expect(result.current.phase).toBe('idle')
    // Nothing was minted, so there is nothing to have revoked — a leak here would mean the
    // URL was created and then orphaned.
    expect(revoked).toEqual([])
  })

  it('reaches the recorder itself, rather than only hiding the result', async () => {
    const { result, recorder } = await rolling()
    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
    })
    act(() => {
      result.current.abortRecording()
    })
    await act(async () => {
      recorder.emitStop()
      await pending
    })
    // `abort()` is what discards the buffered chunks; a guard that only suppressed publishing
    // would leave the bytes assembled and the contract ("discard its bytes") still false.
    expect(recorder.stopCalls).toBeGreaterThan(0)
  })

  it('raises no failure — an abandoned take is not an error the operator should see', async () => {
    const { result, recorder } = await rolling()
    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
    })
    act(() => {
      result.current.abortRecording()
    })
    await act(async () => {
      recorder.emitStop()
      await pending
    })
    expect(result.current.failure).toBeNull()
  })

  it('does not un-set a handle a NEW take has already claimed', async () => {
    // Cancel, then start again while the first stop is still settling: the late resolution
    // must neither publish nor strip the second take's handle out from under it.
    const first = fakeRecorder('audio/webm')
    const second = fakeRecorder('audio/webm')
    let call = 0
    const io: RecorderIo = { create: () => (call++ === 0 ? first : second), isTypeSupported: () => true }
    const { result } = mount({ facility: 'microphone' }, io)
    await act(async () => {
      await result.current.open()
    })
    act(() => {
      result.current.startRecording()
      first.emitData('bytes')
    })

    let pending: Promise<unknown> = Promise.resolve()
    act(() => {
      pending = result.current.stopRecording()
    })
    act(() => {
      result.current.abortRecording()
      expect(result.current.startRecording()).toBe(true)
    })
    await act(async () => {
      first.emitStop()
      expect(await pending).toBeNull()
    })

    expect(result.current.phase).toBe('recording')
    expect(result.current.captured).toBeNull()

    // The second take still owns a live handle and completes normally.
    let secondPending: Promise<unknown> = Promise.resolve()
    act(() => {
      second.emitData('more')
      secondPending = result.current.stopRecording()
      second.emitStop()
    })
    await act(async () => {
      await secondPending
    })
    expect(result.current.captured).toMatchObject({ kind: 'audio', sample: false })
  })
})
