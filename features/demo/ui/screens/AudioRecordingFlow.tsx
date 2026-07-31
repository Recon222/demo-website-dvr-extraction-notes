'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import {
  CAPTURE_PERMISSION_COPY,
  NO_RECORDER_NOTICE,
  SAMPLE_MEDIA,
  SAMPLE_MEDIA_NOTICE,
  channelLabel,
  codecLabel,
  formatSampleRate,
  mediaFilename,
  pickRecorderMimeType,
  recorderMimeCandidates,
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
import { readAudioTrackFormat, type AnalyserIo } from '@/features/demo/ui/inputs/audio-analyser'
import { useAudioAnalyser } from '@/features/demo/ui/inputs/useAudioAnalyser'
import { useMediaCapture } from '@/features/demo/ui/inputs/useMediaCapture'
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
   * Filename base (no extension) the INTERIM accept path stores under.
   * SEAM(P4.4): MetadataForm inserts between preview-accept and addMedia — once it lands, the
   * visitor's input replaces this and the prop goes away.
   */
  defaultFilenameBase: string
  /** Hand the finished capture to the bridge. Must be synchronous: `handOff()` runs straight
   *  after, and the store has to own the URL by then. */
  onSave(captured: CapturedMedia, meta: { filename: string; caption: string }): void
  /** Leave the launch surface (the bridge's `closeLaunch`). */
  onClose(): void
  deps?: AudioRecordingFlowDeps
}

/** Phone `RecorderScreen.tsx:186-190` — the info toast the 1-hour ceiling fires. Shown as an
 *  in-screen line here rather than a toast, because the auto-stop also MOVES the visitor to
 *  the review screen and an unexplained screen change is a silent event. */
const MAX_DURATION_NOTICE = 'Maximum Duration Reached — recording stopped at 1 hour maximum.'

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
  const meter = useAudioAnalyser({
    stream: capture.stream,
    deps: { analyser: deps?.analyser, reducedMotion: deps?.reducedMotion },
  })

  const { captured, permission, phase, stream } = capture
  const canRecord = capture.capability.record
  const canStream = capture.capability.stream

  // The container this browser will actually produce, probed once. Before a take exists there
  // is nothing else to read — `MediaRecorder.mimeType` only becomes meaningful once one is
  // constructed — so the negotiated preference is the honest answer for the format row.
  const preferredMime = useMemo(() => {
    const io = deps?.recorder !== undefined ? deps.recorder : readBrowserRecorder()
    return io === null ? null : pickRecorderMimeType(recorderMimeCandidates('audio'), io.isTypeSupported)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount-time capability probe
  }, [])

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
    if (openedRef.current || !canStream || !canRecord || permission !== 'prompt') return
    openedRef.current = true
    void openStream()
  }, [canStream, canRecord, permission, openStream])

  const mode: RecorderMode = !canStream || !canRecord
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
    const result = await capture.stopRecording()
    // Release the hardware only once a take exists. A failed stop leaves the visitor on the
    // recorder with the microphone still open, which is exactly what they need to try again.
    if (result !== null) capture.close()
  }, [capture])

  const handleRecordAgain = useCallback(() => {
    setNotice(null)
    capture.discard()
    void capture.open()
  }, [capture])

  /** ONE base name, used for both the line the visitor reads and the record that is written —
   *  a preview that promised `sample-note.m4a` and a library row that says `audio-note-3.m4a`
   *  would be two answers to the same question. */
  const filenameBase = captured === null ? defaultFilenameBase : sampleAwareBase(defaultFilenameBase, captured)

  const handleSave = useCallback(() => {
    if (captured === null) return
    // SEAM(P4.4): MetadataForm inserts between preview-accept and addMedia. Today the base name
    // is supplied by the bridge and the caption is empty; P4.4 replaces this object with the
    // form's value and gates the Save button on its validity. `buildMediaItem` (bridge side)
    // owns the extension via `mediaFilename`, so nothing here appends one (§58c).
    onSave(captured, { filename: filenameBase, caption: '' })
    // P4.1 rule 1: the store owns the object URL from this point, so the registry must forget
    // it. Skipping this revokes it on unmount and the saved note blanks.
    capture.handOff()
  }, [captured, capture, filenameBase, onSave])

  const handleCancel = useCallback(() => {
    capture.abortRecording()
    capture.close()
    onClose()
  }, [capture, onClose])

  if (captured !== null) {
    return (
      <AudioPreviewScreen
        captured={captured}
        filename={mediaFilename(filenameBase, captured)}
        notice={notice}
        onSave={handleSave}
        onRecordAgain={handleRecordAgain}
        onCancel={handleCancel}
      />
    )
  }

  const trackFormat = readAudioTrackFormat(stream)

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
      deniedTitle={CAPTURE_PERMISSION_COPY.microphone.title}
      deniedBody={CAPTURE_PERMISSION_COPY.microphone.deniedBody}
      sampleNotice={canStream ? NO_RECORDER_NOTICE.microphone : SAMPLE_MEDIA_NOTICE.microphone}
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

/** A sample take carries the bundled asset's own suggested name rather than the location's
 *  next `audio-note-N`: the file IS `sample-note.m4a`, and naming it like a recording the
 *  visitor made would hide what it is in the media library's filename column. */
function sampleAwareBase(base: string, captured: CapturedMedia): string {
  return captured.sample ? SAMPLE_MEDIA.audio.suggestedFilename : base
}
