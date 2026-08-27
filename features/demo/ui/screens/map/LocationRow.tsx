'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { glassCard } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'
import { STATUS_ACCENT, STATUS_SEVERITY, severityTone } from '@/features/demo/ui/tokens/status'

export interface LocationRowProps {
  item: SheetItem
  /**
   * The list's current selection. It carries NO paint — see `rowBtn` — and reaches the DOM as
   * `data-selected` only, mirroring the phone's `accessibilityState={{ selected }}`
   * (`LocationRow.tsx:79`), which likewise survives the removal of the selected treatment.
   */
  selected: boolean
  onSelect(id: string): void
}

/**
 * The row shell. `glassCard` IS the recipe the phone reads here — its own docblock at `:5-7`:
 * "Renders as a glass card: `GlassColors[scheme].card` gradient, 1px border, top highlight edge
 * and `Layout.shadow.card` -- the same recipe `Card.tsx` paints, read from the same tokens rather
 * than from a hand-derived copy of them." (U5.1's R2 established the CARD tier here against matrix
 * A84's `nestedCard` reading; the nested tier belongs to `LocationDetailCard`'s info cards.)
 *
 * ## Selection paints NOTHING, and that is `7df5148b` (D4)
 *
 * The row used to swap its fill for a `${color}14` wash and its border for `${color}50` — the
 * pre-D1(a) treatment whose removal the phone records at `LocationRow.tsx:13-18`, then `7df5148b`
 * removed the 4px accent that replaced it and left no selected treatment at all
 * (`:51-56`): *"The border is UNIFORM. ... Selection is not indicated here at all now: tapping a
 * row opens that location's own sheet, which is the signal."*
 *
 * The demo agrees twice over. `MapScreen` writes `selectedId` and `sheetMode` only in pairs —
 * `(id, 'detail')` at `:264-265`, `(null, 'list')` at `:197-198` and `:272-273` — so
 * `selectedId !== null` implies `contentMode === 'detail'`, and the list that would render a
 * selected row is unmounted whenever one exists. The selected paint was unreachable.
 *
 * THE LIT-EDGE RULE: this object spreads the fragment and writes no `border` / `borderColor` /
 * `borderTop` key afterwards, so the highlight edge cannot be erased.
 */
const rowBtn = {
  ...glassCard,
  display: 'flex',
  alignItems: 'center',
  // phone `styles.statusDot.marginRight` = `Layout.spacing.md`; the web spends a flex gap.
  gap: spacing.md,
  width: '100%',
  textAlign: 'left',
  // phone `styles.card` — `paddingVertical`/`paddingHorizontal: Layout.spacing.md`. Was `13px 14px`.
  padding: spacing.md,
  // The phone's `styles.pressable.marginVertical: xs` (4) puts 8pt between rows, because RN never
  // collapses sibling margins. CSS does, so the same rhythm is spelled as one bottom margin; the
  // 16pt horizontal inset moved to `LocationList`'s padding, where `width: 100%` cannot overflow it.
  margin: `0 0 ${spacing.sm}px`,
  cursor: 'pointer',
} as const satisfies CSSProperties

/**
 * `STATUS_ACCENT`, not `MAP_PIN_COLORS`. The phone's reason, verbatim (`LocationRow.tsx:116-121`):
 * this dot renders inside the theme-aware sheet rather than onto a satellite tile, and it is the
 * sole carrier of its information — the row has no status text. The pin family measured
 * `started` 1.26:1 light, `complete` 1.84:1 light and `working` **2.87:1 DARK** against WCAG
 * 1.4.11's 3:1. (DEF-UI-017 — the bug "reported by nobody".)
 *
 * The glow is the phone's `shadowOpacity: 0.6` / `shadowRadius: 4` (`:307-315`), through
 * `withAlpha` rather than the `${color}88` hex-alpha suffix the demo used to append.
 */
const statusDot = (color: string): CSSProperties => ({
  width: 10,
  height: 10,
  borderRadius: radius.full,
  background: color,
  flex: '0 0 auto',
  boxShadow: `0 0 4px ${withAlpha(color, 0.6)}`,
})

const name = { fontSize: 14, fontWeight: 700, letterSpacing: -0.1, color: colors.text } as const satisfies CSSProperties
// `textSecondary`, not `textTertiary`: phone `:155` and `:163` paint both sublines from the same
// token, and the tertiary one is a documented sub-AA ceiling (M2b).
const biz = { fontSize: 12, color: colors.textSecondary, fontStyle: 'italic', marginTop: 1 } as const satisfies CSSProperties
const addr = { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xxs } as const satisfies CSSProperties
// phone `styles.chevron` `:354-359` — `fontSize.xl`, `fontWeight.normal` (400; the demo's 300 was
// the codebase's only 300, A47), `lineHeight: 22` "geometric: centres the glyph in its row".
const chevron = {
  fontSize: 20,
  color: colors.textSecondary,
  fontWeight: 400,
  lineHeight: '22px',
  marginLeft: 'auto',
  flex: '0 0 auto',
} as const satisfies CSSProperties

/**
 * The incident type chip — phone `styles.typeChip` `:338-349` painted from the D8(a) pair at
 * `:235-236`. It used to be bare `PIN_COLORS` TEXT, "which measured 3.19:1 on the light glass
 * card" (`:331-336`). `inline-block` so the fill hugs the word, which is what the phone's
 * `alignSelf: 'flex-start'` buys inside its flex column.
 */
const incidentTone = severityTone(STATUS_SEVERITY.incident)
const chip = {
  display: 'inline-block',
  fontSize: 12,
  fontWeight: 700,
  background: incidentTone.background,
  color: incidentTone.color,
  textTransform: 'uppercase',
  letterSpacing: 0.4,
  marginTop: spacing.xxs,
  padding: `1px ${spacing.xs}px`,
  borderRadius: radius.sm,
} as const satisfies CSSProperties

/** A glass row in the location list — location variant (status dot + name + business + address) or
 *  incident variant (red dot + headline + "Incident" chip). Pressable. */
export function LocationRow({ item, selected, onSelect }: LocationRowProps) {
  if (item.kind === 'incident') {
    const headline = item.displayName || item.caseNumber
    return (
      <button type="button" data-testid="location-row" data-selected={selected} onClick={() => onSelect(item.id)} style={rowBtn}>
        <span data-testid="location-row-status-dot" style={statusDot(colors[STATUS_ACCENT.incident])} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={name}>{headline}</div>
          <div>
            <span style={chip}>Incident</span>
          </div>
          {item.address && <div style={addr}>{item.address}</div>}
        </div>
        <span style={chevron}>{'›'}</span>
      </button>
    )
  }
  const dotColor = colors[STATUS_ACCENT[item.status]]
  return (
    <button type="button" data-testid="location-row" data-selected={selected} onClick={() => onSelect(item.id)} style={rowBtn}>
      <span data-testid="location-row-status-dot" style={statusDot(dotColor)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={name}>{item.locationName}</div>
        {item.businessName && <div style={biz}>{item.businessName}</div>}
        {item.address && <div style={addr}>{item.address}</div>}
      </div>
      <span style={chevron}>{'›'}</span>
    </button>
  )
}
