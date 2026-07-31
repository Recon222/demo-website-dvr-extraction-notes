'use client'

/**
 * Object-URL lifecycle (parity P4.1).
 *
 * `URL.createObjectURL` pins a blob in memory until someone revokes it. A capture surface
 * that mints one per retake and never revokes leaks the full byte size of every discarded
 * photo and video for the life of the tab — and the demo's flows are built around retaking.
 * So every object URL the demo creates goes through a registry that knows what it owns.
 *
 * Two rules make the ownership unambiguous:
 *
 * 1. **Revoking is scoped to what this registry created.** `revoke` on an untracked URL is a
 *    no-op, so a bundled sample path (`/demo-media/...`) or a URL owned by another registry
 *    can never be revoked by accident — which would blank an image with no error anywhere.
 * 2. **Hand-off is explicit.** When a capture is saved into the store, the store now owns the
 *    URL and the capture surface must stop revoking it on unmount. `release` forgets a URL
 *    without revoking it; `revokeAll` then leaves it alive. Forgetting to call `release` is a
 *    visible bug (the saved photo blanks), not a silent leak — the failure mode points at
 *    itself.
 *
 * The browser I/O is injected, and `readBrowserObjectUrls()` returns `null` wherever the API
 * is absent. Note that this is NOT the seam that puts the test suite on the sample path:
 * jsdom's own `window.URL` has no object-URL methods, but under Vitest the global `URL` is
 * Node's, which does — minting `blob:nodedata:…`. Verified, not assumed. The capability's
 * `unavailable` state is gated on `navigator.mediaDevices` / `MediaRecorder` (both genuinely
 * undefined in the suite); working object URLs here are a convenience, letting the
 * frame-grab and recording tests exercise real minting and revocation.
 */

/** The slice of the `URL` static API this module uses — the injection seam for tests. */
export interface ObjectUrlIo {
  create(blob: Blob): string
  revoke(url: string): void
}

/** The browser's object-URL API, or `null` on any environment without it (jsdom, a hardened
 *  browser). Read at call time — never at module scope, so a test can install a stub first. */
export function readBrowserObjectUrls(): ObjectUrlIo | null {
  if (typeof URL === 'undefined') return null
  const { createObjectURL, revokeObjectURL } = URL
  if (typeof createObjectURL !== 'function' || typeof revokeObjectURL !== 'function') return null
  return {
    create: (blob) => URL.createObjectURL(blob),
    revoke: (url) => {
      URL.revokeObjectURL(url)
    },
  }
}

export interface ObjectUrlRegistry {
  /** Mint a tracked object URL for `blob`. */
  create(blob: Blob): string
  /** Revoke and forget a URL this registry created. No-op for anything else. */
  revoke(url: string): void
  /** Forget a URL WITHOUT revoking it — ownership has passed to the store. */
  release(url: string): void
  /** Revoke everything still owned (the unmount sweep). */
  revokeAll(): void
  /** How many URLs are still owned. Diagnostics + the revocation pins. */
  size(): number
  /** Whether this registry currently owns `url`. */
  owns(url: string): boolean
}

export function createObjectUrlRegistry(io: ObjectUrlIo): ObjectUrlRegistry {
  const owned = new Set<string>()

  return {
    create(blob) {
      const url = io.create(blob)
      owned.add(url)
      return url
    },
    revoke(url) {
      // Scoped deliberately: revoking a URL we did not create would blank someone else's
      // image with no error anywhere. `delete` returning false IS the guard.
      if (!owned.delete(url)) return
      io.revoke(url)
    },
    release(url) {
      owned.delete(url)
    },
    revokeAll() {
      // `forEach`, not `for…of`: the repo's tsconfig target predates downlevel Set iteration.
      owned.forEach((url) => {
        io.revoke(url)
      })
      owned.clear()
    },
    size() {
      return owned.size
    },
    owns(url) {
      return owned.has(url)
    },
  }
}

/**
 * Revoke the object URLs a stored `MediaItem` carries — the deletion path's counterpart
 * (P4.5's `deleteMedia`). Takes the URLs rather than the item so the engine's `MediaItem`
 * type never has to reach the I/O layer, and no-ops on the sample paths, which are static
 * files and must outlive every capture surface.
 */
export function revokeCapturedUrls(io: ObjectUrlIo, urls: readonly (string | undefined)[]): void {
  for (const url of urls) {
    if (url !== undefined && url.startsWith('blob:')) io.revoke(url)
  }
}
