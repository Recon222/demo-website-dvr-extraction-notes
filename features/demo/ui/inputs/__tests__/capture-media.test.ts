import { describe, expect, it, vi } from 'vitest'

import {
  captureConstraints,
  grabVideoFrame,
  listCaptureDevices,
  openCaptureStream,
  readBrowserMediaDevices,
  readBrowserRecorder,
  startStreamRecording,
  stopStream,
  type MediaDevicesLike,
} from '@/features/demo/ui/inputs/capture-media'
import {
  domError,
  fakeCanvas,
  fakeRecorder,
  fakeRecorderIo,
  fakeStream,
  fakeVideo,
} from '@/features/demo/ui/inputs/__tests__/capture-media-io'

const devices = (over: Partial<MediaDevicesLike>): MediaDevicesLike => ({
  getUserMedia: vi.fn(async () => fakeStream()),
  enumerateDevices: vi.fn(async () => []),
  ...over,
})

describe('readBrowserMediaDevices', () => {
  it('returns null under the test environment — the sample path is the default contract', () => {
    // vitest.setup.ts deliberately leaves `navigator.mediaDevices` undefined. Every
    // permission/sample arm in this package hangs off exactly this.
    expect(readBrowserMediaDevices()).toBeNull()
  })

  it('returns null for a mediaDevices object without getUserMedia', () => {
    vi.stubGlobal('navigator', { mediaDevices: {} })
    expect(readBrowserMediaDevices()).toBeNull()
    vi.unstubAllGlobals()
  })

  it('returns the API when it is present', () => {
    const media = devices({})
    vi.stubGlobal('navigator', { mediaDevices: media })
    expect(readBrowserMediaDevices()).toBe(media)
    vi.unstubAllGlobals()
  })
})

describe('readBrowserRecorder', () => {
  it('returns null under the test environment — jsdom ships no MediaRecorder', () => {
    expect(readBrowserRecorder()).toBeNull()
  })

  it('treats a MediaRecorder without isTypeSupported as supporting nothing', () => {
    // The spec makes `isTypeSupported` optional. Reporting everything unsupported routes
    // through `pickRecorderMimeType`'s null → "let the browser choose", not a refusal.
    class Bare {}
    vi.stubGlobal('MediaRecorder', Bare)
    expect(readBrowserRecorder()?.isTypeSupported('video/webm')).toBe(false)
    vi.unstubAllGlobals()
  })

  it('delegates to a real isTypeSupported when present', () => {
    class Recorder {
      static isTypeSupported(type: string) {
        return type === 'video/webm'
      }
    }
    vi.stubGlobal('MediaRecorder', Recorder)
    const io = readBrowserRecorder()
    expect(io?.isTypeSupported('video/webm')).toBe(true)
    expect(io?.isTypeSupported('video/mp4')).toBe(false)
    vi.unstubAllGlobals()
  })
})

describe('captureConstraints', () => {
  it('asks for video only by default on the camera', () => {
    expect(captureConstraints({ facility: 'camera' })).toEqual({ video: true, audio: false })
  })

  it('adds audio when the caller wants sound with a video recording', () => {
    expect(captureConstraints({ facility: 'camera', withAudio: true })).toEqual({ video: true, audio: true })
  })

  it('never opens the camera for a microphone request', () => {
    expect(captureConstraints({ facility: 'microphone' })).toEqual({ video: false, audio: true })
  })

  it('pins a chosen device with `exact` so a vanished one fails loudly', () => {
    // A non-exact deviceId is a HINT: the browser may quietly open a different camera than
    // the picker says is selected.
    expect(captureConstraints({ facility: 'camera', deviceId: 'cam-2' })).toEqual({
      video: { deviceId: { exact: 'cam-2' } },
      audio: false,
    })
    expect(captureConstraints({ facility: 'microphone', deviceId: 'mic-2' })).toEqual({
      video: false,
      audio: { deviceId: { exact: 'mic-2' } },
    })
  })
})

