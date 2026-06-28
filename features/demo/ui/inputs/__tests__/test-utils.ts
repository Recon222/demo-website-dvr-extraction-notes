import type { DateParts } from '@/features/demo/engine/logic/datetime-parts'

/** Deterministic clock: 2025-03-08 12:05:30 (local). Pass as the `now` prop in picker tests. */
export const FIXED_NOW = (): Date => new Date(2025, 2, 8, 12, 5, 30)

/** The canonical string `FIXED_NOW` formats to. */
export const fixedNowString = '2025-03-08 12:05:30'

/** A full DateParts fixture matching FIXED_NOW, overridable. */
export function makeParts(o: Partial<DateParts> = {}): DateParts {
  return { y: 2025, mo: 3, d: 8, h: 12, mi: 5, s: 30, ...o }
}
