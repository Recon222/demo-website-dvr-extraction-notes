import type { MediaKind } from '@/lib/demo/types'

/**
 * Immutably set a dot-path on a (possibly nested) object, cloning every node along the
 * path so React/Zustand subscribers see new references. Missing intermediate objects are
 * created, so a stray path is a tolerant no-op rather than a throw (the director relies on
 * this for resilience).
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
  cur[keys[keys.length - 1]] = value
  return root as T
}

/** Map a singular media kind to its bucket on `LocationForm.media`. */
export function mediaBucket(kind: MediaKind): 'photos' | 'videos' | 'audios' {
  return kind === 'photo' ? 'photos' : kind === 'video' ? 'videos' : 'audios'
}
