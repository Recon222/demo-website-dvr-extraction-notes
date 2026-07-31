'use client'

/**
 * Browser capture I/O — the thin layer between `getUserMedia` / `MediaRecorder` / `<canvas>`
 * and the pure core in `engine/logic/media/` (parity P4.1). The demo's analog of the phone's
 * vision-camera + expo-audio-studio services: everything it DECIDES about a capture lives in
 * the engine, so this file only orchestrates — ask, classify, record, assemble.
 *
 * Same shape as `capture-gps.ts` (P2.3), including its two conventions:
 * - every browser API is read through a `read*()` function at call time, never at module
 *   scope, so a test can install a stub first and so an SSR import cannot touch `navigator`;
 * - an ABANDONED operation resolves to `null` — neither a result nor a failure the operator
 *   should be shown — while a real failure resolves to a typed `CaptureFailure`.
 *
 * `navigator.mediaDevices` and `MediaRecorder` are both genuinely undefined under Vitest
 * (`vitest.setup.ts` leaves the former alone deliberately; jsdom ships no recorder), so the
 * unavailable/sample path is the DEFAULT tested contract.
 */

import {
  captureFailure,
  classifyCaptureError,
  pickRecorderMimeType,
  recorderMimeCandidates,
  toCaptureDevices,
  type CaptureDevice,
  type CaptureFacility,
  type CaptureFailure,
} from '@/features/demo/engine/logic/media'

// ---- Injection seams ------------------------------------------------------

/** The slice of `navigator.mediaDevices` this module uses. */
export interface MediaDevicesLike {
  getUserMedia(constraints: MediaStreamConstraints): Promise<MediaStream>
  enumerateDevices(): Promise<MediaDeviceInfo[]>
}

/** `navigator.mediaDevices`, or `null` where the page has none — jsdom, an insecure origin, a
 *  `Permissions-Policy` block. Read at call time. */
export function readBrowserMediaDevices(): MediaDevicesLike | null {
  if (typeof navigator === 'undefined') return null
  const devices = (navigator as Navigator & { mediaDevices?: MediaDevicesLike }).mediaDevices
  if (!devices || typeof devices.getUserMedia !== 'function') return null
  return devices
}

/** The slice of `MediaRecorder` this module uses. */
export interface MediaRecorderLike {
  readonly mimeType: string
  start(timesliceMs?: number): void
  stop(): void
  pause(): void
  resume(): void
  ondataavailable: ((event: { data: Blob }) => void) | null
  onstop: ((event?: unknown) => void) | null
  onerror: ((event: unknown) => void) | null
}

export interface RecorderIo {
  create(stream: MediaStream, options?: { mimeType?: string }): MediaRecorderLike
  isTypeSupported(type: string): boolean
}

/** The browser's `MediaRecorder`, or `null` where there is none.
 *
 *  `isTypeSupported` is treated as optional because it IS optional in some implementations;
 *  when absent every candidate reports unsupported, `pickRecorderMimeType` returns `null`,
 *  and the recorder is constructed with no `mimeType` — "let the browser choose", which is
 *  the honest fallback rather than a refusal. */
export function readBrowserRecorder(): RecorderIo | null {
  const ctor = (globalThis as { MediaRecorder?: unknown }).MediaRecorder
  if (typeof ctor !== 'function') return null
  const Recorder = ctor as new (stream: MediaStream, options?: { mimeType?: string }) => MediaRecorderLike
  const isTypeSupported = (ctor as { isTypeSupported?: (type: string) => boolean }).isTypeSupported
  return {
    create: (stream, options) => new Recorder(stream, options),
    isTypeSupported: (type) => (typeof isTypeSupported === 'function' ? isTypeSupported(type) : false),
  }
}

// ---- Stream acquisition ---------------------------------------------------

export interface CaptureStreamRequest {
  facility: CaptureFacility
  /** Camera only: also open an audio track, so a video recording carries sound. */
  withAudio?: boolean
  /** Pin a specific device (the demo's analog of the phone's front/back flip). */
  deviceId?: string
}

