'use client'

import type { CSSProperties } from 'react'
import { daysInMonth } from '@/features/demo/engine/logic/datetime-parts'
import { T } from '@/features/demo/ui/inputs/input-theme'

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
    <div style={{ userSelect: 'none' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button type="button" aria-label="Previous month" onClick={onPrevMonth} style={arrowBtn}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
        </button>
        <div style={{ fontSize: 16, fontWeight: 600, color: T.textDim }}>
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
                  border: tod ? `1.5px solid ${T.primaryEdge}` : '1.5px solid transparent',
                  background: sel ? T.primary : 'transparent',
                  color: sel ? '#fff' : T.text,
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
