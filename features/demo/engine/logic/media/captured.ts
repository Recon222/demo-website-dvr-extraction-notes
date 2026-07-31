/**
 * What a capture produced, and how it becomes a stored `MediaItem` (parity P4.1).
 *
 * `CapturedMedia` is the capability layer's OUTPUT — bytes plus what is known about them,
 * before the visitor has named anything. `MediaItem` is the store's record of a saved
 * capture. The one-way mapping between them lives here, pure, so the three capture surfaces
 * (P4.3 photo/video, P4.6 audio, P4.7 OCR) and the metadata form (P4.4) cannot each invent
 * their own filename rule.
 *
 * ── The refresh contract (plan §5 P4.1, owner decision D2) ──────────────────────────────
 * Media BYTES are never persisted. The demo's snapshot lives in `sessionStorage`, which holds
 * strings; a captured photo is a `blob:` URL whose bytes belong to the document that created
 * them and die with it. Persisting the URL string would rehydrate a `MediaItem` pointing at
 * nothing — a broken `<img>`, or worse, a library row that claims to hold evidence it cannot
 * show. So `withoutEphemeralMediaUrls` strips `blob:` URLs on the write side, and a restored
 * item with no `url` renders `MEDIA_EXPIRED_NOTICE` instead.
 *
 * Bundled SAMPLE assets are the deliberate exception: their URLs are static paths under
 * `/demo-media`, which are as valid after a refresh as before it, so they are kept. The
 * distinction is a real property of the URL, not a flag anyone has to remember to set.
 */

import type { DemoLocation, MediaItem, MediaKind } from '@/features/demo/engine/types'
import { extensionForMimeType } from '@/features/demo/engine/logic/media/recording'

// ---- Capture output -------------------------------------------------------

export interface CapturedMedia {
  kind: MediaKind
  /** A `blob:` object URL for a live capture, or a bundled sample asset path. */
  url: string
  /** Poster still for a video capture. */
  poster?: string
  /** The container the browser actually produced (`MediaRecorder.mimeType`, `Blob.type`).
   *  May be `''` — some browsers report nothing, and guessing would be worse. */
  mimeType: string
  sizeBytes?: number
  durationSec?: number
  /** Demo datetime string, `YYYY-MM-DD HH:MM:SS` — read from the clock seam at the capture
   *  site (`ui/inputs/capture-media.ts`), never from an ambient `Date` in here. */
  capturedAt: string
  /** True when this came from the bundled sample assets rather than from hardware. Rides all
   *  the way onto `MediaItem.sample` so every surface can label it. */
  sample: boolean
}

// ---- Filenames ------------------------------------------------------------

/** The phone's `sanitizeFilename` character class (`MetadataForm.tsx`, ui-mapping 09:256):
 *  the set that is illegal in a Windows path, stripped on every keystroke. */
