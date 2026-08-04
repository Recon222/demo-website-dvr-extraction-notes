'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import type { MediaKind } from '@/features/demo/engine/types'
import { getCurrentFormattedTime } from '@/features/demo/engine/logic/time'
import {
  IDLE_RECORDING,
  beginRecording,
  canStopAtElapsed,
  captureAvailability,
  captureFailure,
  hasReachedMaxDuration,
  pauseRecording as pauseRecordingState,
  recordedMs,
  resumeRecording as resumeRecordingState,
  sampleFallbackNotice,
  stopRecording as stopRecordingState,
  toSampleCapture,
  type CaptureAvailability,
  type CaptureFacility,
  type CaptureFailure,
  type CaptureSupport,
  type CapturedMedia,
  type RecordingPhase,
  type RecordingState,
} from '@/features/demo/engine/logic/media'
import {
  grabVideoFrame,
  readBrowserRecorder,
  startStreamRecording,
  type FrameGrabOptions,
  type FrameSource,
  type MediaDevicesLike,
  type RecorderIo,
  type StreamRecorderHandle,
} from '@/features/demo/ui/inputs/capture-media'
import {
  createObjectUrlRegistry,
  readBrowserObjectUrls,
  type ObjectUrlIo,
  type ObjectUrlRegistry,
} from '@/features/demo/ui/inputs/object-urls'
import { clock } from '@/features/demo/ui/inputs/clock'
import { useCaptureStream, type UseCaptureStreamReturn } from '@/features/demo/ui/inputs/useCaptureStream'

/**
 * The one hook the P4 capture screens mount (parity P4.1).
 *
 * Composes `useCaptureStream` (permission / live stream / devices) with the three things a
 * capture surface additionally needs: a photo frame grab, a recording lifecycle, and the
 * SAMPLE fallback — all sharing one object-URL registry so nothing leaks and nothing is
 * revoked twice.
 *
 * ── What it will not do ─────────────────────────────────────────────────────────────────
 * It never substitutes a sample for a capture that was refused or that failed. `captureSample`
 * is a call the surface makes deliberately, and `capability.modeFor(kind)` tells it when that
 * is the only path available. A denied camera produces a denied state and nothing else.
 *
 * ── Object-URL ownership ────────────────────────────────────────────────────────────────
 * Every URL this hook mints is owned by its registry and swept on unmount. When a capture is
 * SAVED into the store the store owns it, so the surface must call `handOff()` — after which
 * the sweep leaves it alive. Forgetting is a visible bug (the saved photo blanks), never a
 * silent leak.
 */

/** How often the elapsed-time readout refreshes while recording. Fine enough for the phone's
 *  `MM:SS` badge without waking the tab more than necessary. */
export const RECORDING_TICK_MS = 200

/**
 * The three browser facts, plus the two answers derived from them.
 *
 * R-3: there is deliberately no stored `sampleOnly` boolean any more. "Can I go live?" is a
 * question about an OPERATION, and one boolean answered it for photos while both capture
 * screens consumed it for everything — which is how a browser with a camera but no
 * `MediaRecorder` printed "This browser doesn't expose a camera to this page" over a live
 * viewfinder. Ask `modeFor(kind)`; the rule itself lives in `engine/logic/media/capability.ts`
 * so no surface re-derives it.
 */
export interface CaptureCapability extends CaptureSupport {
  /** Can this kind be captured for real here, or only attached as a bundled sample? */
  modeFor(kind: MediaKind): CaptureAvailability
  /** The honest sentence for why THIS surface fell back, chosen by the binding reason. */
  sampleNotice: string
}

