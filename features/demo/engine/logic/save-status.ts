import { assertNever } from '@/features/demo/engine/logic/assert-never'

/**
 * The demo's save-status fact, and the honest wording for it (P4.2, matrix row 80).
 *
 * The phone's drawer chrome has an `isDirty`/`saveStatus` pair behind it whose truth is "your
 * work is in SQLite on this device". The demo has no such thing: its only durable surface is
 * the per-tab sessionStorage snapshot (P0.4 / owner decision D2), which survives a refresh and
 * dies with the tab. So the STATE this module models is the persistence layer's own honesty
 * signal — the same fact `PersistenceHandle.isLive()` reports — widened just enough to say
 * WHY it is false, because "not saved" has three very different causes and only one of them
 * is a problem the visitor could act on:
 *
 * - `unavailable` — there was never anything to mirror into (no/blocked sessionStorage, or
 *   the kill switch). `isLive()` alone cannot distinguish this from "hasn't written yet".
 * - `pending`     — wired, but no write has landed. True only before the first store change.
 * - `saved`       — the last write landed, at `at`.
 * - `failed`      — a write threw; the snapshot was deliberately CLEARED, so a refresh now
 *                   boots empty (persistence.ts's documented failure policy).
 *
 * Every string below is bounded by "this tab" on purpose. Parity plan §4's honesty rule bars
 * the phone's device-persistence framing here — the demo must never imply the browser stored
 * anything beyond the tab, and must never claim a save it did not make.
 *
 * Pure: `now` is passed in (the UI reads it through `ui/inputs/clock.ts`), never read here.
 */

export type SaveState =
  | { kind: 'unavailable' }
  | { kind: 'pending' }
  | { kind: 'saved'; at: number }
  | { kind: 'failed' }

export type SaveStateKind = SaveState['kind']

/** What a status surface renders: the wording plus the state it came from (for styling/tests). */
export interface SaveStatusView {
  kind: SaveStateKind
  text: string
}

const MINUTE_MS = 60_000
const HOUR_MS = 3_600_000

/**
 * Coarse recency for a landed write. Deliberately blunt — a drawer line that ticks seconds
 * would be noise, and the demo's own writes are debounced by 250 ms anyway.
 *
 * A negative delta (a clock that moved backwards between the write and the read) clamps to
 * "just now" rather than rendering a negative age: the write demonstrably happened, and the
 * only honest thing left to say about a bad clock is the least specific one.
 */
export function formatSaveRecency(at: number, now: number): string {
  const delta = Math.max(0, now - at)
  if (delta < MINUTE_MS) return 'just now'
  if (delta < HOUR_MS) return `${Math.floor(delta / MINUTE_MS)} min ago`
  return `${Math.floor(delta / HOUR_MS)} hr ago`
}

/** The one place the demo puts save wording into words. Exhaustive over `SaveState`. */
export function describeSaveStatus(state: SaveState, now: number): SaveStatusView {
  switch (state.kind) {
    case 'saved':
      return { kind: 'saved', text: `Saved to this tab · ${formatSaveRecency(state.at, now)}` }
    case 'pending':
      return { kind: 'pending', text: 'Not saved yet · this tab stores your work as you go' }
    case 'unavailable':
      return { kind: 'unavailable', text: "Not saved · this browser isn't storing the session" }
    case 'failed':
      return { kind: 'failed', text: 'Not saved · the last save to this tab failed' }
    default:
      return assertNever(state)
  }
}
