'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { TAB_BAR_HEIGHT } from '@/features/demo/ui/controls/TabBar'
import { glassHeaderBar } from '@/features/demo/ui/controls/header-chrome'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { GLASS, glassCardNested } from '@/features/demo/ui/glass-tokens'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

export interface CaseMapPickerCase {
  id: string
  caseNumber: string
  displayName: string
  locationCountLabel: string
  status: 'draft' | 'complete' | 'archived'
}

export interface CaseMapPickerProps {
  cases: CaseMapPickerCase[]
  /** Mandatory (false) when no case is being viewed yet — no Cancel; the user leaves via the tab bar. */
  dismissible: boolean
  /** The currently-viewed case, highlighted as a courtesy. Pick is always explicit. */
  preselectedId?: string | null
  onPick(caseId: string): void
  onClose(): void
}

// The full-screen panel sits above the phone's tab bar so the tab bar stays the escape hatch for the
// mandatory picker (matching the phone's "leave via the tab bar" behaviour).

// A37: the same `header` glass tier every other bar in the demo paints. The phone's own
// `MapPicker` has no local header left at all (`MapPicker.tsx:190-191` - "the tab route owns it
// now"), so there is no counterpart recipe to lift; the demo keeps its bar and puts it on the
// tier, which is what "one header recipe" has to mean for a demo-only surface.
const header: CSSProperties = {
  padding: '54px 18px 14px',
  ...glassHeaderBar,
}
const title: CSSProperties = { fontSize: 22, fontWeight: 700, color: colors.text }
const subtitle: CSSProperties = { fontSize: 13, color: colors.textSecondary, marginTop: 4 }
const scroll: CSSProperties = { flex: 1, overflowY: 'auto', padding: spacing.md }

/**
 * A case row - phone `MapPicker.tsx:132-141` + `styles.rowCard` `:318-327`, a nested-glass card
 * at radius `md`. The phone's `styles.row` docblock `:286-298` records what it replaced: rows
 * with "no backgroundColor at all, so every row rendered fully transparent against the screen's
 * grid backdrop with only a 1px border to hold it - the surface the owner rated 'really bad'".
 *
 * Radius `md` (8) and NOT `glassCardNested`'s own `lg`, for the phone's stated reason
 * (`:293-297`): "Not <Card glass glassVariant='nestedCard'> despite that being exactly the
 * intent: Card pins its gradient to radius `lg` and owns `borderColor`, so it can express
 * neither the nested tier's `md` nor the selection accent." D13(a)'s depth tier makes a nested
 * ROW `md`; the map SHEET's rows are nested CARDS and stay at 12 (A57, refuted in-tree by U3.4).
 *
 * The card shadow is COMPOSED onto the fragment's inset rather than replacing it - phone `:133`
 * puts `Layout.shadow.card` on the row wrapper, and `glass-tokens.ts:53-56` requires the compose
 * form so the tier's inset survives.
 */
const baseRow: CSSProperties = {
  ...glassCardNested,
  boxShadow: `${glassCardNested.boxShadow}, ${GLASS.shadowCard}`,
  borderRadius: radius.md,
  display: 'flex',
  alignItems: 'center',
  gap: spacing.base,
  width: '100%',
  textAlign: 'left',
  padding: `${spacing.md}px ${spacing.lg}px`,
  minHeight: touchTarget.large,
  marginBottom: spacing.sm,
  cursor: 'pointer',
}
const allCasesRow: CSSProperties = { ...baseRow, opacity: 0.5, cursor: 'default', marginBottom: 18 }
const rowTitle: CSSProperties = { fontSize: 16, fontWeight: 600, color: colors.text }
const rowSub: CSSProperties = { fontSize: 14, color: colors.textSecondary, marginTop: spacing.xxs }
const rowMeta: CSSProperties = { fontSize: 12, color: colors.textSecondary, marginTop: spacing.xs }
const footer: CSSProperties = { padding: spacing.md, borderTop: GLASS.border }
/**
 * Demo-only: the phone's picker has NO Cancel at all (`MapPicker.tsx:31` - "There is no Cancel"),
 * because it is a tab route rather than an overlay. The demo's is dismissible when a case is
 * already being viewed, so the control stays and takes the shared recipe (D12: follow, inside
 * the frame). It was the retired raised navy at 85%, spelled in `rgba()` form and therefore
 * invisible to `palette.test.ts`'s hex-only sweep - which is how it survived U0 and U1. The
 * value is not restated here for the reason U5.1 records: that scan reddened three times on
 * comments QUOTING the old values, so a comment is not a safe place to keep one.
 */
const cancelBtn: CSSProperties = { ...buttonStyle({ variant: 'secondary' }), width: '100%' }

