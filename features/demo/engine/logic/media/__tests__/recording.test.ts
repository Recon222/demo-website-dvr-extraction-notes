import { describe, expect, it } from 'vitest'

import {
  AUDIO_MIME_CANDIDATES,
  IDLE_RECORDING,
  MAX_RECORDING_DURATION_MS,
  MIN_RECORDING_DURATION_MS,
  PHONE_MEDIA_EXTENSIONS,
  VIDEO_MIME_CANDIDATES,
  beginRecording,
  canStopAtElapsed,
  extensionForMimeType,
  formatDuration,
  formatFileSize,
  hasReachedMaxDuration,
  isActiveRecording,
  pauseRecording,
  pickRecorderMimeType,
  recordedMs,
  recorderMimeCandidates,
  resumeRecording,
  stopRecording,
  type RecordingState,
} from '@/features/demo/engine/logic/media/recording'

const T0 = 1_000_000

describe('recording lifecycle', () => {
  it('starts at zero from the given clock reading', () => {
    const state = beginRecording(T0)
    expect(state).toEqual({ phase: 'recording', accumulatedMs: 0, segmentStartMs: T0 })
    expect(recordedMs(state, T0)).toBe(0)
  })

  it('accrues elapsed time while recording', () => {
    const state = beginRecording(T0)
    expect(recordedMs(state, T0 + 2_500)).toBe(2_500)
  })

  it('banks the segment on pause and then STOPS counting', () => {
    // The whole reason the demo derives duration instead of running a wall clock: a paused
    // MediaRecorder emits no data, so counting paused seconds would display a duration the
    // file does not contain.
    const paused = pauseRecording(beginRecording(T0), T0 + 3_000)
    expect(paused.phase).toBe('paused')
    expect(recordedMs(paused, T0 + 3_000)).toBe(3_000)
    expect(recordedMs(paused, T0 + 60_000)).toBe(3_000)
  })

  it('resumes from the banked total, excluding the paused gap', () => {
    const paused = pauseRecording(beginRecording(T0), T0 + 3_000)
    const resumed = resumeRecording(paused, T0 + 10_000) // 7s paused
    expect(recordedMs(resumed, T0 + 12_000)).toBe(5_000) // 3s + 2s, not 12s
  })

  it('survives several pause/resume cycles', () => {
    let state = beginRecording(T0)
    state = pauseRecording(state, T0 + 1_000)
    state = resumeRecording(state, T0 + 5_000)
    state = pauseRecording(state, T0 + 6_500)
    state = resumeRecording(state, T0 + 20_000)
    state = stopRecording(state, T0 + 20_400)
    expect(state.phase).toBe('stopped')
    expect(recordedMs(state, T0 + 999_999)).toBe(1_000 + 1_500 + 400)
  })

  it('freezes the total at stop', () => {
    const stopped = stopRecording(beginRecording(T0), T0 + 4_000)
    expect(stopped.segmentStartMs).toBeNull()
    expect(recordedMs(stopped, T0 + 4_000)).toBe(4_000)
    expect(recordedMs(stopped, T0 + 900_000)).toBe(4_000)
  })

  it('stops straight from paused without losing the banked time', () => {
    const paused = pauseRecording(beginRecording(T0), T0 + 2_000)
    const stopped = stopRecording(paused, T0 + 30_000)
    expect(stopped.phase).toBe('stopped')
    expect(recordedMs(stopped, T0 + 30_000)).toBe(2_000)
  })

  it('never subtracts when the clock reads backwards', () => {
    // A system time change mid-take must not un-record what already happened.
    const state = beginRecording(T0)
    expect(recordedMs(state, T0 - 5_000)).toBe(0)
    expect(recordedMs(stopRecording(state, T0 - 5_000), T0)).toBe(0)
  })
})

