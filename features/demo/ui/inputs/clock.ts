/**
 * Single wall-clock seam for the pickers.
 *
 * The pure helpers in engine/logic/datetime-parts take a `now: () => Date` arg; the client
 * components read it from here (not as a React prop — Next.js disallows non-serializable
 * function props on 'use client' components). Reads happen only inside event handlers / on
 * picker open, never at module or render scope — consistent with the demo's existing
 * time-capture code. Tests stub it via `vi.spyOn(clock, 'now')`.
 */
export const clock = { now: (): Date => new Date() }