export interface CaptureStreamDeps {
  /** `null` means "this page has no capture API" → an `UNSUPPORTED` failure. */
  mediaDevices: MediaDevicesLike | null
}

export type CaptureStreamOutcome =
  | {
      ok: true
      stream: MediaStream
      /** Whether the stream carries an audio track. */
      hasAudio: boolean
      /** True when audio was ASKED for and refused, and the demo fell back to video-only.
       *  The surface must say so — a silent video the visitor believes has sound is a lie
       *  about what was recorded. */
      audioDegraded: boolean
    }
  | { ok: false; failure: CaptureFailure }

/** Constraints for a request. Exported for its own unit test — the `exact` deviceId is the
 *  part worth pinning: it makes a vanished device fail loudly (`OverconstrainedError` →
 *  `NO_DEVICE`) rather than silently opening a different camera than the picker claims. */
export function captureConstraints(request: CaptureStreamRequest): MediaStreamConstraints {
  const { facility, withAudio, deviceId } = request
  const pinned = deviceId !== undefined ? { deviceId: { exact: deviceId } } : true
  return facility === 'camera'
    ? { video: pinned, audio: withAudio === true }
    : { video: false, audio: pinned }
}

function hasAudioTrack(stream: MediaStream): boolean {
  return typeof stream.getAudioTracks === 'function' && stream.getAudioTracks().length > 0
}

/**
 * Open a capture stream.
 *
 * ONE deliberate behaviour beyond a plain `getUserMedia` call: the **audio-degradation
 * ladder**. A camera request that also asks for audio fails wholesale when the machine has
 * no microphone, or when the visitor grants the camera and refuses the mic — reporting "no
 * camera device available" in either case would be plainly false. So a combined request that
 * fails on a device-or-permission code is retried video-only; if THAT succeeds, the mic was
 * the problem, and the result carries `audioDegraded: true` for the surface to say so. This
 * matches the phone, which passes `audio={microphonePermission.hasPermission}` and records
 * silent video when the mic is not granted (ui-mapping 09) — it just has to discover the
 * fact by asking, because a browser answers for both devices at once.
 */
export async function openCaptureStream(
  request: CaptureStreamRequest,
  deps: CaptureStreamDeps,
): Promise<CaptureStreamOutcome> {
  const { mediaDevices } = deps
  if (!mediaDevices) return { ok: false, failure: captureFailure('UNSUPPORTED', request.facility) }

  try {
    const stream = await mediaDevices.getUserMedia(captureConstraints(request))
    return { ok: true, stream, hasAudio: hasAudioTrack(stream), audioDegraded: false }
  } catch (error) {
    const code = classifyCaptureError(error)
    const audioWasOptional =
      request.facility === 'camera' && request.withAudio === true && (code === 'NO_DEVICE' || code === 'PERMISSION_DENIED')
    if (!audioWasOptional) return { ok: false, failure: captureFailure(code, request.facility) }

    try {
      const stream = await mediaDevices.getUserMedia(captureConstraints({ ...request, withAudio: false }))
      return { ok: true, stream, hasAudio: hasAudioTrack(stream), audioDegraded: true }
    } catch (retryError) {
      // The camera itself is the problem — report the RETRY's classification, which is the
      // one that speaks only about the camera.
      return { ok: false, failure: captureFailure(classifyCaptureError(retryError), request.facility) }
    }
  }
}

export interface DeviceListResult {
  devices: CaptureDevice[]
  /** Non-null when the list could not be read. Surfaced rather than swallowed: a picker that
   *  is empty because enumeration FAILED looks identical to one that is empty because there
   *  are no devices, and only one of those is worth telling the visitor about. */
  failure: CaptureFailure | null
}

export async function listCaptureDevices(
  facility: CaptureFacility,
  deps: CaptureStreamDeps,
): Promise<DeviceListResult> {
  const { mediaDevices } = deps
  if (!mediaDevices || typeof mediaDevices.enumerateDevices !== 'function') {
    return { devices: [], failure: captureFailure('UNSUPPORTED', facility) }
  }
  try {
    return { devices: toCaptureDevices(await mediaDevices.enumerateDevices(), facility), failure: null }
  } catch (error) {
    return { devices: [], failure: captureFailure(classifyCaptureError(error), facility) }
  }
}