const ILLEGAL_FILENAME_CHARS = /[<>:"/\\|?*]/g

/** Phone `MetadataForm` `sanitizeFilename` — strips the illegal set, leaves everything else
 *  (including spaces) alone. Exported so the metadata form (P4.4) and this mapper apply
 *  exactly one rule. */
export function sanitizeFilename(value: string): string {
  return value.replace(ILLEGAL_FILENAME_CHARS, '')
}

/** Phone `MetadataForm` validity: the TRIMMED filename is 1–100 characters (ui-mapping 09:256). */
export const MAX_FILENAME_LENGTH = 100

/** Phone `MetadataForm` caption cap (`MetadataForm.tsx:28`, ui-mapping 09:256). Unlike the
 *  filename it is not a VALIDITY rule — an over-length caption is impossible, not invalid,
 *  because the field refuses the keystroke. */
export const MAX_CAPTION_LENGTH = 500

export function isValidFilename(value: string): boolean {
  const trimmed = value.trim()
  return trimmed.length >= 1 && trimmed.length <= MAX_FILENAME_LENGTH
}

/**
 * The stored filename: the visitor's sanitized, trimmed base plus the extension for the
 * container that was actually produced (phone parity — the route wrapper appends the
 * extension, ui-mapping 09:592 — with the honest-container correction from
 * `extensionForMimeType`).
 */
export function mediaFilename(base: string, captured: CapturedMedia): string {
  return `${sanitizeFilename(base).trim()}.${extensionForMimeType(captured.mimeType, captured.kind)}`
}

/**
 * The filename base a LIVE camera capture arrives in the metadata form with (P4.4 pre-fill).
 *
 * Derived from the capture's OWN timestamp — already read from the clock seam at the capture
 * site — so it is deterministic under a stubbed clock and the demo's no-`Date.now()` rule holds
 * at every layer. `photo-20260730-140506`, and `mediaFilename` adds the real container's
 * extension on top.
 *
 * A SAMPLE capture does not use this: `suggestedFilenameBase` swaps in the bundled asset's own
 * name. Both go through that one function, so the capture screens cannot each invent a default.
 *
 * Two captures inside the same second produce the same base. That is deliberate: the phone
 * enforces no filename uniqueness either (the visitor is free to save two `front door` photos),
 * and `MediaItem.id` — not the filename — is what identifies a row.
 */
export function defaultCaptureBasename(captured: CapturedMedia): string {
  const digits = captured.capturedAt.replace(/\D/g, '')
  // Short of a full `YYYYMMDDHHMMSS` the timestamp says nothing reliable, so name the kind
  // rather than emit a truncated date that reads like a real one.
  if (digits.length < 14) return captured.kind
  return `${captured.kind}-${digits.slice(0, 8)}-${digits.slice(8, 14)}`
}

// ---- Capture → stored item ------------------------------------------------

/**
 * The single construction site for a stored `MediaItem`. Ids come from the store's `nextId`
 * counter (no `Math.random()` in the demo), so the caller supplies one.
 *
 * `poster`, `durationSec` and `sample` are copied only when they carry information: an
 * `undefined` beats a `0`-second duration or a `sample: false` on every item, both of which
 * would be noise in the snapshot.
 */
export function buildMediaItem(input: {
  id: string
  captured: CapturedMedia
  /** The visitor's filename WITHOUT an extension. */
  filename: string
  caption: string
}): MediaItem {
  const { id, captured, filename, caption } = input
  return {
    id,
    kind: captured.kind,
    url: captured.url,
    ...(captured.poster !== undefined ? { poster: captured.poster } : {}),
    filename: mediaFilename(filename, captured),
    caption,
    capturedAt: captured.capturedAt,
    ...(captured.durationSec !== undefined ? { durationSec: captured.durationSec } : {}),
    ...(captured.sample ? { sample: true } : {}),
  }
}

// ---- The refresh contract -------------------------------------------------

/**
 * True for a URL that will still resolve after a page refresh.
 *
 * `blob:` URLs are scoped to the document that minted them; everything else the demo puts on
 * a `MediaItem` is a bundled sample path served by Next. This is a property of the URL, so no
 * producer has to remember to set a flag for it to hold.
 */
export function isDurableMediaUrl(url: string): boolean {
  return url !== '' && !url.startsWith('blob:')
}

/** Whether this item still has bytes to show. `false` for anything restored from a snapshot
 *  that held a live capture — the state `MEDIA_EXPIRED_NOTICE` explains. */
export function isMediaAvailable(item: MediaItem): boolean {
  return item.url !== undefined && item.url !== ''
}

/**
 * What a surface renders in place of a restored capture. States the mechanism, because "media
 * unavailable" would read as a bug: the demo made a deliberate choice not to write a
 * visitor's photographs into browser storage.
 */
export const MEDIA_EXPIRED_NOTICE =
  "This capture lived in the tab's memory only and did not survive the refresh — the demo never writes captured media to storage."

/**
 * Every URL held by one location's three media buckets, `url` and `poster` alike.
 *
 * The delete cascade's input (R-2). Once a capture is saved the surface has `release`d its
 * object URL and the store is sole owner (§58g), so a location dropped from the store takes
 * the only remaining reference to its blobs with it — nothing is left in the page to revoke
 * them, and the bytes stay pinned for the tab's life. Collecting the URLs BEFORE the store
 * write is the only moment they are still reachable.
 *
 * Pure and shared so the case cascade and the location cascade cannot disagree about which
 * buckets they sweep. Sample paths ride along untouched — `revokeCapturedUrls` no-ops on them.
 */
export function collectMediaUrls(locations: readonly DemoLocation[]): (string | undefined)[] {
  const urls: (string | undefined)[] = []
  for (const location of locations) {
    const media = location.form.media
    for (const bucket of [media.photos, media.videos, media.audios]) {
      for (const item of bucket) urls.push(item.url, item.poster)
    }
  }
  return urls
}

/** Drop the ephemeral URLs from one item, keeping everything else. Identity-preserving: an
 *  item with nothing to strip comes back as the same object. */
export function withoutEphemeralMediaUrls(item: MediaItem): MediaItem {
  const dropUrl = item.url !== undefined && !isDurableMediaUrl(item.url)
  const dropPoster = item.poster !== undefined && !isDurableMediaUrl(item.poster)
  if (!dropUrl && !dropPoster) return item

  const next: MediaItem = { ...item }
  if (dropUrl) delete next.url
  if (dropPoster) delete next.poster
  return next
}

/**
 * The write-side sweep applied by `snapshotOf`: strip every `blob:` URL in the location graph.
 *
 * Identity-preserving at each level — a location whose media are all samples (or has no media)
 * comes back as the same object, so the debounced save does not churn references the store's
 * reconciliation discipline relies on being stable.
 */
export function withoutEphemeralMedia(locations: readonly DemoLocation[]): DemoLocation[] {
  let anyChanged = false
  const next = locations.map((location) => {
    const media = location.form.media
    const photos = mapKeepingIdentity(media.photos)
    const videos = mapKeepingIdentity(media.videos)
    const audios = mapKeepingIdentity(media.audios)
    if (photos === media.photos && videos === media.videos && audios === media.audios) {
      return location
    }
    anyChanged = true
    return { ...location, form: { ...location.form, media: { photos, videos, audios } } }
  })
  return anyChanged ? next : (locations as DemoLocation[])
}

function mapKeepingIdentity(items: MediaItem[]): MediaItem[] {
  let changed = false
  const next = items.map((item) => {
    const stripped = withoutEphemeralMediaUrls(item)
    if (stripped !== item) changed = true
    return stripped
  })
  return changed ? next : items
}