describe('out-of-phase transitions are identity no-ops', () => {
  const recording = beginRecording(T0)
  const paused = pauseRecording(recording, T0 + 1_000)
  const stopped = stopRecording(recording, T0 + 1_000)

  it.each([
    ['pause an idle recorder', () => pauseRecording(IDLE_RECORDING, T0), IDLE_RECORDING],
    ['pause a paused recorder', () => pauseRecording(paused, T0 + 2_000), paused],
    ['pause a stopped recorder', () => pauseRecording(stopped, T0 + 2_000), stopped],
    ['resume an idle recorder', () => resumeRecording(IDLE_RECORDING, T0), IDLE_RECORDING],
    ['resume a live recorder', () => resumeRecording(recording, T0 + 2_000), recording],
    ['resume a stopped recorder', () => resumeRecording(stopped, T0 + 2_000), stopped],
    ['stop an idle recorder', () => stopRecording(IDLE_RECORDING, T0), IDLE_RECORDING],
    ['stop a stopped recorder', () => stopRecording(stopped, T0 + 2_000), stopped],
  ])('%s returns the same object (a React setState no-op)', (_label, run, expected) => {
    // Double-tapped buttons and late MediaRecorder events are normal, not exceptional —
    // identity return means they cost nothing rather than half-applying a transition.
    expect(run()).toBe(expected)
  })
})

describe('canStopAtElapsed (the phone 500ms gate)', () => {
  /** How the only production consumer applies the gate: elapsed from state, then the rule. */
  const canStopAt = (state: RecordingState, nowMs: number): boolean =>
    canStopAtElapsed(state, recordedMs(state, nowMs))

  it('pins the phone constants', () => {
    expect(MIN_RECORDING_DURATION_MS).toBe(500)
    expect(MAX_RECORDING_DURATION_MS).toBe(60 * 60 * 1000)
  })

  it('is false below the minimum and true at exactly the minimum', () => {
    const state = beginRecording(T0)
    expect(canStopAt(state, T0 + 499)).toBe(false)
    expect(canStopAt(state, T0 + 500)).toBe(true)
  })

  it('is false for idle and stopped recorders whatever the elapsed figure', () => {
    expect(canStopAt(IDLE_RECORDING, T0 + 99_999)).toBe(false)
    expect(canStopAt(stopRecording(beginRecording(T0), T0 + 9_000), T0 + 99_999)).toBe(false)
  })

  it('holds a paused recorder at its banked total rather than letting the clock unlock Stop', () => {
    const paused = pauseRecording(beginRecording(T0), T0 + 100)
    expect(canStopAt(paused, T0 + 100_000)).toBe(false)
  })
})

describe('isActiveRecording / hasReachedMaxDuration', () => {
  it('treats recording and paused as active', () => {
    expect(isActiveRecording(beginRecording(T0))).toBe(true)
    expect(isActiveRecording(pauseRecording(beginRecording(T0), T0 + 1))).toBe(true)
    expect(isActiveRecording(IDLE_RECORDING)).toBe(false)
    expect(isActiveRecording(stopRecording(beginRecording(T0), T0 + 1))).toBe(false)
  })

  it('trips the auto-stop at exactly one hour of RECORDED time', () => {
    const state = beginRecording(T0)
    expect(hasReachedMaxDuration(state, T0 + MAX_RECORDING_DURATION_MS - 1)).toBe(false)
    expect(hasReachedMaxDuration(state, T0 + MAX_RECORDING_DURATION_MS)).toBe(true)
  })

  it('does not trip on an hour of PAUSED time', () => {
    const paused = pauseRecording(beginRecording(T0), T0 + 1_000)
    expect(hasReachedMaxDuration(paused, T0 + MAX_RECORDING_DURATION_MS * 2)).toBe(false)
  })

  it('never trips on a finished recording', () => {
    const stopped = stopRecording(beginRecording(T0), T0 + MAX_RECORDING_DURATION_MS)
    expect(hasReachedMaxDuration(stopped, T0 + MAX_RECORDING_DURATION_MS)).toBe(false)
  })
})

describe('formatDuration (phone format.ts:17-29 verbatim)', () => {
  it.each([
    [0, '00:00'],
    [999, '00:00'],
    [1_000, '00:01'],
    [61_000, '01:01'],
    [599_000, '09:59'],
    [3_599_000, '59:59'],
    [3_600_000, '01:00:00'],
    [3_661_000, '01:01:01'],
    [36_000_000, '10:00:00'],
  ])('formats %ims as %s', (ms, expected) => {
    expect(formatDuration(ms)).toBe(expected)
  })

  it('clamps negatives to zero like the phone does', () => {
    expect(formatDuration(-5_000)).toBe('00:00')
  })
})