/** Release the hardware. The web analog of the phone's `isActive={isFocused}` — a stream left
 *  running keeps the camera light on after the visitor has navigated away. */
export function stopStream(stream: MediaStream | null): void {
  if (!stream || typeof stream.getTracks !== 'function') return
  for (const track of stream.getTracks()) track.stop()
}

// ---- Photo frame grab -----------------------------------------------------

export interface FrameGrabOptions {
  /** Canvas factory — the injection seam. Defaults to `document.createElement('canvas')`. */
  createCanvas?(): HTMLCanvasElement
  /** Encoded output type. */
  mimeType?: string
  /** JPEG quality, 0–1. */
  quality?: number
  /**
   * Normalized (0–1) sub-rectangle of the frame to keep. P4.7's OCR strip is the intended
   * consumer: the phone crops to the DVR timestamp band before recognition, and cropping at
   * grab time means the recognizer and the stored `OcrProof.imageDataUrl` see the same pixels.
   */
  crop?: { x: number; y: number; width: number; height: number }
  /** Also produce a data URL (P4.7 stores one on `OcrProof`). Off by default — a 1080p frame
   *  is a multi-megabyte base64 string, and the photo path only needs the blob. */
  includeDataUrl?: boolean
  /**
   * Downscale the encoded output to at most this many pixels wide (aspect preserved; never
   * upscales). P4.7's OCR strip uses it as the `OcrProof.imageDataUrl` size bound: the data
   * URL is persisted with the snapshot, so its ceiling is set here at construction rather
   * than policed at persist time — and the recogniser reads the same bounded pixels.
   */
  targetWidth?: number
}

export interface FrameGrabSuccess {
  ok: true
  blob: Blob
  mimeType: string
  width: number
  height: number
  dataUrl?: string
}

export type FrameGrabOutcome = FrameGrabSuccess | { ok: false; failure: CaptureFailure }

/** The frame source — everything this needs from an `HTMLVideoElement`. */
export type FrameSource = Pick<HTMLVideoElement, 'videoWidth' | 'videoHeight'>

/**
 * Grab the current video frame as an encoded image.
 *
 * Four separate ways this can honestly fail, each returning `FRAME_GRAB_FAILED` rather than
 * an image:
 * 1. the video has no dimensions yet (the camera has not delivered a frame) — encoding a
 *    zero-size canvas would hand back a blank picture presented as a capture;
 * 2. no 2d context (jsdom without the `canvas` package; a blocked canvas) — this is the
 *    DEFAULT path in the test suite;
 * 3. `toBlob` yields null;
 * 4. `toBlob` yields zero bytes.
 */
export async function grabVideoFrame(
  video: FrameSource,
  options: FrameGrabOptions = {},
): Promise<FrameGrabOutcome> {
  const facility: CaptureFacility = 'camera'
  const mimeType = options.mimeType ?? 'image/jpeg'
  const sourceWidth = video.videoWidth
  const sourceHeight = video.videoHeight
  if (!(sourceWidth > 0) || !(sourceHeight > 0)) {
    return { ok: false, failure: captureFailure('FRAME_GRAB_FAILED', facility) }
  }

  const crop = options.crop
  const sx = crop ? Math.round(crop.x * sourceWidth) : 0
  const sy = crop ? Math.round(crop.y * sourceHeight) : 0
  const sw = crop ? Math.max(1, Math.round(crop.width * sourceWidth)) : sourceWidth
  const sh = crop ? Math.max(1, Math.round(crop.height * sourceHeight)) : sourceHeight

  // Output size: the crop, downscaled to `targetWidth` when it is narrower than the crop.
  const scale =
    options.targetWidth !== undefined && options.targetWidth > 0 && options.targetWidth < sw
      ? options.targetWidth / sw
      : 1
  const dw = Math.max(1, Math.round(sw * scale))
  const dh = Math.max(1, Math.round(sh * scale))

  const canvas = (options.createCanvas ?? defaultCanvas)()
  canvas.width = dw
  canvas.height = dh
  const context = canvas.getContext('2d')
  if (!context) return { ok: false, failure: captureFailure('FRAME_GRAB_FAILED', facility) }

  // `video` is typed structurally (only the two dimensions are read here), but drawImage
  // needs the element itself — the cast is confined to this one call.
  context.drawImage(video as unknown as CanvasImageSource, sx, sy, sw, sh, 0, 0, dw, dh)

  const blob = await toBlobAsync(canvas, mimeType, options.quality)
  if (!blob || blob.size === 0) {
    return { ok: false, failure: captureFailure('FRAME_GRAB_FAILED', facility) }
  }

  return {
    ok: true,
    blob,
    mimeType: blob.type === '' ? mimeType : blob.type,
    width: dw,
    height: dh,
    ...(options.includeDataUrl === true ? { dataUrl: canvas.toDataURL(mimeType, options.quality) } : {}),
  }
}

