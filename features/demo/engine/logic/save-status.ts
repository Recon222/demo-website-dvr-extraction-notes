
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
