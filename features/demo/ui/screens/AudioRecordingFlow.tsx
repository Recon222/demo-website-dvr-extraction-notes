'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  CAPTURE_PERMISSION_COPY,
  channelLabel,
  codecLabel,
  formatSampleRate,
  pickRecorderMimeType,
  recorderMimeCandidates,
  suggestedFilenameBase,
  timeOfDay,
  type CapturedMedia,
} from '@/features/demo/engine/logic/media'
import { getCurrentFormattedTime } from '@/features/demo/engine/logic/time'
import { clock } from '@/features/demo/ui/inputs/clock'
import {
  readBrowserRecorder,
  type MediaDevicesLike,
  type RecorderIo,
} from '@/features/demo/ui/inputs/capture-media'
import type { ObjectUrlIo } from '@/features/demo/ui/inputs/object-urls'
import { prefersReducedMotion, readAudioTrackFormat, type AnalyserIo } from '@/features/demo/ui/inputs/audio-analyser'
import { useAudioAnalyser } from '@/features/demo/ui/inputs/useAudioAnalyser'
import { useMediaCapture } from '@/features/demo/ui/inputs/useMediaCapture'
import type { MetadataFormValue } from '@/features/demo/ui/inputs/MetadataForm'
import { AudioPreviewScreen } from '@/features/demo/ui/screens/AudioPreviewScreen'
import { AudioRecorderScreen, type RecorderMode } from '@/features/demo/ui/screens/AudioRecorderScreen'

/**
 * The audio-recording launch flow (parity P4.6) — the phone's `AudioRecordingFlow`: recorder →
 * review, and nothing else. It holds the capture capability, the analyser and the wall clock so
 * the two screens below it stay pure.
 *
 * It touches the STORE not at all: `onSave` hands the finished capture up to `DemoExperience`,
 * which is the only component allowed to write (features/demo/CLAUDE.md). What it does own is
 * the hand-off — `handOff()` must run right after the store takes ownership of the object URL,
 * or the unmount sweep revokes a URL the store is still pointing at and the saved note blanks
 * (P4.1's rule 1).
 *
 * ── Microphone lifetime ─────────────────────────────────────────────────────────────────
 * The phone requests permission on mount (`RecorderScreen.tsx:112-116`) and the demo does the
 * same — the visitor pressed "Record Audio" to get here, so opening the microphone is what
 * they asked for, and it makes the idle waveform real rather than decorative. The mic is
 * released the moment a take is assembled: a browser shows a live recording indicator for as
 * long as a track is open, and leaving it lit over the review screen would say the microphone
 * is still listening when it is not. Record Again re-opens (no second prompt — the permission
 * is already granted for the page).
 */

export interface AudioRecordingFlowDeps {
  mediaDevices?: MediaDevicesLike | null
  recorder?: RecorderIo | null
  objectUrls?: ObjectUrlIo | null
  analyser?: AnalyserIo | null
  reducedMotion?: boolean
  now?(): number
  capturedAt?(): string
}

export interface AudioRecordingFlowProps {
  /**
   * Filename base (no extension) the metadata form opens pre-filled with for a LIVE take. The
   * bridge supplies it because it is scoped to the open location (`audio-note-N`), which is
   * knowledge this flow does not have; a SAMPLE take overrides it with the bundled asset's own
   * name through `suggestedFilenameBase`.
   */
  defaultFilenameBase: string
  /**
   * Hand the finished capture to the bridge. Must be synchronous — `handOff()` runs straight
   * after — and must report whether the store TOOK it (§60c, review R-1): a refused save leaves
   * the object URL owned by the capture hook so the unmount sweep can free it, instead of
   * pinning bytes nothing can reach.
   */
  onSave(captured: CapturedMedia, meta: MetadataFormValue): boolean
  /** Leave the launch surface (the bridge's `closeLaunch`). */
  onClose(): void
  deps?: AudioRecordingFlowDeps
}