function defaultCanvas(): HTMLCanvasElement {
  return document.createElement('canvas')
}

function toBlobAsync(canvas: HTMLCanvasElement, mimeType: string, quality?: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    if (typeof canvas.toBlob !== 'function') {
      resolve(null)
      return
    }
    canvas.toBlob((blob) => resolve(blob), mimeType, quality)
  })
}

// ---- Recording ------------------------------------------------------------

export type RecordingOutcome =
  | { ok: true; blob: Blob; mimeType: string }
  | { ok: false; failure: CaptureFailure }

export interface StreamRecorderHandle {
  pause(): void
  resume(): void
  /** Assembled bytes, a typed failure, or `null` when the take was abandoned (`abort`). */
  stop(): Promise<RecordingOutcome | null>
  /** Abandon the take: stop the recorder and discard the bytes. A pending `stop()` resolves
   *  `null`, and a later `stop()` resolves `null` immediately. */
  abort(): void
  /** What the recorder reports it is producing — read back rather than assumed, so the
   *  filename extension names the real container. */
  mimeType(): string
}

export type StartRecordingOutcome =
  | { ok: true; handle: StreamRecorderHandle }
  | { ok: false; failure: CaptureFailure }

export interface RecorderDeps {
  /** `null` means "no MediaRecorder on this page" → an `UNSUPPORTED` failure. */
  recorder: RecorderIo | null
  /**
   * The recorder stopped ON ITS OWN — nobody called `stop()` (R-13).
   *
   * A `MediaRecorder` ends when its tracks do: the camera is unplugged, the OS revokes the
   * permission mid-take, a screen share is stopped from the browser's own bar. Without this
   * signal the surface never learns, so its timer keeps counting a recorder that stopped
   * minutes ago and the duration it finally stamps on the file is wall-clock, not recorded
   * length — an unmeasured number rendered as fact in the review screen, the library row and
   * the info panel. Fires exactly once, and never for an aborted take (which has no outcome
   * by definition).
   */
  onEnded?(): void
}

/**
 * Start recording `stream`.
 *
 * The honesty pin lives at the end: a recorder that stopped having produced ZERO bytes
 * yields `RECORDING_FAILED`, never an empty blob dressed as a successful take. An empty
 * `.webm` in a case file is worse than a visible failure — it looks like evidence.
 */