export interface UseMediaCaptureOptions {
  facility: CaptureFacility
  /** Camera only: open an audio track so a video take carries sound. */
  withAudio?: boolean
  /** Fired when a recording hits the phone's 1-hour ceiling and is auto-stopped. */
  onMaxDuration?(): void
  /** Test seams. An explicit `null` forces the corresponding unavailable path. */
  deps?: {
    mediaDevices?: MediaDevicesLike | null
    recorder?: RecorderIo | null
    objectUrls?: ObjectUrlIo | null
    /** Wall clock in ms. Defaults to the demo's clock seam. */
    now?(): number
    /** Capture timestamp in the demo's stored format. Defaults to the clock seam. */
    capturedAt?(): string
  }
}

export interface UseMediaCaptureReturn
  extends Pick<
    UseCaptureStreamReturn,
    | 'permission'
    | 'stream'
    | 'hasAudio'
    | 'audioDegraded'
    | 'devices'
    | 'deviceFailure'
    | 'selectedDeviceId'
    | 'isOpening'
    | 'open'
    | 'selectDevice'
    | 'close'
  > {
  /** The most recent failure from any path — acquisition, frame grab or recording. */
  failure: CaptureFailure | null
  capability: CaptureCapability

  /** Grab the current frame of `video` as a photo. `null` on failure (see `failure`). */
  capturePhoto(video: FrameSource, options?: FrameGrabOptions): Promise<CapturedMedia | null>

  phase: RecordingPhase
  /** Recorded milliseconds — paused time excluded. */
  elapsedMs: number
  /** The phone's Stop gate: active and past 500ms. */
  canStop: boolean
  startRecording(): boolean
  pauseRecording(): void
  resumeRecording(): void
  /** Assemble the take. `null` when it failed or was abandoned. */
  stopRecording(): Promise<CapturedMedia | null>
  /** Abandon the take and discard its bytes. */
  abortRecording(): void

  /** The bundled sample, labelled. A deliberate call — never automatic. */
  captureSample(kind: MediaKind): CapturedMedia

  /** The capture awaiting review. */
  captured: CapturedMedia | null
  /** Throw the pending capture away, revoking its object URLs (retake). */
  discard(): void
  /** Ownership passes to the store: forget the URLs without revoking, and clear. */
  handOff(): void
  /** Clear the current failure (the surface dismissing a notice). */
  clearFailure(): void
}

