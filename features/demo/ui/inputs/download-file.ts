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
   * Run the revoke well AFTER the click has been dispatched. Revoking an object URL in the
   * same tick as the click cancels the download outright in some browsers, and a download that
   * silently never lands is the exact failure this feature exists to avoid.
   *
   * Review R-21: `setTimeout(fn, 0)` was the same race with a one-macrotask fuse. The browser
   * fetches the blob asynchronously after the click returns, and nothing tells us when it is
   * done — so the delay is a bet, and the ecosystem's answer (FileSaver.js) is tens of seconds.
   * `REVOKE_DELAY_MS` is that bet; `pagehide` is the backstop that keeps a long fuse from
   * outliving the document. The registry makes both safe: a revoke of an already-swept URL is
   * a no-op by construction.
   */
  defer(fn: () => void): void
}

/**
 * How long the object URL stays alive after the click (review R-21).
 *
 * The browser reads the blob asynchronously and reports nothing back, so any number here is a
 * bet on "the fetch has started by now". 40 s is FileSaver.js's order of magnitude; the blob is
 * one ~85 kB string and the registry sweeps it on `pagehide` regardless, so the cost of being
 * generous is bounded and the cost of being early is a silently-lost download.
 */
export const REVOKE_DELAY_MS = 40_000

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
      const timer = setTimeout(() => {
        window.removeEventListener('pagehide', sweep)
        fn()
      }, REVOKE_DELAY_MS)
      // A tab closed inside the window would otherwise drop the timer with the blob still
      // pinned. Sweeping on `pagehide` releases it; the registry's scoped revoke makes the
      // double-call harmless.
      function sweep() {
        clearTimeout(timer)
        fn()
      }
      window.addEventListener('pagehide', sweep, { once: true })
    },
  }
}

/**
 * What `saveTextFile` can honestly report (review R-2).
 *
 * `requested`, NOT `ok`. `HTMLAnchorElement.click()` is fire-and-forget in every browser: a
 * suppressed download throws nothing and returns nothing. Chrome's automatic-download blocking,
 * a blocking extension, a hardened or enterprise profile, transient user activation expiring —
 * every one of them returns normally. Detection is not merely unimplemented here, it is
 * impossible, so the type stops implying a verified write and the caller's copy stops claiming
 * one. The only truthful statement is "the browser was asked".
 *
 * `unavailable` = this environment has no file-saving primitives at all. `failed` = it has
 * them and the attempt threw — a genuinely observed failure, and the only kind there is.
 */
export type SaveFileOutcome =
  | { requested: true; filename: string }
  | { requested: false; reason: 'unavailable' | 'failed' }

export interface SaveTextFileInput {
  content: string
  filename: string
  mimeType: string
}

/**
 * ASK the browser to save `content` as `filename`. Returns an outcome; never throws.
 *
 * "Ask" is the whole contract — see `SaveFileOutcome`. A `requested: true` means the blob was
 * minted and the anchor clicked without throwing; whether a file reached the visitor's disk is
 * not observable from here, and no amount of code makes it so.
 *
 * A `failed` is logged, because an object-URL or DOM refusal would otherwise be
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
  if (!io) return { requested: false, reason: 'unavailable' }

  const registry = createObjectUrlRegistry(io.urls)
  let url: string | null = null
  try {
    url = registry.create(io.toBlob(input.content, input.mimeType))
    io.clickDownloadAnchor(url, input.filename)
    return { requested: true, filename: input.filename }
  } catch (e) {
    console.warn('[demo/download-file] the save attempt threw — nothing was handed to the browser:', e)
    return { requested: false, reason: 'failed' }
  } finally {
    if (url !== null) io.defer(() => registry.revokeAll())
  }
}
