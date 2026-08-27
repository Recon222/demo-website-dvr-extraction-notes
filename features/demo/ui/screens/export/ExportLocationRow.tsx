'use client'

import type { CSSProperties } from 'react'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing, touchTarget } from '@/features/demo/ui/tokens/scale'
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
 *
 * DEMO DEVIATION: no press feedback. `styles.pressed` (`:112-114`, `opacity: 0.7`) arrives
 * through `Pressable`'s `({ pressed })` style callback, which has no inline-`CSSProperties`
 * equivalent — `:active` is a selector, and `features/demo/CLAUDE.md` puts selectors in
 * `demo.css` (globals + keyframes only) rather than in a component. The DISABLED half of the
 * same pair (`:115-117`, `opacity: 0.5`) is state, not a pseudo-class, and is ported below.
 * Proposed as a deferral in the U6.3 report — it is an app-wide gap, not this row's.
 */

export interface ExportLocationRowProps {
  row: CaseLocationRow
  selected: boolean
  /** True during an export run — the row must not toggle (phone :28-29). */
  disabled: boolean
  onToggle(locationId: string): void
}

/**
 * Phone `styles.row` (`ExportLocationRow.tsx:104-111`), value for value.
 *
 * `touchTarget.medium` (46) AND NOT `min` (44). The U6.3 plan row says
 * "`minHeight:44` becomes `touchTarget.min`" and that is a transcription error: `:107` reads
 * `minHeight: Layout.touchTarget.medium`. U2.4's report already refuted it (its RF-5) and left
 * the change to this package. The demo's bare `44` happened to equal `min`, which is what made
 * the wrong token look like a no-op rename.
 */
const rowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  width: '100%',
  minHeight: touchTarget.medium,
  // phone `:108` — `paddingVertical: Layout.spacing.sm`.
  padding: `${spacing.sm}px 0`,
  background: 'transparent',
  border: 'none',
  // The phone's hairline separator (`:109-110`): `borderBottomColor: colors.border`. The demo's
  // `rgba(30,58,95,0.6)` was a near-miss of the OLD border on TWO axes — a pre-A7 navy at an
  // alpha `borderSoft` spells 0.5 — so neither A7's re-base (which sweeps by hex, and this form
  // carries none) nor `borderSoft` itself could reach it. A row is a ledger line, not a tile, so
  // it takes the flat border and not the card tier's washed edge.
  //
  // `GLASS.border`, not a composed `1px solid ${colors.border}`: that composition IS this token,
  // and `ui/__tests__/glass-tokens.test.ts`'s banned-literal scan exists to stop the second
  // spelling of it. (Measured: it also reads raw text, so naming the hex in a COMMENT here trips
  // it too — which is why the value above is described rather than spelled.)
  borderBottom: GLASS.border,
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
      {/* phone `styles.body:146-149` — `flex: 1, marginRight: Layout.spacing.sm`. */}
      <span style={{ flex: 1, marginRight: spacing.sm, minWidth: 0 }}>
        {/* phone `styles.locationName:150-155` — `colors.text`. */}
        <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: colors.text }}>{row.locationName}</span>
        {row.address && (
          <span
            style={{
              display: 'block',
              fontSize: 12,
              // phone `styles.address:156-159` — `colors.textSecondary`.
              color: colors.textSecondary,
              // The phone spends this 2px as the NAME's `marginBottom: spacing.xxs` (`:154`);
              // the demo hangs it off the address so an addressless row has no trailing gap.
              // Same gap, one fewer conditional — kept, with the token the phone names.
              marginTop: spacing.xxs,
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