export function useMediaCapture(options: UseMediaCaptureOptions): UseMediaCaptureReturn {
  const optionsRef = useRef(options)
  useEffect(() => {
    optionsRef.current = options
  })

  const streamState = useCaptureStream({
    facility: options.facility,
    withAudio: options.withAudio,
    deps: options.deps?.mediaDevices !== undefined ? { mediaDevices: options.deps.mediaDevices } : undefined,
  })

  // Resolved once per mount: swapping the browser's capabilities mid-session is not a thing.
  const recorderIo = useMemo<RecorderIo | null>(
    () => (options.deps?.recorder !== undefined ? options.deps.recorder : readBrowserRecorder()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time capability probe
    [],
  )
  const objectUrlIo = useMemo<ObjectUrlIo | null>(
    () => (options.deps?.objectUrls !== undefined ? options.deps.objectUrls : readBrowserObjectUrls()),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time capability probe
    [],
  )

  const registryRef = useRef<ObjectUrlRegistry | null>(null)
  if (registryRef.current === null && objectUrlIo !== null) {
    registryRef.current = createObjectUrlRegistry(objectUrlIo)
  }

  const [ownFailure, setOwnFailure] = useState<CaptureFailure | null>(null)
  const [captured, setCaptured] = useState<CapturedMedia | null>(null)
  const [recording, setRecording] = useState<RecordingState>(IDLE_RECORDING)
  const [elapsedMs, setElapsedMs] = useState(0)

  const abortedRef = useRef(false)
  const recordingRef = useRef<RecordingState>(IDLE_RECORDING)
  const handleRef = useRef<StreamRecorderHandle | null>(null)
  // Mirror of `captured` so URL revocation happens in an effectful helper rather than inside
  // a `setState` updater, which React may run twice.
  const capturedRef = useRef<CapturedMedia | null>(null)
  // Declared before the tick effect that calls it (hook order is what matters, but reading
  // top-down should not require knowing that); assigned from `stopRecording` below.
  const stopRecordingRef = useRef<() => Promise<CapturedMedia | null>>(() => Promise.resolve(null))
  // Same shape for the self-end signal: `startStreamRecording` captures the callback once, so
  // it must not close over a stale `onRecorderEnded`.
  const onRecorderEndedRef = useRef<() => void>(() => {})

  const now = useCallback((): number => optionsRef.current.deps?.now?.() ?? clock.now().getTime(), [])
  const capturedAt = useCallback(
    (): string => optionsRef.current.deps?.capturedAt?.() ?? getCurrentFormattedTime(clock.now().getTime()),
    [],
  )

  const applyRecording = useCallback(
    (next: RecordingState, atMs: number) => {
      recordingRef.current = next
      if (abortedRef.current) return
      setRecording(next)
      setElapsedMs(recordedMs(next, atMs))
    },
    [],
  )

  useEffect(() => {
    abortedRef.current = false
    return () => {
      abortedRef.current = true
      // Abandon any take in flight, then release every URL still owned. Ordering matters:
      // aborting first guarantees no `stop()` resolution can mint a URL after the sweep.
      handleRef.current?.abort()
      handleRef.current = null
      registryRef.current?.revokeAll()
    }
  }, [])

  // Live elapsed readout + the phone's 1-hour auto-stop. Only mounted while actually rolling,
  // so a paused or finished recorder wakes nothing.
  useEffect(() => {
    if (recording.phase !== 'recording') return
    const id = window.setInterval(() => {
      const atMs = now()
      if (hasReachedMaxDuration(recordingRef.current, atMs)) {
        optionsRef.current.onMaxDuration?.()
        void stopRecordingRef.current()
        return
      }
      if (!abortedRef.current) setElapsedMs(recordedMs(recordingRef.current, atMs))
    }, RECORDING_TICK_MS)
    return () => {
      window.clearInterval(id)
    }
  }, [recording.phase, now])

  const capability = useMemo<CaptureCapability>(() => {
    const support: CaptureSupport = {
      stream: streamState.permission !== 'unavailable',
      record: streamState.permission !== 'unavailable' && recorderIo !== null,
      objectUrls: objectUrlIo !== null,
    }
    return {
      ...support,
      modeFor: (kind) => captureAvailability(support, kind),
      sampleNotice: sampleFallbackNotice(support, options.facility),
    }
  }, [streamState.permission, recorderIo, objectUrlIo, options.facility])

  /** Replace the pending capture, revoking the URLs of the one it displaces — a retake must
   *  not leak the frame it replaces. Sample paths are not registry-owned, so `revoke` no-ops
   *  on them by construction. */
  const replaceCaptured = useCallback((next: CapturedMedia | null) => {
    const previous = capturedRef.current
    if (previous) {
      registryRef.current?.revoke(previous.url)
      if (previous.poster !== undefined) registryRef.current?.revoke(previous.poster)
    }
    capturedRef.current = next
    if (!abortedRef.current) setCaptured(next)
  }, [])

  const capturePhoto = useCallback(
    async (video: FrameSource, frameOptions: FrameGrabOptions = {}): Promise<CapturedMedia | null> => {
      const registry = registryRef.current
      if (!registry) {
        const failure = captureFailure('UNSUPPORTED', 'camera')
        if (!abortedRef.current) setOwnFailure(failure)
        return null
      }

      const outcome = await grabVideoFrame(video, frameOptions)
      if (abortedRef.current) return null
      if (!outcome.ok) {
        setOwnFailure(outcome.failure)
        return null
      }

      const media: CapturedMedia = {
        kind: 'photo',
        url: registry.create(outcome.blob),
        mimeType: outcome.mimeType,
        sizeBytes: outcome.blob.size,
        capturedAt: capturedAt(),
        sample: false,
      }
      setOwnFailure(null)
      replaceCaptured(media)
      return media
    },
    [capturedAt, replaceCaptured],
  )

  const startRecording = useCallback((): boolean => {
    if (recordingRef.current.phase === 'recording' || recordingRef.current.phase === 'paused') return false
    const { facility } = optionsRef.current
    const kind = facility === 'microphone' ? 'audio' : 'video'
    const stream = streamState.stream
    if (!stream) {
      setOwnFailure(captureFailure('UNSUPPORTED', facility))
      return false
    }

    const started = startStreamRecording(stream, kind, {
      recorder: recorderIo,
      onEnded: () => onRecorderEndedRef.current(),
    })
    if (!started.ok) {
      setOwnFailure(started.failure)
      return false
    }
    handleRef.current = started.handle
    setOwnFailure(null)
    const atMs = now()
    applyRecording(beginRecording(atMs), atMs)
    return true
  }, [applyRecording, now, recorderIo, streamState.stream])

  const pauseRecording = useCallback(() => {
    const atMs = now()
    const next = pauseRecordingState(recordingRef.current, atMs)
    if (next === recordingRef.current) return
    handleRef.current?.pause()
    applyRecording(next, atMs)
  }, [applyRecording, now])

  const resumeRecording = useCallback(() => {
    const atMs = now()
    const next = resumeRecordingState(recordingRef.current, atMs)
    if (next === recordingRef.current) return
    handleRef.current?.resume()
    applyRecording(next, atMs)
  }, [applyRecording, now])

  /**
   * Assemble a finished take into a capture. Shared by the visitor pressing Stop and by the
   * recorder ending on its own (R-13), so a self-ended take is not silently dropped — and,
   * more importantly, so BOTH stamp `durationSec` from the state banked at the moment the
   * recording actually ended rather than from whenever anyone got round to asking.
   */
  const finishTake = useCallback(
    async (stopped: RecordingState, atMs: number): Promise<CapturedMedia | null> => {
      const handle = handleRef.current
      if (!handle) return null

      // FD-1: the handle stays in the ref ACROSS the await. Clearing it first (R-13's split)
      // put `abortRecording` out of reach for the whole window it exists for — its only route
      // to the recorder is `handleRef.current?.abort()`, and the post-await guard is
      // `abortedRef`, the UNMOUNT flag. A Cancel between Stop and the recorder's `stop` event
      // hit nothing, and the cancelled take went on to mint a URL and publish itself to review.
      const outcome = await handle.stop()
      // Whoever cleared or replaced the ref while we were waiting owns this take now: an
      // `abortRecording` (which nulls it) or a fresh `startRecording` (which reassigns it).
      // Either way this result must not be published — and the handle must not be un-set from
      // under its new owner.
      const superseded = handleRef.current !== handle
      if (!superseded) handleRef.current = null
      if (superseded || abortedRef.current) return null

      // `null` is an abandoned take: neither a result nor a failure the operator should see.
      if (outcome === null) return null
      if (!outcome.ok) {
        setOwnFailure(outcome.failure)
        return null
      }

      const registry = registryRef.current
      if (!registry) {
        setOwnFailure(captureFailure('UNSUPPORTED', optionsRef.current.facility))
        return null
      }

      const media: CapturedMedia = {
        kind: optionsRef.current.facility === 'microphone' ? 'audio' : 'video',
        url: registry.create(outcome.blob),
        mimeType: outcome.mimeType,
        sizeBytes: outcome.blob.size,
        durationSec: Math.round(recordedMs(stopped, atMs) / 1000),
        capturedAt: capturedAt(),
        sample: false,
      }
      setOwnFailure(null)
      replaceCaptured(media)
      return media
    },
    [capturedAt, replaceCaptured],
  )

  const stopRecording = useCallback(async (): Promise<CapturedMedia | null> => {
    const atMs = now()
    const next = stopRecordingState(recordingRef.current, atMs)
    // Already stopped — by the visitor a moment ago, or by the browser ending the take itself
    // (in which case `onRecorderEnded` has assembled it and `captured` is already set).
    if (next === recordingRef.current) return null
    applyRecording(next, atMs)
    return finishTake(next, atMs)
  }, [applyRecording, finishTake, now])

  /**
   * The browser ended the take without being asked — the camera was unplugged, the permission
   * was revoked, a screen share was stopped from the browser's own bar.
   *
   * Banking the state HERE is the whole point: the elapsed readout freezes at the real end
   * instead of counting a recorder that stopped minutes ago, the tick effect unmounts with the
   * phase, and `durationSec` describes the file rather than the visitor's reaction time.
   */
  const onRecorderEnded = useCallback(() => {
    const atMs = now()
    const next = stopRecordingState(recordingRef.current, atMs)
    if (next === recordingRef.current) return
    applyRecording(next, atMs)
    void finishTake(next, atMs)
  }, [applyRecording, finishTake, now])

  // The tick effect closes over `stopRecording`; the ref keeps that closure current without
  // re-creating the interval on every identity change.
  useEffect(() => {
    stopRecordingRef.current = stopRecording
  }, [stopRecording])
  useEffect(() => {
    onRecorderEndedRef.current = onRecorderEnded
  }, [onRecorderEnded])

  const abortRecording = useCallback(() => {
    handleRef.current?.abort()
    handleRef.current = null
    applyRecording(IDLE_RECORDING, now())
  }, [applyRecording, now])

  const captureSample = useCallback(
    (kind: MediaKind): CapturedMedia => {
      const media = toSampleCapture(kind, capturedAt())
      setOwnFailure(null)
      replaceCaptured(media)
      return media
    },
    [capturedAt, replaceCaptured],
  )

  const discard = useCallback(() => {
    replaceCaptured(null)
  }, [replaceCaptured])

  const handOff = useCallback(() => {
    const previous = capturedRef.current
    if (previous) {
      registryRef.current?.release(previous.url)
      if (previous.poster !== undefined) registryRef.current?.release(previous.poster)
    }
    capturedRef.current = null
    if (!abortedRef.current) setCaptured(null)
  }, [])

  const clearFailure = useCallback(() => {
    setOwnFailure(null)
  }, [])

  /**
   * Acquisition, with this hook's own failure cleared first (R-14).
   *
   * `failure` reports `ownFailure ?? streamState.failure`, and `useCaptureStream.open` clears
   * only its own half. So after a frame-grab failure, a failed device switch showed the OLD
   * sentence ("could not turn the camera frame into an image") over the NEW state — the
   * visitor reading an explanation for something that is no longer what went wrong. Every
   * entry point that starts a fresh acquisition clears both.
   */
  const open = useCallback(
    (deviceId?: string) => {
      setOwnFailure(null)
      return streamState.open(deviceId)
    },
    [streamState.open],
  )

  const selectDevice = useCallback(
    (deviceId: string) => {
      setOwnFailure(null)
      return streamState.selectDevice(deviceId)
    },
    [streamState.selectDevice],
  )

  return {
    permission: streamState.permission,
    stream: streamState.stream,
    hasAudio: streamState.hasAudio,
    audioDegraded: streamState.audioDegraded,
    devices: streamState.devices,
    deviceFailure: streamState.deviceFailure,
    selectedDeviceId: streamState.selectedDeviceId,
    isOpening: streamState.isOpening,
    open,
    selectDevice,
    close: streamState.close,

    // A failure raised HERE (frame grab, recorder) is the more recent event whenever both
    // exist, so it wins; the acquisition failure remains visible until then.
    failure: ownFailure ?? streamState.failure,
    capability,

    capturePhoto,

    phase: recording.phase,
    elapsedMs,
    canStop: canStopAtElapsed(recording, elapsedMs),
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    abortRecording,

    captureSample,

    captured,
    discard,
    handOff,
    clearFailure,
  }
}
