import type { ChapterId, LaunchableId } from '@/lib/demo/types'
import type { DemoActions, DemoState } from '@/lib/demo/store/create-store'

/**
 * The guided-tour choreography, as data. A `Beat` is one chapter's scripted sequence; the
 * runner executes it against the store. Steps reference store actions by name so the beats
 * stay declarative (no store imports), which is what lets the same screens be auto-played
 * (guided) or driven by the visitor (sandbox, director off).
 */
export type BeatStep =
  // animated typing into a field (string, char-by-char)
  | { kind: 'type'; field: string; value: string; perCharMs?: number }
  // immediate set of a field (arrays, flags, non-animated strings)
  | { kind: 'field'; field: string; value: unknown }
  // touch-pulse at a target, optionally firing a bound action
  | { kind: 'tap'; target: string; action?: keyof DemoActions; args?: unknown[] }
  // fire a store action (no pulse)
  | { kind: 'call'; action: keyof DemoActions; args?: unknown[] }
  // open a launch-only screen (OCR/media), play its beat, then close it
  | { kind: 'launch'; screen: LaunchableId }
  // patch top-level store state directly
  | { kind: 'set'; patch: Partial<DemoState> }
  // pause
  | { kind: 'wait'; ms: number }

export interface Beat {
  chapter: ChapterId | LaunchableId
  steps: BeatStep[]
}

export interface PulseEvent {
  target: string
}
