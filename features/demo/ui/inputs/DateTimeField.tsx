'use client'

import { DateField } from '@/features/demo/ui/inputs/DateField'
import { TimeField } from '@/features/demo/ui/inputs/TimeField'
import { T } from '@/features/demo/ui/inputs/input-theme'

export interface DateTimeFieldProps {
  label: string
  value: string
  onChange(value: string): void
}

/**
 * A labelled date+time field rendered as two side-by-side buttons ("Date" | "Time"), each
 * opening its own picker — mirroring the phone app's DateTimePickerInput `datetime` mode.
 * Both halves are bound to the same `value`/`onChange`; date edits preserve the time and
 * time edits preserve the date (the merge logic lives in DateField/TimeField).
 */
export function DateTimeField({ label, value, onChange }: DateTimeFieldProps) {
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ fontSize: 13, fontWeight: 500, color: T.textDim, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1 }}>
          <DateField value={value} onChange={onChange} />
        </div>
        <div style={{ flex: 1 }}>
          <TimeField value={value} onChange={onChange} />
        </div>
      </div>
    </div>
  )
}
