import { vi } from 'vitest'
import type { DateParts } from '@/features/demo/engine/logic/datetime-parts'
import { clock } from '@/features/demo/ui/inputs/clock'

/** The fixed instant the picker tests run at: 2025-03-08 12:05:30 (local). */
export const FIXED_DATE = (): Date => new Date(2025, 2, 8, 12, 5, 30)

/** Deterministic clock as a plain function (for the pure datetime-parts tests). */
export const FIXED_NOW = FIXED_DATE

/** The canonical string FIXED_NOW formats to. */
export const fixedNowString = '2025-03-08 12:05:30'

/** Pin the picker clock seam to FIXED_DATE for a component test. Returns the spy. */
export function stubClock(date: () => Date = FIXED_DATE) {
  return vi.spyOn(clock, 'now').mockImplementation(date)
}

/** A full DateParts fixture matching FIXED_NOW, overridable. */
export function makeParts(o: Partial<DateParts> = {}): DateParts {
  return { y: 2025, mo: 3, d: 8, h: 12, mi: 5, s: 30, ...o }
}
