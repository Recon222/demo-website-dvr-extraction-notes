/**
 * Recording lifecycle — a pure state machine over injected wall-clock readings (parity P4.1).
 *
 * Consumed by the audio recorder (P4.6) and by video mode on the capture screen (P4.3). The
 * `MediaRecorder` itself lives in `ui/inputs/capture-media.ts`; this file owns everything the
 * two surfaces must AGREE about — what phase they are in, how long has actually been
 * recorded, and whether Stop is allowed yet — so they cannot drift into two different answers
 * for the same recording.
 *
 * The phone reads `durationMs` straight off `@siteed/expo-audio-studio`. A browser's
 * `MediaRecorder` exposes no such counter, so the demo derives it from the clock seam. That
 * makes ONE behaviour explicit that the phone's library merely happens to implement: **paused
 * time does not count**. `MediaRecorder.pause()` stops emitting data, so a wall-clock timer
 * that kept running would display a duration the recording does not contain.
 */

import type { MediaKind } from '@/features/demo/engine/types'

// ---- Tuning (lifted from the phone) ---------------------------------------

/** `AUDIO_UI_CONFIG.MIN_RECORDING_DURATION_MS` — the phone's Stop gate
 *  (`src/features/media/audio-recording/constants/index.ts:41`; ui-mapping 10 records it as
 *  `canStop = isActiveRecording && durationMs >= 500`). */
export const MIN_RECORDING_DURATION_MS = 500

/** `AUDIO_UI_CONFIG.MAX_RECORDING_DURATION_MS` — one hour, after which the phone auto-stops
 *  and toasts "Maximum Duration Reached". */
export const MAX_RECORDING_DURATION_MS = 60 * 60 * 1000

// ---- Phases ---------------------------------------------------------------

/**
 * `idle` → `recording` ⇄ `paused` → `stopped`. `stopped` is terminal for one recording: a
 * surface that wants another starts a fresh state rather than reviving this one, which is
 * what forces the review screen to be reached before the next take (phone: `RecorderScreen`
 * hands off to `AudioPreview`, and Record Again remounts a fresh recorder).
 */
export const RECORDING_PHASES = ['idle', 'recording', 'paused', 'stopped'] as const
export type RecordingPhase = (typeof RECORDING_PHASES)[number]

export interface RecordingState {
  phase: RecordingPhase
  /** Milliseconds banked from segments that have already ended (each pause/stop banks one). */
  accumulatedMs: number
  /** Wall clock at which the CURRENT running segment began; `null` unless `phase` is
   *  `'recording'`. Storing the start rather than a tick count keeps the elapsed figure
   *  correct across a re-render, a backgrounded tab, or a coarse timer. */
  segmentStartMs: number | null
}

export const IDLE_RECORDING: RecordingState = Object.freeze({
  phase: 'idle',
  accumulatedMs: 0,
  segmentStartMs: null,
})

// ---- Transitions ----------------------------------------------------------
//
// Every transition is total: an out-of-phase call returns the state UNCHANGED (by identity,
// so a React setState is a no-op) rather than throwing or half-applying. Double-tapped
// buttons and a `MediaRecorder` event arriving a frame late are both normal, not exceptional.

export function beginRecording(nowMs: number): RecordingState {
  return { phase: 'recording', accumulatedMs: 0, segmentStartMs: nowMs }
}

export function pauseRecording(state: RecordingState, nowMs: number): RecordingState {
  if (state.phase !== 'recording') return state
  return {
    phase: 'paused',
    accumulatedMs: bankSegment(state, nowMs),
    segmentStartMs: null,
  }
}

export function resumeRecording(state: RecordingState, nowMs: number): RecordingState {
  if (state.phase !== 'paused') return state
  return { phase: 'recording', accumulatedMs: state.accumulatedMs, segmentStartMs: nowMs }
}

export function stopRecording(state: RecordingState, nowMs: number): RecordingState {
  if (state.phase !== 'recording' && state.phase !== 'paused') return state
  return { phase: 'stopped', accumulatedMs: bankSegment(state, nowMs), segmentStartMs: null }
}

/**
 * Close the running segment. A clock that reads BACKWARDS (a system time change mid-take, a
 * hand-stubbed seam) must never subtract from the banked total — the recording that already
 * happened cannot un-happen — so a negative segment contributes zero.
 */
function bankSegment(state: RecordingState, nowMs: number): number {
  if (state.segmentStartMs === null) return state.accumulatedMs
  return state.accumulatedMs + Math.max(0, nowMs - state.segmentStartMs)
}

// ---- Derived --------------------------------------------------------------

/** How much has actually been recorded as of `nowMs` — banked segments plus the live one.
 *  Paused and stopped states ignore `nowMs` entirely, which is the whole point. */
export function recordedMs(state: RecordingState, nowMs: number): number {
  return bankSegment(state, nowMs)
}

/** Recording or paused — the phone's `isActiveRecording`, which gates the secondary controls
 *  and the level meter. */
export function isActiveRecording(state: RecordingState): boolean {
  return state.phase === 'recording' || state.phase === 'paused'
}