describe('openCaptureStream', () => {
  it('reports UNSUPPORTED when the page has no capture API', async () => {
    const outcome = await openCaptureStream({ facility: 'camera' }, { mediaDevices: null })
    expect(outcome).toEqual({
      ok: false,
      failure: { code: 'UNSUPPORTED', message: expect.stringContaining('camera') },
    })
  })

  it('returns the stream and reports whether it carries audio', async () => {
    const withSound = await openCaptureStream(
      { facility: 'camera', withAudio: true },
      { mediaDevices: devices({ getUserMedia: async () => fakeStream(['video', 'audio']) }) },
    )
    expect(withSound).toMatchObject({ ok: true, hasAudio: true, audioDegraded: false })

    const silent = await openCaptureStream(
      { facility: 'camera' },
      { mediaDevices: devices({ getUserMedia: async () => fakeStream(['video']) }) },
    )
    expect(silent).toMatchObject({ ok: true, hasAudio: false, audioDegraded: false })
  })

  it.each(['NotAllowedError', 'NotFoundError', 'NotReadableError'])(
    'classifies a %s on a plain request as a failure, never a partial success',
    async (name) => {
      const outcome = await openCaptureStream(
        { facility: 'microphone' },
        { mediaDevices: devices({ getUserMedia: async () => Promise.reject(domError(name)) }) },
      )
      expect(outcome.ok).toBe(false)
    },
  )

  describe('the audio-degradation ladder', () => {
    /** Fails the audio+video request, succeeds the video-only retry. */
    const micHostile = (name: string) => {
      const getUserMedia = vi.fn(async (constraints: MediaStreamConstraints) => {
        if (constraints.audio !== false) throw domError(name)
        return fakeStream(['video'])
      })
      return { getUserMedia, media: devices({ getUserMedia }) }
    }

    it.each(['NotFoundError', 'NotAllowedError'])(
      'falls back to silent video when the mic is the problem (%s) and SAYS so',
      async (name) => {
        // Reporting "No camera device available" because the machine has no microphone would
        // be plainly false; so would a silent video the visitor thinks has sound.
        const { getUserMedia, media } = micHostile(name)
        const outcome = await openCaptureStream(
          { facility: 'camera', withAudio: true },
          { mediaDevices: media },
        )
        expect(outcome).toMatchObject({ ok: true, hasAudio: false, audioDegraded: true })
        expect(getUserMedia).toHaveBeenCalledTimes(2)
        expect(getUserMedia.mock.calls[1][0]).toEqual({ video: true, audio: false })
      },
    )

    it('reports the failure when the camera itself is refused', async () => {
      const media = devices({ getUserMedia: async () => Promise.reject(domError('NotAllowedError')) })
      const outcome = await openCaptureStream({ facility: 'camera', withAudio: true }, { mediaDevices: media })
      expect(outcome).toEqual({ ok: false, failure: { code: 'PERMISSION_DENIED', message: expect.any(String) } })
    })

    it('does not retry a busy device — the ladder is only for the mic-optional case', async () => {
      const getUserMedia = vi.fn(async () => Promise.reject(domError('NotReadableError')))
      const outcome = await openCaptureStream(
        { facility: 'camera', withAudio: true },
        { mediaDevices: devices({ getUserMedia }) },
      )
      expect(outcome).toMatchObject({ ok: false, failure: { code: 'DEVICE_BUSY' } })
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('does not retry a microphone request — there is nothing to degrade to', async () => {
      const getUserMedia = vi.fn(async () => Promise.reject(domError('NotFoundError')))
      await openCaptureStream({ facility: 'microphone' }, { mediaDevices: devices({ getUserMedia }) })
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })

    it('does not retry when audio was never asked for', async () => {
      const getUserMedia = vi.fn(async () => Promise.reject(domError('NotFoundError')))
      await openCaptureStream({ facility: 'camera' }, { mediaDevices: devices({ getUserMedia }) })
      expect(getUserMedia).toHaveBeenCalledTimes(1)
    })
  })
})

describe('listCaptureDevices', () => {
  it('maps the enumeration through the engine filter', async () => {
    const result = await listCaptureDevices('camera', {
      mediaDevices: devices({
        enumerateDevices: async () =>
          [
            { deviceId: 'c1', kind: 'videoinput', label: 'Front' },
            { deviceId: 'm1', kind: 'audioinput', label: 'Mic' },
          ] as MediaDeviceInfo[],
      }),
    })
    expect(result.failure).toBeNull()
    expect(result.devices).toEqual([
      { deviceId: 'c1', label: 'Front', facility: 'camera', labelSynthesized: false },
    ])
  })

  it('surfaces an enumeration failure rather than an indistinguishable empty list', async () => {
    // An empty picker because enumeration FAILED looks identical to one because there are no
    // devices — only one of those is worth telling the visitor about.
    const result = await listCaptureDevices('camera', {
      mediaDevices: devices({ enumerateDevices: async () => Promise.reject(domError('NotAllowedError')) }),
    })
    expect(result.devices).toEqual([])
    expect(result.failure).toMatchObject({ code: 'PERMISSION_DENIED' })
  })

  it('reports UNSUPPORTED with no API at all', async () => {
    expect(await listCaptureDevices('microphone', { mediaDevices: null })).toMatchObject({
      devices: [],
      failure: { code: 'UNSUPPORTED' },
    })
  })

  it('reports UNSUPPORTED when enumerateDevices is missing from the API object', async () => {
    const partial = { getUserMedia: vi.fn() } as unknown as MediaDevicesLike
    expect(await listCaptureDevices('camera', { mediaDevices: partial })).toMatchObject({
      failure: { code: 'UNSUPPORTED' },
    })
  })
})

describe('stopStream', () => {
  it('stops every track — the web analog of releasing the camera on blur', () => {
    const stream = fakeStream(['video', 'audio'])
    stopStream(stream)
    expect(stream.tracks.every((t) => t.stop.mock.calls.length === 1)).toBe(true)
  })

  it('tolerates null and a stream without getTracks', () => {
    expect(() => stopStream(null)).not.toThrow()
    expect(() => stopStream({} as MediaStream)).not.toThrow()
  })
})

describe('grabVideoFrame', () => {
  it('fails when the camera has not delivered a frame yet', async () => {
    // Encoding a zero-size canvas would hand back a blank picture presented as a capture.
    for (const video of [fakeVideo(0, 0), fakeVideo(640, 0), fakeVideo(0, 480)]) {
      const outcome = await grabVideoFrame(video, { createCanvas: () => fakeCanvas() })
      expect(outcome).toMatchObject({ ok: false, failure: { code: 'FRAME_GRAB_FAILED' } })
    }
  })

  it('fails when there is no 2d context — the default path in this suite', async () => {
    const outcome = await grabVideoFrame(fakeVideo(640, 480), {
      createCanvas: () => fakeCanvas({ context: false }),
    })
    expect(outcome).toMatchObject({ ok: false, failure: { code: 'FRAME_GRAB_FAILED' } })
  })

  it('fails on a null blob and on a zero-byte blob', async () => {
    for (const blob of [null, new Blob([])]) {
      const outcome = await grabVideoFrame(fakeVideo(640, 480), { createCanvas: () => fakeCanvas({ blob }) })
      expect(outcome).toMatchObject({ ok: false, failure: { code: 'FRAME_GRAB_FAILED' } })
    }
  })

  it('encodes the full frame at its intrinsic size', async () => {
    const canvas = fakeCanvas()
    const outcome = await grabVideoFrame(fakeVideo(640, 480), { createCanvas: () => canvas })
    expect(outcome).toMatchObject({ ok: true, mimeType: 'image/jpeg', width: 640, height: 480 })
    expect(canvas.width).toBe(640)
    expect(canvas.height).toBe(480)
    expect(canvas.drawCalls[0].slice(1)).toEqual([0, 0, 640, 480, 0, 0, 640, 480])
  })

  it('crops to a normalized sub-rectangle (P4.7 OCR strip)', async () => {
    const canvas = fakeCanvas()
    const outcome = await grabVideoFrame(fakeVideo(1000, 500), {
      createCanvas: () => canvas,
      crop: { x: 0.1, y: 0.4, width: 0.8, height: 0.17 },
    })
    expect(outcome).toMatchObject({ ok: true, width: 800, height: 85 })
    expect(canvas.drawCalls[0].slice(1)).toEqual([100, 200, 800, 85, 0, 0, 800, 85])
  })

  it('never produces a zero-dimension crop', async () => {
    const canvas = fakeCanvas()
    await grabVideoFrame(fakeVideo(640, 480), {
      createCanvas: () => canvas,
      crop: { x: 0, y: 0, width: 0.0001, height: 0.0001 },
    })
    expect(canvas.width).toBe(1)
    expect(canvas.height).toBe(1)
  })

  it('omits the data URL unless asked — a 1080p frame is megabytes of base64', async () => {
    const plain = await grabVideoFrame(fakeVideo(640, 480), { createCanvas: () => fakeCanvas() })
    expect(plain).toMatchObject({ ok: true })
    expect((plain as { dataUrl?: string }).dataUrl).toBeUndefined()

    const withUrl = await grabVideoFrame(fakeVideo(640, 480), {
      createCanvas: () => fakeCanvas({ dataUrl: 'data:image/jpeg;base64,ZZ' }),
      includeDataUrl: true,
    })
    expect((withUrl as { dataUrl?: string }).dataUrl).toBe('data:image/jpeg;base64,ZZ')
  })

  it('falls back to the requested mime when the blob reports none', async () => {
    const outcome = await grabVideoFrame(fakeVideo(10, 10), {
      createCanvas: () => fakeCanvas({ blob: new Blob(['x']) }),
      mimeType: 'image/png',
    })
    expect(outcome).toMatchObject({ ok: true, mimeType: 'image/png' })
  })
})

describe('startStreamRecording', () => {
  it('reports UNSUPPORTED with no MediaRecorder — the sample path', async () => {
    expect(startStreamRecording(fakeStream(), 'audio', { recorder: null })).toEqual({
      ok: false,
      failure: { code: 'UNSUPPORTED', message: expect.stringContaining('microphone') },
    })
  })

  it('constructs with the preferred mime type when one is supported', () => {
    const io = fakeRecorderIo(fakeRecorder(), (t) => t.startsWith('audio/webm'))
    startStreamRecording(fakeStream(['audio']), 'audio', { recorder: io })
    expect(io.options).toEqual({ mimeType: 'audio/webm;codecs=opus' })
  })

  it('constructs with NO options when nothing is supported — lets the browser choose', () => {
    const io = fakeRecorderIo(fakeRecorder(), () => false)
    startStreamRecording(fakeStream(['audio']), 'audio', { recorder: io })
    expect(io.options).toBeUndefined()
  })

  it('reports a constructor throw as RECORDING_FAILED, not a device-open code', () => {
    // The device is already open by this point. Classifying an unsupported-container throw
    // as UNKNOWN would render "the camera could not be opened" — the wrong thing entirely.
    const io = {
      create: () => {
        throw domError('NotSupportedError')
      },
      isTypeSupported: () => false,
    }
    expect(startStreamRecording(fakeStream(), 'video', { recorder: io })).toEqual({
      ok: false,
      failure: { code: 'RECORDING_FAILED', message: expect.stringContaining('nothing was saved') },
    })
  })

  it('reports a start() throw as RECORDING_FAILED', () => {
    const recorder = fakeRecorder()
    recorder.failStart = true
    expect(startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })).toMatchObject({
      ok: false,
      failure: { code: 'RECORDING_FAILED' },
    })
  })

  it('assembles the chunks into one blob on stop', async () => {
    const recorder = fakeRecorder('video/webm')
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')

    recorder.emitData('aaa')
    recorder.emitData('bbbb')
    const pending = started.handle.stop()
    recorder.emitStop()

    const outcome = await pending
    expect(outcome).toMatchObject({ ok: true, mimeType: 'video/webm' })
    if (outcome === null || !outcome.ok) throw new Error('expected bytes')
    expect(outcome.blob.size).toBe(7)
  })

  it('reports RECORDING_FAILED for a take that produced zero bytes', async () => {
    // An empty .webm in a case file is worse than a visible failure — it looks like evidence.
    const recorder = fakeRecorder('audio/webm')
    const started = startStreamRecording(fakeStream(['audio']), 'audio', {
      recorder: fakeRecorderIo(recorder),
    })
    if (!started.ok) throw new Error('expected a handle')

    const pending = started.handle.stop()
    recorder.emitStop()
    expect(await pending).toEqual({
      ok: false,
      failure: { code: 'RECORDING_FAILED', message: expect.stringContaining('nothing was saved') },
    })
  })

  it('reports RECORDING_FAILED when the recorder errored before stopping', async () => {
    const recorder = fakeRecorder()
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')

    recorder.emitData('aaa')
    recorder.emitError()
    const outcome = await started.handle.stop()
    expect(outcome).toMatchObject({ ok: false, failure: { code: 'RECORDING_FAILED' } })
  })

  it('resolves a pending stop when error arrives without a following stop event', async () => {
    // A browser that fires `error` and never `stop` would otherwise leave the promise pending
    // forever and the UI stuck on "saving".
    const recorder = fakeRecorder()
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')

    const pending = started.handle.stop()
    recorder.emitError()
    expect(await pending).toMatchObject({ ok: false, failure: { code: 'RECORDING_FAILED' } })
  })

  it('pauses and resumes only in phase', () => {
    const recorder = fakeRecorder()
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')

    started.handle.resume() // not paused — no-op
    expect(recorder.paused).toBe(false)
    started.handle.pause()
    expect(recorder.paused).toBe(true)
    started.handle.pause() // already paused — no-op
    started.handle.resume()
    expect(recorder.paused).toBe(false)
  })

  it('ignores pause/resume after the take has settled', async () => {
    const recorder = fakeRecorder()
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')
    recorder.emitData('a')
    const pending = started.handle.stop()
    recorder.emitStop()
    await pending

    started.handle.pause()
    expect(recorder.paused).toBe(false)
  })

  it('reads the mime type back off the recorder rather than assuming the request', () => {
    // The browser may honour a different container than the one asked for; the filename
    // extension is derived from what it actually reports.
    const recorder = fakeRecorder('video/x-matroska;codecs=avc1')
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')
    expect(started.handle.mimeType()).toBe('video/x-matroska;codecs=avc1')
  })

  describe('abort mid-recording', () => {
    it('discards the bytes and resolves a pending stop with null, not a failure', async () => {
      // An abandoned take is neither a result nor something the operator should see an error
      // about — the same `null` convention `captureGps` uses for an abandoned capture.
      const recorder = fakeRecorder()
      const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
      if (!started.ok) throw new Error('expected a handle')

      recorder.emitData('aaa')
      const pending = started.handle.stop()
      started.handle.abort()
      recorder.emitStop()

      expect(await pending).toBeNull()
    })

    it('resolves a later stop() with null immediately', async () => {
      const recorder = fakeRecorder()
      const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
      if (!started.ok) throw new Error('expected a handle')

      recorder.emitData('aaa')
      started.handle.abort()
      recorder.emitStop()
      expect(await started.handle.stop()).toBeNull()
    })

    it('settles even when the recorder was already inactive (no onstop will arrive)', async () => {
      const recorder = fakeRecorder()
      const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
      if (!started.ok) throw new Error('expected a handle')

      recorder.failNextStop = true
      started.handle.abort()
      expect(await started.handle.stop()).toBeNull()
    })

    it('is idempotent and does not double-stop the recorder', () => {
      const recorder = fakeRecorder()
      const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
      if (!started.ok) throw new Error('expected a handle')

      started.handle.abort()
      recorder.emitStop()
      started.handle.abort()
      expect(recorder.stopCalls).toBe(1)
    })

    it('leaves a completed take alone', async () => {
      const recorder = fakeRecorder()
      const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
      if (!started.ok) throw new Error('expected a handle')

      recorder.emitData('aaa')
      const pending = started.handle.stop()
      recorder.emitStop()
      await pending

      started.handle.abort()
      expect(await started.handle.stop()).toMatchObject({ ok: true })
    })
  })

  it('returns the same promise for a repeated stop()', async () => {
    const recorder = fakeRecorder()
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')

    recorder.emitData('a')
    const first = started.handle.stop()
    const second = started.handle.stop()
    expect(first).toBe(second)
    recorder.emitStop()
    await first
    expect(recorder.stopCalls).toBe(1)
  })

  it('reports a stop() throw as RECORDING_FAILED rather than hanging', async () => {
    const recorder = fakeRecorder()
    const started = startStreamRecording(fakeStream(), 'video', { recorder: fakeRecorderIo(recorder) })
    if (!started.ok) throw new Error('expected a handle')

    recorder.failNextStop = true
    expect(await started.handle.stop()).toMatchObject({
      ok: false,
      failure: { code: 'RECORDING_FAILED' },
    })
  })
})
