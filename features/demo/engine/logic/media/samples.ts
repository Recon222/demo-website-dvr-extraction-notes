/**
 * The SAMPLE fallback — bundled placeholder media for a browser that exposes no capture
 * capability to the page (parity P4.1, matrix §1.11 preamble).
 *
 * ── When a sample is allowed ────────────────────────────────────────────────────────────
 * Only when the capability is ABSENT (`permission === 'unavailable'`): no `navigator.
 * mediaDevices`, no `MediaRecorder`, no `URL.createObjectURL`. A DENIED camera never yields
 * a sample — that is the difference between "this browser can't" and "you said no", and
 * substituting a picture for a refusal would be exactly the fake success the demo's honesty
 * rule forbids. Even in the unavailable case nothing is substituted silently: the visitor
 * still presses the capture control, and what comes back is labelled sample everywhere it
 * appears (`CapturedMedia.sample` → `MediaItem.sample` → the "Sample" badge, the same route
 * the import pipeline's `FallbackMode` already takes).
 *
 * `vitest.setup.ts` deliberately leaves `navigator.mediaDevices` undefined and jsdom ships
 * neither `MediaRecorder` nor `URL.createObjectURL`, so this path is the DEFAULT tested
 * contract — the same posture GPS takes with `UNSUPPORTED`.
 *
 * The assets themselves are honest about what they are: each one reads "SAMPLE PHOTO" /
 * "SAMPLE CLIP" on its face, so a screenshot taken out of context still says so. Provenance
 * and regeneration commands: `tools/sample-media/README.md`.
 */

import type { MediaKind } from '@/features/demo/engine/types'
import type { CapturedMedia } from '@/features/demo/engine/logic/media/captured'
import type { CaptureFacility } from '@/features/demo/engine/logic/media/permissions'

/** Static route for the bundled assets — served from `public/demo-media`, so these URLs are
 *  durable across a refresh (which is why `withoutEphemeralMediaUrls` keeps them). */
export const SAMPLE_MEDIA_BASE = '/demo-media'

export interface SampleMediaAsset {
  kind: MediaKind
  url: string
  poster?: string
  /** The real container of the committed file — so the sample gets the same honest extension
   *  treatment as a live capture. */
  mimeType: string
  durationSec?: number
  /** Pre-filled filename for the metadata form (P4.4), without an extension. */
  suggestedFilename: string
}

export const SAMPLE_MEDIA: Readonly<Record<MediaKind, SampleMediaAsset>> = Object.freeze({
  photo: Object.freeze({
    kind: 'photo',
    url: `${SAMPLE_MEDIA_BASE}/sample-photo.jpg`,
    mimeType: 'image/jpeg',
    suggestedFilename: 'sample-photo',
  }),
  video: Object.freeze({
    kind: 'video',
    url: `${SAMPLE_MEDIA_BASE}/sample-clip.mp4`,
    poster: `${SAMPLE_MEDIA_BASE}/sample-clip-poster.jpg`,
    mimeType: 'video/mp4',
    durationSec: 4,
    suggestedFilename: 'sample-clip',
  }),
  audio: Object.freeze({
    kind: 'audio',
    url: `${SAMPLE_MEDIA_BASE}/sample-note.m4a`,
    mimeType: 'audio/mp4',
    durationSec: 4,
    suggestedFilename: 'sample-note',
  }),
})

/**
 * What a surface tells the visitor when the sample path is the only one available.
 *
 * Says what is missing, what was attached instead, and that no hardware was involved —
 * the three facts a "Sample" badge alone would leave them to guess at.
 */
export const SAMPLE_MEDIA_NOTICE: Readonly<Record<CaptureFacility, string>> = Object.freeze({
  camera:
    'This browser exposes no camera to the page, so the demo attached a bundled sample instead. Nothing was recorded.',
  microphone:
    'This browser exposes no microphone to the page, so the demo attached a bundled sample instead. Nothing was recorded.',
})

/**
 * The other way a browser can leave a capture surface with nothing to record: `getUserMedia`
 * works, so a live preview and a level meter are real, but there is no `MediaRecorder` to turn
 * the stream into a file (Safari before 14.1). `SAMPLE_MEDIA_NOTICE`'s "exposes no microphone"
 * would be plainly false there — the microphone is open and the visitor can see it working.
 *
 * Added by P4.6 and keyed by facility so P4.3's video mode has the same sentence available.
 */
export const NO_RECORDER_NOTICE: Readonly<Record<CaptureFacility, string>> = Object.freeze({
  camera:
    'This browser can open a camera but cannot record video to a file, so the demo attached a bundled sample instead. Nothing was recorded.',
  microphone:
    'This browser can open a microphone but cannot record audio to a file, so the demo attached a bundled sample instead. Nothing was recorded.',
})

/** The facility a kind is captured with — photo and video both come from the camera. */
export function facilityForKind(kind: MediaKind): CaptureFacility {
  return kind === 'audio' ? 'microphone' : 'camera'
}

/**
 * The base name the metadata form (P4.4) opens with — the ONE rule all three capture surfaces
 * pre-fill through, so a photo, a clip and an audio note cannot each answer this differently.
 *
 * A SAMPLE take is named after the bundled asset it actually is (`sample-photo` / `sample-clip`
 * / `sample-note`). Anything the caller would otherwise have used — a live camera capture's
 * `defaultCaptureBasename`, the audio flow's location-scoped `audio-note-N` — would put a name
 * that reads like something the visitor made onto a file nobody captured, and the media
 * library's filename column is the one place the "Sample" badge does not follow it.
 *
 * `fallback` stays a parameter rather than being derived here because the two provenances are
 * genuinely different (a capture timestamp vs. the open location's note count) and each caller
 * is the only one that knows its own.
 *
 * It is a PRE-FILL, not a commitment: every caller hands it to an editable field, and what is
 * stored is whatever the visitor leaves in that field.
 */
export function suggestedFilenameBase(captured: CapturedMedia, fallback: string): string {
  return captured.sample ? SAMPLE_MEDIA[captured.kind].suggestedFilename : fallback
}

/**
 * Turn a bundled asset into a `CapturedMedia` indistinguishable in SHAPE from a live capture
 * (so the review/metadata screens have one code path) and unmistakable in CONTENT (`sample:
 * true`, and the asset says so on its face).
 *
 * `sizeBytes` is deliberately absent: the demo has not measured these files at runtime, and
 * a hard-coded byte count in the info panel would be a number nobody verified.
 */
export function toSampleCapture(kind: MediaKind, capturedAt: string): CapturedMedia {
  const asset = SAMPLE_MEDIA[kind]
  return {
    kind,
    url: asset.url,
    ...(asset.poster !== undefined ? { poster: asset.poster } : {}),
    mimeType: asset.mimeType,
    ...(asset.durationSec !== undefined ? { durationSec: asset.durationSec } : {}),
    capturedAt,
    sample: true,
  }
}
