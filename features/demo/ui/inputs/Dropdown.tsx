'use client'

import { useId, useState } from 'react'
import type { CSSProperties } from 'react'
import type { PickerOption } from '@/features/demo/engine/content/form-options'
import { glassWell } from '@/features/demo/ui/glass-tokens'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { PickerSheet } from '@/features/demo/ui/inputs/PickerSheet'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'

/**
 * A73 / A53 — the picker's accent washes, routed through `withAlpha` instead of spelled.
 *
 * The phone keeps exactly these two helpers for exactly this reason (`Picker.tsx:57-64`): the
 * `token + '15'` concat idiom they replaced appended two hex digits to whatever string it was
 * handed, so it produced an unparseable colour on any rgba token and its `?:` guard could never
 * be false. Both are byte-identical to the literals the demo spelled before.
 *
 * `inkTint` is `colors.text`, not white. The demo's divider was `rgba(255,255,255,0.04)`; the
 * phone's is a 4% wash of the TEXT token, which in dark is `#f0f4f8`.
 */
const accentTint = (alpha: number) => withAlpha(colors.primary, alpha)
const inkTint = (alpha: number) => withAlpha(colors.text, alpha)

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

  /**
   * `Picker.tsx:371-380` + `:202-209`. `padding: '11px 12px'` is already the phone's
   * (`paddingVertical: 11`, `paddingHorizontal: Layout.spacing.base`) and stays.
   *
   * The selected row is LIT, not merely washed: a 18% side border and a 22% top edge. All four
   * colour longhands are written on every row — transparent when unselected — rather than being
   * added and removed with the selection. That is the lit-edge ruling's `removeSides` cell: a
   * longhand that appears and disappears across renders is the one shape that can leave a side
   * reading `currentColor`, and writing all four unconditionally makes the hazard
   * unrepresentable rather than merely avoided.
   */
  const optionRow = (o: PickerOption): CSSProperties => {
    const selected = o.value === value
    return {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      width: '100%',
      padding: '11px 12px',
      borderRadius: radius.control,
      borderStyle: 'solid',
      borderWidth: 1,
      borderRightColor: selected ? accentTint(0.18) : 'transparent',
      borderLeftColor: selected ? accentTint(0.18) : 'transparent',
      borderBottomColor: selected ? accentTint(0.18) : 'transparent',
      borderTopColor: selected ? accentTint(0.22) : 'transparent',
      background: selected ? accentTint(0.08) : 'transparent',
      cursor: 'pointer',
      marginBottom: 2,
    }
  }

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
        {/* `selectorText`, phone `Picker.tsx:337-342`: `spacing.md` on both axes and
            `fontSize.base`. The same 16/16/44 geometry U2.1 gave every text input — a picker
            trigger and a field sit in the same column and used to differ by ~10px of height. */}
        <span id={valueId} style={{ flex: 1, minWidth: 0, textAlign: 'left', padding: spacing.md, fontSize: 16, color: value ? T.text : T.textFaint, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {selectedLabel || placeholder}
        </span>
        <span
          data-indicator-zone
          style={{
            width: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeftStyle: 'solid',
            borderLeftWidth: 1,
            borderLeftColor: inkTint(0.04),
            background: accentTint(0.06),
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
          {/* A39/A59/A73 — the option list is a `recessed` well punched into the sheet, the
              same tier as the drum and the calendar next door, so all three pickers present
              one surface rather than three (phone `Picker.tsx:179-188`, `drumPanel`). The
              phone's `margin: 10` is absent because `PickerSheet`'s body already pads 16;
              `padding: 5` is the phone's (`Picker.tsx:363`). */}
          <div role="menu" aria-label={sheetName} style={{ padding: 5, ...glassWell }}>
            {opts.map((o) => {
              const selected = o.value === value
              return (
                <button key={o.value} type="button" role="menuitemradio" aria-checked={selected} onClick={() => select(o.value)} style={optionRow(o)}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span
                      data-option-dot
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: 4,
                        background: selected ? T.primary : 'transparent',
                        border: selected ? 'none' : `1.5px solid ${withAlpha(T.textMute, 0.2)}`,
                        boxShadow: selected ? `0 0 5px ${T.primary}` : 'none',
                      }}
                    />
                    {/* `fontSize.base`, and the FLAT token when unselected. Both are the phone's
                        own corrections in this file: `Picker.tsx:392-397` ("the open state
                        rendering one point smaller was drift, not design") and `:257-264`, where
                        the 70%-alpha copy of `textSecondary` measured 5.00 on this recessed drum
                        against the flat token's 9.03. */}
                    <span style={{ fontSize: 16, color: selected ? T.text : T.textMute, fontWeight: selected ? 600 : 400 }}>
                      {o.label}
                    </span>
                  </span>
                  {selected && (
                    <span
                      data-check-pill
                      style={{
                        width: 22,
                        height: 22,
                        // `checkPill`, phone `Picker.tsx:398-405` + `:287-289`. Radius `md`,
                        // and a lit top edge at 28% over the 20% sides — the pill is a glass
                        // chip, so it carries the same lip the wells and cards do.
                        borderRadius: radius.md,
                        borderStyle: 'solid',
                        borderWidth: 1,
                        borderRightColor: accentTint(0.2),
                        borderLeftColor: accentTint(0.2),
                        borderBottomColor: accentTint(0.2),
                        borderTopColor: accentTint(0.28),
                        background: accentTint(0.15),
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
