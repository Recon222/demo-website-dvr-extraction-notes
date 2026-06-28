/**
 * Single wall-clock seam for the pickers.
 *
 * The pure helpers in engine/logic/datetime-parts take a `now: () => Date` arg; the client
 * components read it from here rather than as a React prop. (Passing it as a prop tripped
 * Next.js's TS-plugin rule 71007, which flags non-serializable function props on any
 * 'use client' component — even though the whole subtree here is client-side, so the
 * server→client serialization concern it guards doesn't actually apply.) The seam also
 * avoids prop-drilling and makes the clock spy-able in tests. Reads happen only inside event
 * handlers / on picker open, never at module or render scope — consistent with the demo's
 * existing time-capture code. Tests stub it via `vi.spyOn(clock, 'now')`.
 */
export const clock = { now: (): Date => new Date() }
