/**
 * What this browser can actually do, answered PER OPERATION (R-3).
 *
 * The three facts a browser exposes are independent — `getUserMedia`, `MediaRecorder` and
 * `URL.createObjectURL` can each be absent on their own — and they bind on different
 * operations. A photo needs a stream and somewhere to put the bytes; a video or an audio note
 * additionally needs a recorder. Collapsing that into one stored `sampleOnly` boolean answered
 * the PHOTO question and let both capture screens consume it as the answer for everything,
 * which is how a browser with a camera but no `MediaRecorder` came to print "This browser
 * doesn't expose a camera to this page" over a live viewfinder.
 *
 * So the answer is a function of the operation, and the sentence explaining a fallback is a
 * function of the REASON. Both live here, pure, so no surface can re-derive either by hand —
 * two hand-rolled copies is exactly how the two consumers came to hold two meanings.
 */

import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { MediaKind } from '@/features/demo/engine/types'
import type { CaptureFacility } from '@/features/demo/engine/logic/media/permissions'
import {
  NO_CAPTURE_STORAGE_NOTICE,
  NO_RECORDER_NOTICE,
  SAMPLE_MEDIA_NOTICE,
} from '@/features/demo/engine/logic/media/samples'

/** Whether an operation can be performed for real here, or only answered with a bundled sample. */
export type CaptureAvailability = 'live' | 'sample'

/** The three independent browser facts. Each is probed once at mount by `useMediaCapture`. */
export interface CaptureSupport {
  /** `getUserMedia` reached a device — a live preview is possible. */
  stream: boolean
  /** `MediaRecorder` exists AND a stream can be opened — a take can become a file. */
  record: boolean
  /** `URL.createObjectURL` exists — captured bytes can be turned into something viewable. */
  objectUrls: boolean
}

/**
 * Can this kind be captured for real?
 *
 * A photo is a frame grab: a stream plus somewhere to hold the encoded bytes. A video or an
 * audio note is a recording, so it needs `MediaRecorder` on top. Written as a switch over
 * `MediaKind` closed with `assertNever`, so a fourth kind cannot silently inherit the photo
 * rule — the exact class of drift this function replaces.
 */
export function captureAvailability(support: CaptureSupport, kind: MediaKind): CaptureAvailability {
  const canHoldBytes = support.stream && support.objectUrls
  switch (kind) {
    case 'photo':
      return canHoldBytes ? 'live' : 'sample'
    case 'video':
    case 'audio':
      return canHoldBytes && support.record ? 'live' : 'sample'
    default:
      return assertNever(kind)
  }
}

/**
 * The sentence for why this surface fell back, chosen by the BINDING reason rather than by
 * whichever boolean the caller happened to reach for.
 *
 * Priority is what makes it correct: no device at all outranks no storage, which outranks no
 * recorder. On a `{ stream: true, record: false }` browser the photo path never falls back, so
 * "cannot record to a file" can only ever surface where it is true; on a `{ objectUrls: false }`
 * browser both paths fall back and neither claims the camera is missing — the falsehood
 * `MediaCaptureScreen`'s unavailable panel already refuses to print.
 */
export function sampleFallbackNotice(support: CaptureSupport, facility: CaptureFacility): string {
  if (!support.stream) return SAMPLE_MEDIA_NOTICE[facility]
  if (!support.objectUrls) return NO_CAPTURE_STORAGE_NOTICE
  return NO_RECORDER_NOTICE[facility]
}
