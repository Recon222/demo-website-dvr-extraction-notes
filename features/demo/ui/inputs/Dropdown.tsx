'use client'

import { useState } from 'react'
import type { CSSProperties } from 'react'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'

export interface DropdownProps {
  label?: string
  value: string
  onChange(value: string): void
  /** Option list. The demo passes `string[]` (label === value). */
  options: string[]
  placeholder?: string
}

/**
 * Custom dropdown matching the phone app's `Picker`: a selector pill with a chevron in a
 * right "indicator zone", opening a slide-up bottom sheet (shared PickerSheet — same chrome
 * as the date/time pickers) with the option list (glowing dot + checkmark on the selected
 * row). Replaces the native `<select>`. Presentational — value in, onChange out.
 */
export function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
}: DropdownProps) {
  const [open, setOpen] = useState(false)

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const optionRow = (o: string): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '11px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: o === value ? 'rgba(43,140,193,0.08)' : 'transparent',
    cursor: 'pointer',
    marginBottom: 2,
  })

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 500, color: T.textDim, marginBottom: 6 }}>{label}</div>
      )}

      {/* Selector */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label || placeholder}
        aria-haspopup="menu"
        aria-expanded={open}
        style={{
          display: 'flex',
          alignItems: 'stretch',
          width: '100%',
          minHeight: 44,
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.bg,
          overflow: 'hidden',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '11px 12px', fontSize: 14, color: value ? T.text : T.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {value || placeholder}
        </span>
        <span
          style={{
            width: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: `1px solid rgba(255,255,255,0.04)`,
            background: 'rgba(43,140,193,0.06)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* Bottom sheet (shared chrome with the date/time pickers) */}
      {open && (
        <PickerSheet title={label || 'Select an option'} onClose={() => setOpen(false)}>
          <div role="menu" aria-label={label || 'Select an option'}>
            {options.map((o) => {
              const selected = o === value
              return (
                <button key={o} type="button" role="menuitemradio" aria-checked={selected} onClick={() => select(o)} style={optionRow(o)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: selected ? T.primary : 'transparent',
                        border: selected ? 'none' : '1.5px solid rgba(153,186,221,0.2)',
                        boxShadow: selected ? `0 0 5px ${T.primary}` : 'none',
                      }}
                    />
                    <span style={{ fontSize: 13, color: selected ? T.text : 'rgba(153,186,221,0.7)', fontWeight: selected ? 600 : 400 }}>
                      {o}
                    </span>
                  </span>
                  {selected && (
                    <span
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: 6,
                        border: '1px solid rgba(43,140,193,0.2)',
                        background: 'rgba(43,140,193,0.15)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        </PickerSheet>
      )}
    </div>
  )
}
