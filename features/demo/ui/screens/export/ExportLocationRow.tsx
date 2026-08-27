'use client'

import type { CSSProperties } from 'react'
import type { CaseLocationRow } from '@/features/demo/ui/screens/screenData'
import { statusBadgeStyle } from '@/features/demo/ui/tokens/status'

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

/** 22px circle, 2px ring — the phone's indicator geometry (:117-123). */
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
  marginRight: 10,
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
        style={{
          ...indicatorBase,
          background: selected ? '#2B8CC1' : 'transparent',
          borderColor: selected ? '#2B8CC1' : '#7a9fc4',
          color: '#fff',
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
      {/* `small`, matching phone `export-hub/ExportLocationRow.tsx:87`. `flex: '0 0 auto'` is
          the demo's own row layout and survives the recipe. */}
      <span style={{ flex: '0 0 auto', ...statusBadgeStyle(row.status, 'small') }}>{row.status.label}</span>
    </button>
  )
}