export function startStreamRecording(
  stream: MediaStream,
  kind: 'video' | 'audio',
  deps: RecorderDeps,
): StartRecordingOutcome {
  const facility: CaptureFacility = kind === 'audio' ? 'microphone' : 'camera'
  const { recorder } = deps
  if (!recorder) return { ok: false, failure: captureFailure('UNSUPPORTED', facility) }

  const preferred = pickRecorderMimeType(recorderMimeCandidates(kind), recorder.isTypeSupported)

  // Every failure from here on is RECORDING_FAILED, not a `classifyCaptureError` code: the
  // device is already open, so the DOMException names that matter for `getUserMedia`
  // (NotAllowed/NotFound/NotReadable) do not apply, and reporting "the camera could not be
  // opened" for an unsupported container would point the visitor at the wrong thing.
  let instance: MediaRecorderLike
  try {
    instance = recorder.create(stream, preferred !== null ? { mimeType: preferred } : undefined)
  } catch {
    return { ok: false, failure: captureFailure('RECORDING_FAILED', facility) }
  }

  const chunks: Blob[] = []
  let aborted = false
  let errored = false
  let settled = false
  let pending: Promise<RecordingOutcome | null> | null = null
  let resolvePending: ((outcome: RecordingOutcome | null) => void) | null = null
  // Mirrors the engine's phase so an out-of-phase pause/resume is a no-op instead of the
  // `InvalidStateError` browsers throw — double taps are normal, not exceptional.
  let live = true
  let paused = false

  /** Best-effort hardware release. Returns whether `stop()` was accepted — a rejection means
   *  the recorder was already inactive, so no `onstop` is coming and the caller must settle
   *  the outcome itself. The error carries no information the caller doesn't already have. */
  const releaseRecorder = (): boolean => {
    try {
      instance.stop()
      return true
    } catch {
      return false
    }
  }

  const settle = (outcome: RecordingOutcome | null): void => {
    if (settled) return
    settled = true
    live = false
    resolvePending?.(outcome)
    resolvePending = null
  }

  const assemble = (): RecordingOutcome | null => {
    if (aborted) return null
    if (errored) return { ok: false, failure: captureFailure('RECORDING_FAILED', facility) }
    const type = instance.mimeType !== '' ? instance.mimeType : (preferred ?? '')
    const blob = new Blob(chunks, type !== '' ? { type } : undefined)
    if (blob.size === 0) return { ok: false, failure: captureFailure('RECORDING_FAILED', facility) }
    return { ok: true, blob, mimeType: blob.type !== '' ? blob.type : type }
  }

  instance.ondataavailable = (event) => {
    if (event.data && event.data.size > 0) chunks.push(event.data)
  }
  instance.onstop = () => {
    // Nobody was waiting on a `stop()` we issued, so the browser ended this take itself.
    // Read before `settle`, which flips the flag it depends on.
    const selfEnded = !settled && !aborted && resolvePending === null
    settle(assemble())
    if (selfEnded) deps.onEnded?.()
  }
  instance.onerror = () => {
    errored = true
    // Resolve a waiting `stop()` here too: a browser that fires `error` without a following
    // `stop` would otherwise leave the promise pending forever and the UI stuck on "saving".
    if (resolvePending) settle(aborted ? null : { ok: false, failure: captureFailure('RECORDING_FAILED', facility) })
  }

  try {
    instance.start()
  } catch {
    return { ok: false, failure: captureFailure('RECORDING_FAILED', facility) }
  }

  const handle: StreamRecorderHandle = {
    pause() {
      if (!live || paused) return
      paused = true
      instance.pause()
    },
    resume() {
      if (!live || !paused) return
      paused = false
      instance.resume()
    },
    stop() {
      if (pending) return pending
      if (aborted) return Promise.resolve(null)
      if (settled) return Promise.resolve(assemble())
      if (errored) {
        // The recorder already reported an error without a following `stop` event. Decide the
        // outcome here rather than calling `stop()` and classifying the InvalidStateError it
        // would throw — that path produces a message about opening a camera, which is not
        // what went wrong.
        settled = true
        live = false
        releaseRecorder()
        return Promise.resolve<RecordingOutcome>({
          ok: false,
          failure: captureFailure('RECORDING_FAILED', facility),
        })
      }
      pending = new Promise<RecordingOutcome | null>((resolve) => {
        resolvePending = resolve
        try {
          instance.stop()
        } catch {
          settle({ ok: false, failure: captureFailure('RECORDING_FAILED', facility) })
        }
      })
      return pending
    },
    abort() {
      if (settled) return
      aborted = true
      chunks.length = 0
      const stopped = releaseRecorder()
      // A recorder that was already down will never deliver `onstop`, so settle here rather
      // than leave a pending `stop()` hanging. Nothing is swallowed: an abandoned take has no
      // outcome to report by definition.
      if (!stopped) settle(null)
    },
    mimeType() {
      return instance.mimeType !== '' ? instance.mimeType : (preferred ?? '')
    },
  }

  return { ok: true, handle }
}
