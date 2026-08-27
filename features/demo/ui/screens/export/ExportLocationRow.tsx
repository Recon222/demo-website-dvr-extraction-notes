'use client'

import type { CSSProperties } from 'react'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'
import type { CaseLocationRow } from '@/features/demo/ui/screens/screenData'

/**
 * One selectable location inside an expanded export card — port of the phone's
 * `ExportLocationRow` (`src/features/case-management/export-hub/components/ExportLocationRow.tsx`).
 *
 * A11y structure is load-bearing and lifted as-is (phone :5-12): the ROW is the SINGLE
 * accessible control — `role="checkbox"`, `aria-checked`, label `Select {locationName}`
 * (phone :54-57) — and the circular indicator beside it is decorative, so a reader never
 * announces two controls for one row and every press routes through the row.
 *
 * DEMO DEVIATION: no haptic. The phone fires `Haptics.impactAsync(Light)` on every toggle
 * (:41); the web has no equivalent that isn't a lie about the device.
 */

export interface ExportLocationRowProps {
  row: CaseLocationRow
  selected: boolean
  /** True during an export run — the row must not toggle (phone :28-29). */
  disabled: boolean
  onToggle(locationId: string): void
}

const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: 44,
  padding: '8px 0',
  background: 'transparent',
  border: 'none',
  // The phone's hairline separator (:105-106). A row is a ledger line, not a tile.
  borderBottom: '1px solid rgba(30,58,95,0.6)',
  textAlign: 'left',
  color: 'inherit',
}

/**
 * 22px circle, 2px ring — the phone's indicator geometry (`ExportLocationRow.tsx:121-136`).
 *
 * NOT `CheckboxBox` (A75), deliberately: the phone hand-rolls this mark too rather than
 * reaching for its shared `Checkbox`, so a row mark and a checkbox are two controls in both
 * apps. `ui/controls/__tests__/choice-controls.test.tsx` exempts this file by name for exactly
 * that reason. U2.4 moves its four literals onto tokens and leaves the geometry alone;
 * `marginRight` is the phone's `indicatorSlot` (`:118-120`, `spacing.base`), which the demo
 * had at 10.
 */
const indicatorBase: CSSProperties = {
  flex: '0 0 auto',
  width: 22,
  height: 22,
  borderRadius: 11,
  borderWidth: 2,
  borderStyle: 'solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  marginRight: spacing.base,
  fontSize: 13,
  fontWeight: 700,
  lineHeight: '16px',
}

export function ExportLocationRow({ row, selected, disabled, onToggle }: ExportLocationRowProps) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={selected}
      aria-label={`Select ${row.locationName}`}
      disabled={disabled}
      onClick={() => onToggle(row.id)}
      style={{ ...rowStyle, cursor: disabled ? 'default' : 'pointer', opacity: disabled ? 0.5 : 1 }}
    >
      <span
        aria-hidden
        data-row-indicator
        style={{
          ...indicatorBase,
          // `indicatorOn` / `indicatorOff` / `indicatorMark` (`:129-142`). `onPrimary`, not a
          // raw white: the mark sits on the `primary` fill, and `textInverse` is navy in dark,
          // so neither existing default was correct here (the phone's own D7 note).
          background: selected ? colors.primary : 'transparent',
          borderColor: selected ? colors.primary : colors.textTertiary,
          color: colors.onPrimary,
        }}
      >
        {selected ? '✓' : null}
      </span>
      <span style={{ flex: 1, marginRight: 8, minWidth: 0 }}>
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#f0f4f8' }}>{row.locationName}</span>
        {row.address && (
          <span
            style={{
              display: 'block',
              fontSize: 12,
              color: '#99badd',
              marginTop: 2,
              // The phone caps the address at one line (`numberOfLines={1}`, :77).
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {row.address}
          </span>
        )}
      </span>
      <span style={{ flex: '0 0 auto', padding: '3px 8px', borderRadius: 12, background: row.status.bg }}>
        <span style={{ fontSize: 10, fontWeight: 600, color: row.status.color }}>{row.status.label}</span>
      </span>
    </button>
  )
}