describe('formatFileSize (phone format.ts:40-45 verbatim)', () => {
  it.each([
    [0, '0 B'],
    [1023, '1023 B'],
    [1024, '1.0 KB'],
    [1536, '1.5 KB'],
    [1024 * 1024, '1.0 MB'],
    [3.2 * 1024 * 1024, '3.2 MB'],
  ])('formats %i bytes as %s', (bytes, expected) => {
    expect(formatFileSize(bytes)).toBe(expected)
  })

  it('clamps negatives to zero like the phone does', () => {
    expect(formatFileSize(-1)).toBe('0 B')
  })
})

describe('pickRecorderMimeType', () => {
  it('returns the first supported candidate in preference order', () => {
    expect(pickRecorderMimeType(VIDEO_MIME_CANDIDATES, (t) => t.startsWith('video/webm'))).toBe(
      'video/webm;codecs=vp9',
    )
  })

  it('prefers mp4/m4a so the phone extensions hold where the browser can produce them', () => {
    expect(pickRecorderMimeType(VIDEO_MIME_CANDIDATES, () => true)).toBe('video/mp4;codecs=avc1')
    expect(pickRecorderMimeType(AUDIO_MIME_CANDIDATES, () => true)).toBe('audio/mp4')
  })

  it('returns null when nothing is supported — "let the browser choose", not "give up"', () => {
    expect(pickRecorderMimeType(AUDIO_MIME_CANDIDATES, () => false)).toBeNull()
    expect(pickRecorderMimeType([], () => true)).toBeNull()
  })

  it('routes each recorded kind to its own candidate list', () => {
    expect(recorderMimeCandidates('video')).toBe(VIDEO_MIME_CANDIDATES)
    expect(recorderMimeCandidates('audio')).toBe(AUDIO_MIME_CANDIDATES)
  })
})

describe('extensionForMimeType', () => {
  it.each([
    ['video/mp4;codecs=avc1', 'video', 'mp4'],
    ['video/webm;codecs=vp9', 'video', 'webm'],
    ['video/x-matroska;codecs=avc1', 'video', 'mkv'], // Chrome's H.264-in-Matroska — NOT an mp4
    ['audio/x-matroska', 'audio', 'mka'],
    ['audio/mp4', 'audio', 'm4a'],
    ['audio/webm;codecs=opus', 'audio', 'webm'],
    ['audio/ogg;codecs=opus', 'audio', 'ogg'],
    ['image/jpeg', 'photo', 'jpg'],
    ['image/png', 'photo', 'png'],
    ['video/quicktime', 'video', 'mov'],
    ['audio/wav', 'audio', 'wav'],
  ] as const)('names the real container for %s', (mime, kind, expected) => {
    expect(extensionForMimeType(mime, kind)).toBe(expected)
  })

  it('is case-insensitive', () => {
    expect(extensionForMimeType('VIDEO/WEBM', 'video')).toBe('webm')
  })

  it('never stamps .mp4 on a WebM or Matroska blob (the false-claim-in-a-filename pin)', () => {
    // R-11: the Matroska row used to assert `.mp4` here, which made this test the one thing
    // that would have blocked the honest branch.
    expect(extensionForMimeType('video/webm', 'video')).not.toBe('mp4')
    expect(extensionForMimeType('audio/webm', 'audio')).not.toBe('m4a')
    expect(extensionForMimeType('video/x-matroska;codecs=avc1', 'video')).not.toBe('mp4')
  })

  it('falls back to the phone extension only when the MIME type says nothing', () => {
    expect(extensionForMimeType('', 'photo')).toBe('jpg')
    expect(extensionForMimeType('', 'video')).toBe('mp4')
    expect(extensionForMimeType('application/octet-stream', 'audio')).toBe('m4a')
    expect(PHONE_MEDIA_EXTENSIONS).toEqual({ photo: 'jpg', video: 'mp4', audio: 'm4a' })
  })
})