/** Phone `RecorderScreen.tsx:186-190` — the info toast the 1-hour ceiling fires. Shown as an
 *  in-screen line here rather than a toast, because the auto-stop also MOVES the visitor to
 *  the review screen and an unexplained screen change is a silent event. */
const MAX_DURATION_NOTICE = 'Maximum Duration Reached. Recording stopped at 1 hour maximum.'

export function AudioRecordingFlow({ defaultFilenameBase, onSave, onClose, deps }: AudioRecordingFlowProps) {
  const [notice, setNotice] = useState<string | null>(null)
  const [wallClock, setWallClock] = useState('')

  const capture = useMediaCapture({
    facility: 'microphone',
    onMaxDuration: () => setNotice(MAX_DURATION_NOTICE),
    deps: {
      mediaDevices: deps?.mediaDevices,
      recorder: deps?.recorder,
      objectUrls: deps?.objectUrls,
      now: deps?.now,
      capturedAt: deps?.capturedAt,
    },
  })
  // ONE reading of the preference, shared by the meter's tick rate and the screen's animations
  // (review R-17). Two readers of the same media query must not be able to disagree.
  const reduceMotion = deps?.reducedMotion ?? prefersReducedMotion()
  const meter = useAudioAnalyser({
    stream: capture.stream,
    deps: { analyser: deps?.analyser, reducedMotion: reduceMotion },
  })

  const { captured, permission, phase, stream } = capture
  /**
   * Whether an audio note can be made for real HERE — asked of the engine, never re-derived
   * (review R-3, then FD-2 for this surface).
   *
   * The flow used to spell the rule itself as `!capability.stream || !capability.record`, which
   * silently dropped the third fact: on a browser with `getUserMedia` and `MediaRecorder` but no
   * `URL.createObjectURL`, that read `live`, so the visitor got the full recorder — open mic,
   * moving meter — and then a completed take answered "This browser doesn't expose a microphone
   * to this page". `modeFor('audio')` is the single site for the rule, closed with `assertNever`
   * over `MediaKind` so a fourth kind cannot inherit the wrong one.
   */
  const canCaptureLive = capture.capability.modeFor('audio') === 'live'

  // The container this browser will actually produce, probed once. Before a take exists there
  // is nothing else to read — `MediaRecorder.mimeType` only becomes meaningful once one is
  // constructed — so the negotiated preference is the honest answer for the format row.
  const preferredMime = useMemo(() => {
    const io = deps?.recorder !== undefined ? deps.recorder : readBrowserRecorder()
    return io === null ? null : pickRecorderMimeType(recorderMimeCandidates('audio'), io.isTypeSupported)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time capability probe
  }, [])

  // Memoised on the stream (review R-20): the read walks the track list and calls
  // `getSettings()`, and it ran on every render — including all ~16 the meter's tick causes
  // each second for the whole take.
  const trackFormat = useMemo(() => readAudioTrackFormat(stream), [stream])

  const readClock = useCallback(
    (): string => timeOfDay(deps?.capturedAt?.() ?? getCurrentFormattedTime(clock.now().getTime())),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- the seam is read, never captured
    [],
  )

  // Phone `TimerCard.tsx:77-89`: refresh on every phase change, then tick once a second only
  // while a take is live. An idle recorder wakes nothing.
  useEffect(() => {
    setWallClock(readClock())
    if (phase === 'idle' || phase === 'stopped') return
    const id = window.setInterval(() => setWallClock(readClock()), 1000)
    return () => {
      window.clearInterval(id)
    }
  }, [phase, readClock])

  // Open the microphone on arrival (phone parity), once, and only where there is one to open.
  // A ref rather than a mount-only effect: `open` is called again by Record Again and by the
  // retry affordances, and this must not fire a second time behind them.
  const openedRef = useRef(false)
  const openStream = capture.open
  useEffect(() => {
    if (openedRef.current || !canCaptureLive || permission !== 'prompt') return
    openedRef.current = true
    void openStream()
  }, [canCaptureLive, permission, openStream])

  /**
   * The ONE microphone-release path (review R-21).
   *
   * The rule is "a take exists ⇒ the microphone is no longer needed", and it is true however
   * the recorder got there. Expressing it as a REACTION to the take rather than as an action on
   * the Stop button is what makes the phone's 1-hour ceiling correct by construction: that
   * auto-stop fires inside `useMediaCapture`'s own tick and calls `stopRecording()` directly,
   * so it never passes through `handleStop` — and the release used to live there, leaving the
   * browser's recording indicator asserting a live microphone over a finished take. That is
   * precisely the false statement §61g exists to prevent, on the one path that skipped it.
   *
   * A FAILED stop produces no take, so this deliberately does not fire: the visitor is still on
   * the recorder with the microphone open, which is exactly what they need to retry (§61g,
   * pinned by the zero-byte arm).
   */
  const closeStream = capture.close
  useEffect(() => {
    if (captured === null || stream === null) return
    closeStream()
  }, [captured, stream, closeStream])

  const mode: RecorderMode = !canCaptureLive
    ? 'sample'
    : permission === 'denied'
      ? 'denied'
      : stream !== null
        ? 'live'
        : capture.isOpening
          ? 'connecting'
          : 'offer'

  const handleStart = useCallback(() => {
    setNotice(null)
    capture.startRecording()
  }, [capture])

  const handleStop = useCallback(async () => {
    // Releasing the hardware is NOT this handler's job — the effect above owns it, so the
    // capability layer's auto-stop gets the same treatment as this press (R-21).
    await capture.stopRecording()
  }, [capture])

  const handleRecordAgain = useCallback(() => {
    setNotice(null)
    capture.discard()
    void capture.open()
  }, [capture])

  const handleSave = useCallback(
    (meta: MetadataFormValue) => {
      if (captured === null) return
      // The form supplies a BASE; `buildMediaItem` (bridge side) owns the extension via
      // `mediaFilename`, so nothing here appends one (§58c).
      const accepted = onSave(captured, meta)
      // P4.1 rule 1: ownership passes to the store ONLY on a real save, so the registry must
      // forget the URL only then. Skipping it on a taken save revokes the note on unmount and
      // it blanks; running it on a REFUSED save pins the bytes with nothing left to free them.
      if (accepted) capture.handOff()
    },
    [captured, capture, onSave],
  )

  const handleCancel = useCallback(() => {
    capture.abortRecording()
    capture.close()
    onClose()
  }, [capture, onClose])

  if (captured !== null) {
    return (
      <AudioPreviewScreen
        captured={captured}
        defaultFilenameBase={suggestedFilenameBase(captured, defaultFilenameBase)}
        notice={notice}
        onSave={handleSave}
        onRecordAgain={handleRecordAgain}
        onCancel={handleCancel}
      />
    )
  }

  return (
    <AudioRecorderScreen
      mode={mode}
      phase={phase}
      elapsedMs={capture.elapsedMs}
      canStop={capture.canStop}
      meter={meter}
      format={{
        sampleRate: formatSampleRate(trackFormat.sampleRate),
        channels: channelLabel(trackFormat.channels),
        codec: codecLabel(preferredMime ?? ''),
      }}
      timeOfDay={wallClock}
      reduceMotion={reduceMotion}
      deniedTitle={CAPTURE_PERMISSION_COPY.microphone.title}
      deniedBody={CAPTURE_PERMISSION_COPY.microphone.deniedBody}
      // The sentence is chosen by the BINDING reason, in priority order (no device > no storage
      // > no recorder). The ternary this replaces could not produce NO_CAPTURE_STORAGE_NOTICE at
      // all — §65b added that sentence for a state this surface had no way to name.
      sampleNotice={capture.capability.sampleNotice}
      notice={notice}
      failure={capture.failure?.message ?? null}
      onDismissFailure={capture.clearFailure}
      onStart={handleStart}
      onPause={capture.pauseRecording}
      onResume={capture.resumeRecording}
      onStop={handleStop}
      onEnableMicrophone={() => void capture.open()}
      onUseSample={() => capture.captureSample('audio')}
      onCancel={handleCancel}
    />
  )
}

