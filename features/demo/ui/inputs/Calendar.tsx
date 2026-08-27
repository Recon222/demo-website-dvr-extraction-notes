'use client'

import type { CSSProperties } from 'react'
import { daysInMonth } from '@/features/demo/engine/logic/datetime-parts'
import { glassWell } from '@/features/demo/ui/glass-tokens'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * Today's ring — `withAlpha(colors.primary, 0.5)`, phone `CalendarPicker.styles.ts:78-81`.
 *
 * The ring is the ONLY mark today's cell carries (`:203-212`: "border ring treatment, NOT
 * background fill"), so the demo's `T.primaryEdge` at 0.25 was half of the only cue. Selection
 * still wins over it — a filled cell and a ring on the same cell compete.
 */
const TODAY_RING = withAlpha(colors.primary, 0.5)

export interface CalendarProps {
  viewYear: number
  /** 1-12. */
  viewMonth: number
  selected: { y: number; mo: number; d: number } | null
  today: { y: number; mo: number; d: number }
  onPrevMonth(): void
  onNextMonth(): void
  onSelectDay(day: number): void
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]
const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']

const arrowBtn: CSSProperties = {
  width: 34,
  height: 34,
  borderRadius: 8,
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

/** Pure presentational month grid. All view + selection state lives in the parent (DateField). */
export function Calendar({ viewYear, viewMonth, selected, today, onPrevMonth, onNextMonth, onSelectDay }: CalendarProps) {
  const total = daysInMonth(viewYear, viewMonth)
  // 0 = Sunday … 6 = Saturday. Explicit args → deterministic (no argless Date).
  const firstWeekday = new Date(viewYear, viewMonth - 1, 1).getDay()
  const leading = Array.from({ length: firstWeekday })
  const days = Array.from({ length: total }, (_, i) => i + 1)

  const isSelected = (d: number) =>
    selected != null && selected.y === viewYear && selected.mo === viewMonth && selected.d === d
  const isToday = (d: number) => today.y === viewYear && today.mo === viewMonth && today.d === d

  return (
    /* A59 — the calendar GAINS a well it never had (PR #125 issue 8). Before this the grid
       painted straight onto the sheet: the header is empty and the day cells are transparent,
       so the visible ground WAS the sheet, 0.7 CIE76 dE from itself
       (phone `DateTimePicker.tsx:282-287`). Padding is the phone's `calendarWell`
       (`:521-522`, `paddingVertical: sm` / `paddingHorizontal: xs`); its `marginHorizontal: 16`
       is absent because `PickerSheet`'s body already pads 16. */
    <div style={{ userSelect: 'none', padding: `${spacing.sm}px ${spacing.xs}px`, ...glassWell }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" aria-label="Previous month" onClick={onPrevMonth} style={arrowBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        {/* 16 / 600 / `textSecondary` — phone `CalendarPicker.styles.ts:69-76`. The flat token
            and not `T.textDim`: the phone deleted its own third muted tone here for the same
            reason ("an alpha-dimmed `colors.link`, a third muted tone in a file that already
            had one"). */}
        <div style={{ fontSize: 16, fontWeight: 600, color: T.textMute }}>
          {MONTHS[viewMonth - 1]} {viewYear}
        </div>
        <button type="button" aria-label="Next month" onClick={onNextMonth} style={arrowBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6" /></svg>
        </button>
      </div>

      {/* Weekday row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', marginBottom: 4 }}>
        {WEEKDAYS.map((w) => (
          <div key={w} style={{ textAlign: 'center', fontSize: 11, color: T.textFaint, paddingBottom: 4 }}>{w}</div>
        ))}
      </div>

      {/* Day grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', rowGap: 3 }}>
        {leading.map((_, i) => (
          <div key={`b${i}`} data-blank />
        ))}
        {days.map((d) => {
          const sel = isSelected(d)
          const tod = isToday(d) && !sel
          return (
            <div key={d} style={{ display: 'flex', justifyContent: 'center' }}>
              <button
                type="button"
                data-cell="day"
                aria-pressed={sel}
                aria-current={isToday(d) ? 'date' : undefined}
                onClick={() => onSelectDay(d)}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  border: tod ? `1.5px solid ${TODAY_RING}` : '1.5px solid transparent',
                  // A59/A73 (§C.2, 3.73 -> 5.80). `primaryDark` + `onPrimary`, not the flat
                  // mid-tone `primary` + a raw white: a date numeral is normal-size text with
                  // no AA-large relief, and `onPrimary` on `primary` measures 3.73:1
                  // (phone `CalendarPicker.styles.ts:62-67`, `:171-179`; DEF-UI-001).
                  background: sel ? colors.primaryDark : 'transparent',
                  color: sel ? colors.onPrimary : T.text,
                  fontSize: 14,
                  fontWeight: sel ? 700 : 500,
                  cursor: 'pointer',
                  fontVariantNumeric: 'tabular-nums',
                }}
              >
                {d}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
