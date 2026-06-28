'use client'

import { useState } from 'react'
import { formatDate, mergeDate, nowParts, parsePartsLoose } from '@/features/demo/engine/logic/datetime-parts'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { clock } from '@/features/demo/ui/inputs/clock'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'
import { Calendar } from '@/features/demo/ui/inputs/Calendar'

export interface DateFieldProps {
  value: string
  onChange(value: string): void
}

const ZERO = { y: 0, mo: 0, d: 0 }

/**
 * The "DATE" button + bottom-sheet calendar. Editing the date preserves the existing time
 * (via mergeDate). Opening with an empty value auto-populates today (phone behavior). The
 * clock is read only on open (never at render), so the closed field is deterministic.
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const initial = parsePartsLoose(value)
  const [view, setView] = useState<{ y: number; mo: number }>(
    initial ? { y: initial.y, mo: initial.mo } : { y: 2000, mo: 1 },
  )
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
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.bg,
          padding: '8px 12px',
          minHeight: 48,
          cursor: 'pointer',
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: T.textFaint, marginBottom: 2 }}>Date</div>
        <div style={{ fontSize: 15, fontWeight: 500, color: parts ? T.text : T.textFaint }}>{formatDate(parts)}</div>
      </button>

      {open && (
        <PickerSheet
          title="Select Date"
          onClose={() => setOpen(false)}
          footer={
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ width: '100%', padding: 13, borderRadius: 10, border: 'none', background: `linear-gradient(180deg,${T.accentFrom},${T.accentTo})`, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}
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
