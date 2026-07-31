import { isInDST } from '@/features/demo/engine/logic/time'

/**
 * Single host-time seam: the wall clock for the pickers, and the host zone's DST rule.
 *
 * The pure helpers in engine/logic/datetime-parts take a `now: () => Date` arg; the client
 * components read it from here rather than as a React prop. (Passing it as a prop tripped
 * Next.js's TS-plugin rule 71007, which flags non-serializable function props on any
 * 'use client' component — even though the whole subtree here is client-side, so the
 * server→client serialization concern it guards doesn't actually apply.) The seam also
 * avoids prop-drilling and makes the clock spy-able in tests. Reads happen only inside event
 * handlers / on picker open, never at module or render scope — consistent with the demo's
 * existing time-capture code. Tests stub it via `vi.spyOn(clock, 'now')`.
 *
 * `isDst` is the second half of the same seam and lives here for the same reason (review R-9).
 * The DST advisories (`engine/logic/dst-advisory.ts`) take an `isDst` parameter that defaults to
 * the engine's host-zone `isInDST`; without a seam at the bridge, the ONLY end-to-end pin of the
 * advisory wiring is whatever zone the test runner happens to be in — vacuous on a UTC runner,
 * which is the CI default. Threading it through here makes the zone injectable exactly the way
 * the wall clock already is: `vi.spyOn(clock, 'isDst')`.
 */
export const clock = {
  now: (): Date => new Date(),
  isDst: (dateTime: string): boolean => isInDST(dateTime),
}
