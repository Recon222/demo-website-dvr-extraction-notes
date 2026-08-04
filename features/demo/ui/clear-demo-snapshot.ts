'use client'

import { clearSnapshot, type StorageLike } from '@/features/demo/engine/store/persistence'

/**
 * Self-contained "wipe this tab's demo session" for app/-level consumers — the /demo
 * route error net's "Start fresh" control (review R-24). Exported through the feature
 * barrel so `app/` never deep-imports engine paths or hardcodes the snapshot key.
 *
 * The `window.sessionStorage` PROPERTY ACCESS itself can throw (Safari private mode,
 * storage-blocked embeds) — same guard as DemoExperience's `sessionStorageOrNull`;
 * a null/blocked storage makes this a safe no-op.
 */
export function clearDemoSnapshot(): void {
  let storage: StorageLike | null = null
  try {
    storage = typeof window === 'undefined' ? null : window.sessionStorage
  } catch {
    storage = null
  }
  clearSnapshot(storage)
}