/**
 * The selected case number's tint (review W3/F52).
 *
 * The phone paints it `colors.primary` (`MapPicker.tsx:163`) and U5.4 ported that verbatim, which
 * took this label from `#4ba3d4`'s 4.12:1 to **3.09:1** on the nested-glass row — a text
 * ratio moving DOWN through WCAG 1.4.3's 4.5 floor. `colors.link` clears it on the same ground.
 *
 * ONLY THE LABEL MOVES. The selected row's 2px border stays `colors.primary`: a border is a
 * non-text mark, so §C.3 rule 2's carve-out and 1.4.11's 3:1 govern it, and D4's "selection is
 * the border's weight and colour, evenly" is a geometry ruling this must not disturb.
 *
 * EXPORTED so §C.1 pins the ratio at the constant this component paints, not at `palette.link`
 * (W2/F27; the `MAP_FILTER_SECTION_LABEL` precedent). Phone-side follow-up to plan §8.
 */
export const MAP_PICKER_SELECTED_TITLE = colors.link

/** Dot for cases that are done (complete/archived); draft cases stay quiet - mirrors the phone.
 *  Palette-sourced: the two literals were a hand-typed `#10d177` and `#7a9fc4`. */
function statusColor(status: CaseMapPickerCase['status']): string | null {
  if (status === 'complete') return colors.success
  if (status === 'archived') return colors.textTertiary
  return null
}

/**
 * Map case picker — a **full-screen** page that slides up, matching the phone's `CaseSelectionSheet`
 * (a `pageSheet` modal, not a bottom sheet). Picks the tab-local viewer case; never the form's case.
 * Mandatory (no Cancel) when no case is viewed; dismissible "Change Case" overlay otherwise.
 */
export function CaseMapPicker({ cases, dismissible, preselectedId = null, onPick, onClose }: CaseMapPickerProps) {
  const [entered, setEntered] = useState(false)
  useEffect(() => setEntered(true), [])

  const container: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: TAB_BAR_HEIGHT,
    zIndex: 30,
    // Matrix row 17's `#0a1422` -> A1. The picker is a full-screen page over the map.
    background: colors.background,
    display: 'flex',
    flexDirection: 'column',
    transform: entered ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
  }

  return (
    <div data-testid="case-map-picker" style={container}>
      <div style={header}>
        <div style={title}>Pick a Case</div>
        <div style={subtitle}>Select which case you&apos;d like to view on the map.</div>
      </div>

      <div style={scroll}>
        {/* All Cases — disabled placeholder for the future aggregate view (parity with the phone). */}
        <div style={allCasesRow} aria-disabled="true">
          <div style={{ flex: 1 }}>
            <div style={{ ...rowTitle, color: colors.textSecondary }}>All Cases</div>
            <div style={rowMeta}>Coming soon. View all your cases on one map</div>
          </div>
        </div>

        {cases.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: colors.textSecondary }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: colors.text, marginBottom: 6 }}>No cases yet</div>
            <div style={{ fontSize: 13 }}>Create a case from the Cases tab to get started.</div>
          </div>
        ) : (
          cases.map((c) => {
            const selected = c.id === preselectedId
            const dot = statusColor(c.status)
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`case-row-${c.id}`}
                data-selected={selected}
                onClick={() => onPick(c.id)}
                // D4 / `7df5148b`: FOUR EVEN SIDES, no accent bar. The phone's reason, inline
                // at `MapPicker.tsx:143-153`: the reserved 4px left edge was painted
                // `transparent` when unselected, "so every unselected card read as though its
                // left border were missing, and the selected one wore a heavy bar down one
                // side. Selection is now the border's weight and colour, evenly: 2px primary
                // against 1px glass." Colour LONGHANDS only (the lit-edge rule) - and the top
                // one moves with them, because the phone's selected row is uniform.
                style={{
                  ...baseRow,
                  ...(selected && {
                    borderWidth: 2,
                    borderTopColor: colors.primary,
                    borderRightColor: colors.primary,
                    borderBottomColor: colors.primary,
                    borderLeftColor: colors.primary,
                  }),
                }}
              >
                {dot && <span style={{ width: 10, height: 10, borderRadius: 5, background: dot, flex: '0 0 auto' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Matrix row 18 names the demo's `accent = '#4ba3d4'` as
                      "`MAP_GLASS_COLORS.primaryLight` un-imported", so the literal had to go.
                      The phone's own token here is `colors.primary` (`:163`) and W3/F52
                      measured it at 3.09:1 on this row — see `MAP_PICKER_SELECTED_TITLE`. */}
                  <div style={{ ...rowTitle, color: selected ? MAP_PICKER_SELECTED_TITLE : colors.text }}>{c.caseNumber}</div>
                  {c.displayName && <div style={rowSub}>{c.displayName}</div>}
                  <div style={rowMeta}>{c.locationCountLabel}</div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {dismissible && (
        <div style={footer}>
          <button type="button" onClick={onClose} style={cancelBtn}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
