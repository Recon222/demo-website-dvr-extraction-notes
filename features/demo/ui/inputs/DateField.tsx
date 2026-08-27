'use client'

import { useState } from 'react'
import { formatDate, mergeDate, nowParts, parsePartsLoose } from '@/features/demo/engine/logic/datetime-parts'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'
import { clock } from '@/features/demo/ui/inputs/clock'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'
import { Calendar } from '@/features/demo/ui/inputs/Calendar'

export interface DateFieldProps {
  value: string
  onChange(value: string): void
  /**
   * What an unset date reads as. Defaults to `formatDate`'s em-dash — every wizard caller's
   * treatment, unchanged.
   *
   * The User Profile editor (P7.2) passes the phone's own literal, `No date`: its two career-start
   * fields are `mode="date"` pickers, and `DateTimePickerInput.getFullFormattedValue()`
   * special-cases that mode to return `"No date"`, short-circuiting the component's `placeholder`
   * prop entirely (`src/components/form/DateTimePicker.tsx:141-152` — a fact-check correction in
   * ui-mapping 12). A prop rather than a new default so the eight existing call sites keep their
   * em-dash.
   */
  emptyLabel?: string
}

const ZERO = { y: 0, mo: 0, d: 0 }

/**
 * The "DATE" button + bottom-sheet calendar. Editing the date preserves the existing time
 * (via mergeDate). Opening with an empty value auto-populates today (phone behavior). The
 * clock is read only on open (never at render), so the closed field is deterministic.
 */
export function DateField({ value, onChange, emptyLabel }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<{ y: number; mo: number }>(() => {
    const p = parsePartsLoose(value)
    return p ? { y: p.y, mo: p.mo } : { y: 2000, mo: 1 }
  })
  const [today, setToday] = useState<{ y: number; mo: number; d: number }>(ZERO)

  const parts = parsePartsLoose(value)

  const handleOpen = () => {
    const t = nowParts(clock.now)
    setToday(t)
    const seed = parsePartsLoose(value) ?? t
    setView({ y: seed.y, mo: seed.mo })
    if (!value) onChange(mergeDate('', { y: t.y, mo: t.mo, d: t.d }, clock.now))
    setOpen(true)
  }

  const prevMonth = () => setView((v) => (v.mo === 1 ? { y: v.y - 1, mo: 12 } : { y: v.y, mo: v.mo - 1 }))
  const nextMonth = () => setView((v) => (v.mo === 12 ? { y: v.y + 1, mo: 1 } : { y: v.y, mo: v.mo + 1 }))
  const selectDay = (d: number) => onChange(mergeDate(value, { y: view.y, mo: view.mo, d }, clock.now))

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Set date"
        style={{
          width: '100%',
          textAlign: 'left',
          // `datetimeButton`, phone `DateTimePicker.tsx:490-498`: `borderRadius.md`,
          // `spacing.md` horizontal / `spacing.sm` vertical, and `touchTarget.min` — NOT the
          // demo's own 48. These two sit in a row beside a `fieldInputStyle()` field, which
          // U2.1 put at 44.
          borderRadius: radius.md,
          border: `1px solid ${T.border}`,
          background: T.bg,
          padding: `${spacing.sm}px ${spacing.md}px`,
          minHeight: touchTarget.min,
          cursor: 'pointer',
        }}
      >
        {/* `buttonLabel` / `buttonValue`, phone `:499-508` — `fontSize.xs` over
            `fontSize.base`. */}
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: T.textFaint, marginBottom: 2 }}>Date</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: parts ? T.text : T.textFaint }}>
          {parts || emptyLabel === undefined ? formatDate(parts) : emptyLabel}
        </div>
      </button>

      {open && (
        <PickerSheet
          title="Select Date"
          onClose={() => setOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ width: '100%', ...buttonStyle() }}
            >
              Done
            </button>
          }
        >
          <Calendar
            viewYear={view.y}
            viewMonth={view.mo}
            selected={parts}
            today={today}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onSelectDay={selectDay}
          />
        </PickerSheet>
      )}
    </>
  )
}
