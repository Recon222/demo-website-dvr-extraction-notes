'use client'

import {
  createObjectUrlRegistry,
  readBrowserObjectUrls,
  type ObjectUrlIo,
} from '@/features/demo/ui/inputs/object-urls'

/**
 * Saving a file to the visitor's machine (parity P5.4).
 *
 * The demo's other export surfaces are honest stubs — a browser cannot produce the phone's
 * AES-encrypted evidence ZIP, and a fake one would be a lie. The Case Map is the exception
 * (decision D4): the phone's artifact is ALREADY a self-contained HTML page, so the browser
 * can hand the visitor the genuine file. This is the seam that does it — a real `Blob`, a
 * real object URL, a real anchor `download`, a real file they keep.
 *
 * Everything the browser provides is behind `DownloadIo` so the save path is drivable in
 * tests and its absence is a state rather than a crash. `readBrowserDownloadIo()` returns
 * `null` wherever the APIs are missing (SSR, a hardened browser); the caller turns that into
 * an honest notice instead of a dead button. It is read at CALL time, never at module scope,
 * so a test can install a stub first — the rule `object-urls.ts` already sets.
 */

export interface DownloadIo {
  /** Object-URL minting/revoking — the same slice of `URL` the capture surfaces use. */
  urls: ObjectUrlIo
  /** Wrap the text in a typed blob. */
  toBlob(content: string, mimeType: string): Blob
  /** Click a transient `<a download>` at `url`. */
  clickDownloadAnchor(url: string, filename: string): void
  /**
   * Run the revoke AFTER the click has been dispatched. Revoking an object URL in the same
   * tick as the click cancels the download outright in some browsers, and a download that
   * silently never lands is the exact failure this feature exists to avoid.
   */
  defer(fn: () => void): void
}

/** The browser's file-saving primitives, or `null` on any environment missing them. */
export function readBrowserDownloadIo(): DownloadIo | null {
  const urls = readBrowserObjectUrls()
  if (!urls) return null
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return null
  return {
    urls,
    toBlob: (content, mimeType) => new Blob([content], { type: mimeType }),
    clickDownloadAnchor: (url, filename) => {
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.rel = 'noopener'
      // In the document, because Firefox will not action a click on a detached anchor.
      anchor.style.display = 'none'
      document.body.appendChild(anchor)
      try {
        anchor.click()
      } finally {
        anchor.remove()
      }
    },
    defer: (fn) => {
      setTimeout(fn, 0)
    },
  }
}

export type SaveFileOutcome =
  | { ok: true; filename: string }
  | { ok: false; reason: 'unavailable' | 'failed' }

export interface SaveTextFileInput {
  content: string
  filename: string
  mimeType: string
}

/**
 * Save `content` as `filename`. Returns an outcome; never throws.
 *
 * `unavailable` = this environment cannot save files at all. `failed` = it can, and the
 * attempt did not work — logged, because an object-URL or DOM failure would otherwise be
 * indistinguishable from a visitor dismissing their own download dialog, forever, with no
 * signal (the treatment `ui/import/geocode.ts` and `reverse-geocode.ts` already use).
 *
 * The object URL goes through the demo's registry rather than a bare `createObjectURL`: it
 * is the repo's one answer to "who revokes this?", and a download is its simplest case —
 * mint, use, sweep, no hand-off. `revokeAll()` runs deferred and in a `finally`, so the blob
 * is released whether or not the click threw.
 */
export function saveTextFile(
  input: SaveTextFileInput,
  io: DownloadIo | null = readBrowserDownloadIo(),
): SaveFileOutcome {
  if (!io) return { ok: false, reason: 'unavailable' }

  const registry = createObjectUrlRegistry(io.urls)
  let url: string | null = null
  try {
    url = registry.create(io.toBlob(input.content, input.mimeType))
    io.clickDownloadAnchor(url, input.filename)
    return { ok: true, filename: input.filename }
  } catch (e) {
    console.warn('[demo/download-file] saving failed — no file was written:', e)
    return { ok: false, reason: 'failed' }
  } finally {
    if (url !== null) io.defer(() => registry.revokeAll())
  }
}