/**
 * The phone's Stop gate (ui-mapping 10): active AND at least `MIN_RECORDING_DURATION_MS`.
 * Below it the recorder has nothing worth handing to a review screen.
 *
 * Split from `canStopRecording` so a consumer that already HAS the elapsed figure can apply
 * the rule without re-reading a clock. `useMediaCapture` keeps `elapsedMs` in state (the demo
 * forbids clock reads at render scope), and duplicating the `>= 500` comparison there would
 * be a second copy of the phone's gate free to drift.
 */
export function canStopAtElapsed(state: RecordingState, elapsedMs: number): boolean {
  return isActiveRecording(state) && elapsedMs >= MIN_RECORDING_DURATION_MS
}

export function canStopRecording(state: RecordingState, nowMs: number): boolean {
  return canStopAtElapsed(state, recordedMs(state, nowMs))
}

/** The phone's 1-hour auto-stop trigger. Only ever true while a recording is live. */
export function hasReachedMaxDuration(state: RecordingState, nowMs: number): boolean {
  return isActiveRecording(state) && recordedMs(state, nowMs) >= MAX_RECORDING_DURATION_MS
}

// ---- Formatting (verbatim ports) ------------------------------------------

/**
 * `MM:SS`, or `HH:MM:SS` once past an hour — a verbatim port of the phone's
 * `formatDuration` (`src/lib/utils/format.ts:17-29`), including its negative clamp. The
 * recorder timer, the recording indicator badge and the media-library duration column all
 * read the same function so they cannot disagree by a rounding rule.
 */
export function formatDuration(ms: number): string {
  const clampedMs = Math.max(0, ms)
  const totalSeconds = Math.floor(clampedMs / 1000)
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds
      .toString()
      .padStart(2, '0')}`
  }
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
}

/** Verbatim port of the phone's `formatFileSize` (`src/lib/utils/format.ts:40-45`) — binary
 *  units, negatives clamped to 0. Feeds the media-item info row (P4.5). */
export function formatFileSize(bytes: number): string {
  const clampedBytes = Math.max(0, bytes)
  if (clampedBytes < 1024) return `${clampedBytes} B`
  if (clampedBytes < 1024 * 1024) return `${(clampedBytes / 1024).toFixed(1)} KB`
  return `${(clampedBytes / (1024 * 1024)).toFixed(1)} MB`
}

// ---- Container negotiation ------------------------------------------------

/**
 * Recorder MIME preferences, most-wanted first.
 *
 * MP4/M4A leads so that where the browser can produce it (Safari, and Chrome for video) the
 * demo's files carry the phone's own `.mp4` / `.m4a` extensions. Everywhere else the honest
 * answer is WebM — and `extensionForMimeType` names the container that was ACTUALLY produced
 * rather than stamping the phone's extension onto a different format.
 */
export const VIDEO_MIME_CANDIDATES = [
  'video/mp4;codecs=avc1',
  'video/mp4',
  'video/webm;codecs=vp9',
  'video/webm;codecs=vp8',
  'video/webm',
] as const

export const AUDIO_MIME_CANDIDATES = [
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
] as const

export function recorderMimeCandidates(kind: 'video' | 'audio'): readonly string[] {
  return kind === 'video' ? VIDEO_MIME_CANDIDATES : AUDIO_MIME_CANDIDATES
}

/**
 * First supported candidate, or `null` when none is.
 *
 * `null` means "construct the recorder without a `mimeType` option and let the browser pick",
 * NOT "give up": `isTypeSupported` is itself optional in the spec, and a browser that reports
 * nothing as supported may still record perfectly in its default container. The recorder's
 * own `mimeType` property is read back afterwards, so the file is always labelled with what
 * the browser really produced.
 */
export function pickRecorderMimeType(
  candidates: readonly string[],
  isTypeSupported: (type: string) => boolean,
): string | null {
  for (const candidate of candidates) {
    if (isTypeSupported(candidate)) return candidate
  }
  return null
}

/** The phone's saved-file extensions (ui-mapping 09:592 — the route wrapper appends `.jpg` /
 *  `.mp4`; audio is `.m4a`). Used only as the fallback when a MIME type says nothing. */
export const PHONE_MEDIA_EXTENSIONS: Readonly<Record<MediaKind, string>> = Object.freeze({
  photo: 'jpg',
  video: 'mp4',
  audio: 'm4a',
})

/**
 * The true file extension for what was recorded/encoded.
 *
 * A demo that appended `.mp4` to a WebM blob would be putting a false claim in an evidence
 * filename, which is precisely the kind of thing this app exists to prevent. The phone
 * extension is used ONLY when the MIME type carries no container information at all (an empty
 * `MediaRecorder.mimeType`, which some browsers report) — the honest best guess in the
 * absence of a fact, and the one case where matching the phone costs nothing.
 */
export function extensionForMimeType(mimeType: string, kind: MediaKind): string {
  const type = mimeType.toLowerCase()
  if (type.includes('mp4') || type.includes('m4a') || type.includes('mpeg-4')) {
    return kind === 'audio' ? 'm4a' : 'mp4'
  }
  if (type.includes('webm')) return 'webm'
  if (type.includes('ogg')) return kind === 'audio' ? 'ogg' : 'ogv'
  if (type.includes('jpeg') || type.includes('jpg')) return 'jpg'
  if (type.includes('png')) return 'png'
  if (type.includes('quicktime')) return 'mov'
  if (type.includes('wav')) return 'wav'
  return PHONE_MEDIA_EXTENSIONS[kind]
}
