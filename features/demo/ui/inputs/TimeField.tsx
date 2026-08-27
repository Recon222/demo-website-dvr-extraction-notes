'use client'

import { useState } from 'react'
import { formatTime, mergeTime, nowParts, parsePartsLoose } from '@/features/demo/engine/logic/datetime-parts'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'
import { clock } from '@/features/demo/ui/inputs/clock'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'
import { TimeWheel } from '@/features/demo/ui/inputs/TimeWheel'

export interface TimeFieldProps {
  value: string
  onChange(value: string): void
}

type Hms = { h: number; mi: number; s: number }

/**
 * The "TIME" button + bottom-sheet HH:MM:SS wheel. Confirm writes the time back while
 * preserving the date (via mergeTime); Cancel discards. Empty value seeds the wheel from now().
 */
export function TimeField({ value, onChange }: TimeFieldProps) {
  const [open, setOpen] = useState(false)
  const [temp, setTemp] = useState<Hms>({ h: 0, mi: 0, s: 0 })

  const parts = parsePartsLoose(value)

  const handleOpen = () => {
    const p = parsePartsLoose(value) ?? nowParts(clock.now)
    setTemp({ h: p.h, mi: p.mi, s: p.s })
    setOpen(true)
  }

  const confirm = () => {
    onChange(mergeTime(value, temp, clock.now))
    setOpen(false)
  }

  const ghostBtn = { flex: 1, ...buttonStyle({ variant: 'secondary' }) } as const
  const primaryBtn = { flex: 1, ...buttonStyle() } as const

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        aria-label="Set time"
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
        <div style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', color: T.textFaint, marginBottom: 2 }}>Time</div>
        <div style={{ fontSize: 16, fontWeight: 500, color: parts ? T.text : T.textFaint }}>{formatTime(parts)}</div>
      </button>

      {open && (
        <PickerSheet
          title="Select Time"
          onClose={() => setOpen(false)}
          footer={
            <div style={{ display: 'flex', gap: 12 }}>
              <button type="button" onClick={() => setOpen(false)} style={ghostBtn}>Cancel</button>
              <button type="button" onClick={confirm} style={primaryBtn}>Confirm</button>
            </div>
          }
        >
          <TimeWheel value={temp} onChange={setTemp} />
        </PickerSheet>
      )}
    </>
  )
}
