/**
 * Pure date/time parts math for the demo's custom pickers.
 *
 * The store holds wall-clock strings in the canonical form `"YYYY-MM-DD HH:MM:SS"`
 * (seconds always present, milliseconds never). These helpers convert that string to
 * and from a flat `DateParts` shape the calendar + time-wheel work with, and merge a
 * date- or time-only edit back into the full string while preserving the other half.
 *
 * Framework-free and deterministic: the ONLY clock read is inside `nowParts`, and even
 * that is via an injected `now()` so callers (and tests) control time. No argless
 * `new Date()`, `Date.now()`, or `Math.random()` — matching the demo's SSR/determinism rule.
 */

export interface DateParts {
  y: number
  /** 1-12 (NOT zero-indexed). */
  mo: number
  d: number
  h: number
  mi: number
  s: number
}

/** Days per 1-12 month, leap-aware. Pure (no Date). */
export function daysInMonth(y: number, mo: number): number {
  const feb = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0 ? 29 : 28
  const table = [31, feb, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  return table[mo - 1] ?? 31
}

/** Zero-pad to 2 digits. */
export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

/** Clamp a day to a valid day-of-month (1..daysInMonth). */
export function clampDay(y: number, mo: number, d: number): number {
  return Math.min(Math.max(1, d), daysInMonth(y, mo))
}

const STORED_RE = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/

/**
 * Parse `"YYYY-MM-DD HH:MM:SS"` (or with a `T` separator; seconds optional) into parts.
 * Returns `null` for empty or malformed input — never throws. Warns in dev on a
 * non-empty value that fails to parse.
 */
export function parsePartsLoose(value: string): DateParts | null {
  if (!value) return null
  const m = STORED_RE.exec(value.trim())
  if (m) {
    const p: DateParts = {
      y: Number(m[1]),
      mo: Number(m[2]),
      d: Number(m[3]),
      h: Number(m[4]),
      mi: Number(m[5]),
      s: m[6] ? Number(m[6]) : 0,
    }
    // The regex only validates digit COUNT — range-check the values too. An out-of-range
    // (e.g. month 13) value is treated as malformed → null, so a bad stored string can never
    // silently half-replace the untouched field via mergeDate/mergeTime. (Day is a generic
    // 1..31; formatStored() clamps it to the actual month length.)
    if (p.mo >= 1 && p.mo <= 12 && p.d >= 1 && p.d <= 31 && p.h <= 23 && p.mi <= 59 && p.s <= 59) {
      return p
    }
  }
  if (process.env.NODE_ENV !== 'production') {
    console.warn(`[demo] datetime-parts: could not parse "${value}"`)
  }
  return null
}

/** Parts → canonical `"YYYY-MM-DD HH:MM:SS"` (day clamped to the month length). */
export function formatStored(p: DateParts): string {
  const d = clampDay(p.y, p.mo, p.d)
  return `${p.y}-${pad2(p.mo)}-${pad2(d)} ${pad2(p.h)}:${pad2(p.mi)}:${pad2(p.s)}`
}

/** `"YYYY-MM-DD"` for display, or an em-dash when there is no value. */
export function formatDate(p: DateParts | null): string {
  return p ? `${p.y}-${pad2(p.mo)}-${pad2(p.d)}` : '—'
}

/** `"HH:MM:SS"` for display, or an em-dash when there is no value. */
export function formatTime(p: DateParts | null): string {
  return p ? `${pad2(p.h)}:${pad2(p.mi)}:${pad2(p.s)}` : '—'
}

/** Current wall-clock as parts, read through the injected clock. */
export function nowParts(now: () => Date): DateParts {
  const d = now()
  return {
    y: d.getFullYear(),
    mo: d.getMonth() + 1,
    d: d.getDate(),
    h: d.getHours(),
    mi: d.getMinutes(),
    s: d.getSeconds(),
  }
}

/**
 * Set the date portion (y/mo/d, day clamped to the target month) while preserving the
 * existing time. When `value` is empty, the time is seeded from `now()`.
 */
export function mergeDate(
  value: string,
  date: { y: number; mo: number; d: number },
  now: () => Date,
): string {
  const base = parsePartsLoose(value) ?? nowParts(now)
  return formatStored({ ...base, y: date.y, mo: date.mo, d: date.d })
}

/**
 * Set the time portion (h/mi/s, milliseconds dropped) while preserving the existing
 * date. When `value` is empty, the date is seeded from `now()`.
 */
export function mergeTime(
  value: string,
  time: { h: number; mi: number; s: number },
  now: () => Date,
): string {
  const base = parsePartsLoose(value) ?? nowParts(now)
  return formatStored({ ...base, h: time.h, mi: time.mi, s: time.s })
}
