import { MEDIA_BUCKET, type MediaBuckets } from '@/features/demo/engine/logic/media/library'
import type { MediaKind, ScopeEntry } from '@/features/demo/engine/types'

/**
 * Immutably set a dot-path on a (possibly nested) object, cloning every node along the path
 * so React/Zustand subscribers see new references.
 *
 * Note: a stray path is NOT a no-op — it *writes to the new key* (and creates any missing
 * intermediates). So in development we warn when the leaf key was previously absent, which
 * catches typos like `form.scpoes` before they silently orphan forensic form data. The real
 * safety net for a *throwing* step is the runner's catch, not this function.
 */
export function setPath<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.')
  const root = (Array.isArray(obj) ? [...(obj as unknown[])] : { ...(obj as object) }) as Record<
    string,
    unknown
  >
  let cur = root
  for (let i = 0; i < keys.length - 1; i++) {
    const k = keys[i]
    const next = cur[k]
    cur[k] = Array.isArray(next) ? [...next] : { ...((next as object) ?? {}) }
    cur = cur[k] as Record<string, unknown>
  }
  const leaf = keys[keys.length - 1]
  if (process.env.NODE_ENV !== 'production' && !(leaf in cur)) {
    console.warn(`[demo] setPath created a previously-absent key "${path}" — possible typo`)
  }
  cur[leaf] = value
  return root as T
}

/**
 * Clone requested scopes for a duplicated location, minting fresh ids (P3.5 — port of the
 * phone's `cloneScopesWithNewIds`, `utils/duplicate-location.ts:21-29`).
 *
 * Copies exactly `startDateTime` / `endDateTime` / `isActualTime`. `cameras` is deliberately
 * blanked, not copied: channel labels are DVR-specific and the duplicate is a different DVR.
 * Nothing derived travels either — no corrected/adjusted times, no extracted scopes — because
 * those come from a time offset the new location has not measured yet.
 *
 * `nextId` is injected (the store's monotonic counter) — the engine mints no ids of its own,
 * and there is no `Math.random()`/`crypto.randomUUID()` anywhere in the demo.
 */
export function cloneScopesWithNewIds(
  scopes: readonly ScopeEntry[],
  nextId: () => string,
): ScopeEntry[] {
  return scopes.map((scope) => ({
    id: nextId(),
    startDateTime: scope.startDateTime,
    endDateTime: scope.endDateTime,
    isActualTime: scope.isActualTime,
    cameras: '',
  }))
}

/** Map a singular media kind to its bucket on `LocationForm.media`.
 *
 *  Delegates to the ONE mapping (R-26). This used to be an independent ternary, and the media
 *  library's tab registry carried a second spelling of the same pairing — so the two could
 *  disagree, and the shape that let them disagree (`kind` and `bucket` side by side, unlinked)
 *  compiled `kind: 'audio', bucket: 'videos'` without complaint. */
export function mediaBucket(kind: MediaKind): keyof MediaBuckets {
  return MEDIA_BUCKET[kind]
}

/**
 * The highest numeric suffix of any `id` string anywhere in a state snapshot ('c12' → 12,
 * 'ui-s7' → 7). Rehydration (P0.4) seeds both monotonic id counters — the store's `seq` and
 * the UI's `uiSeq` — ABOVE this, so ids minted after a refresh can never collide with
 * rehydrated ones (duplicate React keys, broken lookups). Walks every object/array; only
 * string props literally named `id` count. Returns 0 when none found (the empty boot).
 */
export function maxIdSeq(value: unknown): number {
  let max = 0
  const walk = (v: unknown): void => {
    if (Array.isArray(v)) {
      v.forEach(walk)
      return
    }
    if (v !== null && typeof v === 'object') {
      for (const [key, val] of Object.entries(v)) {
        if (key === 'id' && typeof val === 'string') {
          const m = /(\d+)$/.exec(val)
          if (m) max = Math.max(max, Number(m[1]))
        } else {
          walk(val)
        }
      }
    }
  }
  walk(value)
  return max
}
