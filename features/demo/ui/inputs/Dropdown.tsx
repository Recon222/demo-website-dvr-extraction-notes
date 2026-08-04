'use client'

import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PickerOption } from '@/features/demo/engine/content/form-options'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'

export interface DropdownProps {
  label?: string
  value: string
  onChange(value: string): void
  /** Option list: plain strings (label === value) or `{ label, value }` pairs
   *  (e.g. the phone-lifted Resolution/FPS lists, where '1920x1080' displays as
   *  '1920x1080 (1080p)'). */
  options: ReadonlyArray<string | PickerOption>
  placeholder?: string
  /**
   * Names the bottom sheet and its menu WITHOUT rendering the visible label line (R-9).
   *
   * The settings panes deliberately omit `label` — phone parity, since every phone settings
   * `Picker` leaves its own `label` prop unset and renders the label as a separate line above.
   * `PaneGroup`'s `role="group"` restores the TRIGGER's context, but a group boundary cannot
   * reach the sheet that opens on top of it: both the dialog and the menu collapsed to the
   * placeholder literal, so three pickers in one scroll all announced "Select an option,
   * dialog" with nothing identifying which setting was being changed.
   *
   * `label` still wins when present — the wizard callers are unaffected.
   */
  a11yLabel?: string
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
  a11yLabel,
}: DropdownProps) {
  /** Visible label first, then the invisible one, then the historic literal. */
  const sheetName = label || a11yLabel || 'Select an option'
  const [open, setOpen] = useState(false)
  // Accessible name = label + current selection (review R-10): an aria-label would
  // override the trigger's text content and hide the selection — including the
  // load-bearing "Other (Custom)" state — from assistive tech (WCAG 4.1.2).
  const uid = useId()
  const labelId = `${uid}-label`
  const valueId = `${uid}-value`

  const opts: PickerOption[] = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o))
  // Selected display mirrors the phone's Picker (label lookup). An unknown non-empty value
  // (unreachable via the screens, which route non-standard values through custom mode)
  // degrades to showing the raw value rather than pretending nothing is selected.
  const selectedLabel = opts.find((o) => o.value === value)?.label ?? value

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const optionRow = (o: PickerOption): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '11px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: o.value === value ? 'rgba(43,140,193,0.08)' : 'transparent',
    cursor: 'pointer',
    marginBottom: 2,
  })

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div id={labelId} style={{ fontSize: 13, fontWeight: 500, color: T.textDim, marginBottom: 6 }}>{label}</div>
      )}

      {/* Selector */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-labelledby={label ? `${labelId} ${valueId}` : valueId}
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
        <span id={valueId} style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: '11px 12px', fontSize: 14, color: value ? T.text : T.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedLabel || placeholder}
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
        <PickerSheet title={sheetName} onClose={() => setOpen(false)}>
          <div role="menu" aria-label={sheetName}>
            {opts.map((o) => {
              const selected = o.value === value
              return (
                <button key={o.value} type="button" role="menuitemradio" aria-checked={selected} onClick={() => select(o.value)} style={optionRow(o)}>
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
                      {o.label}
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
