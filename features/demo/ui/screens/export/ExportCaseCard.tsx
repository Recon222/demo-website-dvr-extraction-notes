'use client'

import type { CSSProperties } from 'react'
import { assertNever } from '@/features/demo/engine/logic/assert-never'
import type { CaseCheckboxState } from '@/features/demo/engine/logic/export'
import { CheckboxBox } from '@/features/demo/ui/controls/choice-controls'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import type { CaseCard } from '@/features/demo/ui/screens/screenData'
import { ExportLocationRow } from '@/features/demo/ui/screens/export/ExportLocationRow'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, withAlpha } from '@/features/demo/ui/tokens/scale'
import { statusBadgeStyle } from '@/features/demo/ui/tokens/status'

/**
 * One case in the Export Hub — accordion header + tri-state case checkbox + the expanded
 * location rows. Port of the phone's `ExportCaseCard`
 * (`src/features/case-management/export-hub/components/ExportCaseCard.tsx`).
 *
 * TWO structural rules lifted verbatim:
 *
 * - The checkbox is a SIBLING of the expand control, never a descendant (phone :139-142):
 *   a reader must focus it on its own, and a press on a DISABLED checkbox must not fall
 *   through and expand the card.
 * - Emphasis follows the OPEN card, not the armed one (phone :5-10, "lit-follows-open"):
 *   expanded → elevated panel gradient + accent border + accent glow; every other card
 *   recedes to `opacity: 0.5` while ANY card is open, and stays fully interactive. The
 *   divergence the phone accepts is accepted here too — a case armed and then left
 *   collapsed is not lit, and the footer remains the export truth.
 *
 * Expansion is CONTROLLED (`expanded` + `onToggleExpand`) because the hub enforces
 * single-open; unlike the phone there is no self-managed fallback, since the hub is this
 * card's only caller.
 */

export interface ExportCaseCardProps {
  card: CaseCard
  /** none / some / all — from the engine's `caseCheckboxState`, never re-derived here. */
  checkbox: CaseCheckboxState
  /** The armed case's selected location ids; empty for every other card (one-case rule). */
  selectedIds: ReadonlySet<string>
  expanded: boolean
  /** Another case is open — recede visually, stay interactive (phone :43-44). */
  dimmed: boolean
  /** True during an export run — checkboxes and rows must not toggle (phone :148,187). */
  isExporting: boolean
  onToggleExpand(caseId: string): void
  onToggleCase(caseId: string): void
  onToggleLocation(caseId: string, locationId: string): void
}

/** Lit-card halo. Prop-independent, so it is computed once (repo convention:
 *  `components/marketing/phone-frame.tsx:30-31`) rather than per render. */
const LIT_GLOW = `0 4px 12px ${withAlpha(colors.link, 0.35)}`

/**
 * The card box — ONE element where the phone needs two, and the matrix row asks for the reason
 * on record.
 *
 * The phone splits `wrapper` (shadow + opaque background, `ExportCaseCard.tsx:248-258`) from
 * `card` (gradient + border + `overflow: 'hidden'`, `:274-279`) because on iOS `masksToBounds`
 * clips a layer's OWN shadow, so one view cannot both round its gradient's corners and cast a
 * drop shadow — its comment at `:119-124` says exactly that. **CSS has no such rule.**
 * `box-shadow` is painted outside the border box and `overflow: hidden` clips only descendants,
 * so the two live together here and the phone's outer view would be an empty div.
 *
 * The phone's SECOND reason for that wrapper is also web-inert and is the more dangerous half to
 * port blindly: an opaque `backgroundColor` is what lets Fabric take the cheap `shadowPath`
 * instead of rasterising every card on scroll (`:250-257`), and the phone accepts a documented
 * cost for it — the grid backdrop stops showing through its cards. Painting that fill here would
 * buy nothing and would put a solid navy under this card's own alpha-0.85 gradient.
 */
const wrapper: CSSProperties = {
  // phone `ExportHub.tsx:310-312` — `cardWrapper.marginBottom: Layout.spacing.md`. The demo's
  // 14 was a prototype value sitting two short of the scale beside it.
  marginBottom: spacing.md,
  // A43 (U1.2) - a top-level card is `lg` (12), not `xl`. See CasesScreen's note.
  borderRadius: radius.lg,
  overflow: 'hidden',
}

/**
 * The expanded body — phone `styles.locationsContainer` (`:334-339`).
 *
 * The hairline is `glass.card.border` (the CARD TIER's washed edge, i.e. `GLASS.borderSoft`),
 * not the flat opaque `colors.border` the demo's 1px spacer div painted, and it is this
 * element's own `borderTop` rather than a sibling `height: 1` node — which is both what the
 * phone builds and one fewer node that can drift out of alignment with the box it divides.
 *
 * `marginTop: Layout.spacing.base` (`:335`) is deliberately NOT ported. The phone's `card` pads
 * uniformly at `spacing.md` and its header row closes flush against that padding; the demo's
 * header button already closes with `padding: '16px 16px 16px 8px'`, so it spends that gap in a
 * different place. Adding 12 more would double it (§4.2 — do not tidy the lifted geometry). The
 * 4px BELOW the line is the phone's `paddingTop: spacing.xs` (`:336`), which is where the demo's
 * old `marginBottom: 4` already sat.
 */
const locationsBody: CSSProperties = {
  borderTop: GLASS.borderSoft,
  paddingTop: spacing.xs,
}

const headerBtn: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'space-between',
  gap: 10,
  padding: '16px 16px 16px 8px',
  background: 'transparent',
  border: 'none',
  textAlign: 'left',
  cursor: 'pointer',
  color: 'inherit',
}

/*
 * `boxBase` LIVED HERE until U2.4 (A75). It was a 20x20 / radius 5 / 12px-glyph square with
 * `#2B8CC1` and `#7a9fc4` written into the three consumer branches beside it, and the phone
 * renders this same control through its shared `Checkbox`
 * (`ExportCaseCard.tsx:22`, `:159-165`). `ui/controls/choice-controls.tsx`'s `CheckboxBox` is
 * the canonical recipe: 24x24, radius `sm`, `borderWidth 2`, `colors.primary` fill, an
 * `onPrimary` mark at 16/700 and — the visible change on this card — an OPAQUE
 * `colors.background` when unchecked instead of a transparent hole.
 *
 * `ariaChecked` below is unchanged and now feeds BOTH the attribute and the paint, so the
 * `assertNever` that closes it covers the visual state too: a 4th `CaseCheckboxState` can no
 * longer paint "unchecked" while announcing something else.
 */

/**
 * `aria-checked` for a tri-state control: `'mixed'` is the web's indeterminate.
 *
 * Closed with `assertNever` (R-3 sibling): as a ternary chain, a 4th `CaseCheckboxState` fell
 * through to `false` and told a screen reader "nothing is selected" — the quietest possible
 * lie, on the control whose whole job is reporting how much is.
 */
function ariaChecked(state: CaseCheckboxState): boolean | 'mixed' {
  switch (state) {
    case 'all':
      return true
    case 'some':
      return 'mixed'
    case 'none':
      return false
    default:
      return assertNever(state)
  }
}

export function ExportCaseCard({
  card,
  checkbox,
  selectedIds,
  expanded,
  dimmed,
  isExporting,
  onToggleExpand,
  onToggleCase,
  onToggleLocation,
}: ExportCaseCardProps) {
  const hasLocations = card.locations.length > 0
  const checkboxDisabled = isExporting || !hasLocations

  return (
    <div
      style={{
        ...wrapper,
        // Lit vs idle (phone :133-137 + :243-252). Opacity only for the dim — a dimmed card
        // still takes presses.
        background: expanded ? GLASS.gradientPanel : GLASS.gradientCardDiag,
        // The lit outline is an accent MARK, so it takes `link`, not the CTA fill shade:
        // `GLASS.accentFrom` measures 2.44 against this panel (WCAG 1.4.11 wants 3.0), `link`
        // 9.23. The glow is derived from the same token so the two can never disagree.
        border: expanded ? `1px solid ${colors.link}` : GLASS.borderSoft,
        // Idle: the card recipe's own elevation (U1.3), not the hand-typed rgba this line
        // used to carry — `GLASS.shadowCard` is byte-identical to it, so this is a re-point.
        boxShadow: expanded ? LIT_GLOW : GLASS.shadowCard,
        opacity: dimmed ? 0.5 : 1,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: 12 }}>
        <button
          type="button"
          role="checkbox"
          aria-checked={ariaChecked(checkbox)}
          aria-label={`Select all locations in ${card.caseNumber}`}
          disabled={checkboxDisabled}
          onClick={() => onToggleCase(card.id)}
          style={{
            flex: '0 0 auto',
            display: 'flex',
            padding: 6,
            background: 'transparent',
            border: 'none',
            cursor: checkboxDisabled ? 'default' : 'pointer',
            // 0.5, not the demo's own 0.4 — phone `Checkbox.tsx:106-108`, `:118-120`. D10
            // keeps the opacity idiom; only the value is the phone's.
            opacity: checkboxDisabled ? 0.5 : 1,
          }}
        >
          <CheckboxBox checked={ariaChecked(checkbox)} />
        </button>
        <button
          type="button"
          aria-label={`Case ${card.caseNumber}`}
          aria-expanded={expanded}
          onClick={() => onToggleExpand(card.id)}
          style={headerBtn}
        >
          <span style={{ flex: 1, minWidth: 0 }}>
            <span
              style={{
                display: 'block',
                fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
                fontSize: 17,
                fontWeight: 600,
                // phone `styles.caseNumber:306-311` — `colors.text`.
                color: colors.text,
              }}
            >
              {card.caseNumber}
            </span>
            {card.displayName && (
              // phone `styles.displayName:302-305` — `colors.textSecondary`.
              <span style={{ display: 'block', fontSize: 13, color: colors.textSecondary, marginTop: 4 }}>
                {card.displayName}
              </span>
            )}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            {/* `medium`, matching phone `export-hub/ExportCaseCard.tsx:182` — the one site that
                renders the badge at its default size alongside a location count. */}
            <span style={statusBadgeStyle(card.status)}>{card.status.label}</span>
            {/* phone `styles.locationCount:316-320` — `colors.textSecondary`. This was
                `#7a9fc4` (= `textTertiary`), one rung DOWN from the phone: a value drift, not
                a spelling. It is the same call D-1 made for the recorder's six `#5a7a9a` sites
                — a line the analyst reads does not sit on the tertiary rung. */}
            <span style={{ fontSize: 11, color: colors.textSecondary }}>{card.locationCountLabel}</span>
          </span>
          {/* Plain glyphs, exactly as the phone renders them (:173) — not an icon component.
              `textTertiary` IS right here: phone `:193` hands the chevron `colors.textTertiary`
              explicitly, and it is decorative (`aria-hidden`), so 1.4.3 does not reach it. */}
          <span aria-hidden style={{ width: 16, textAlign: 'center', fontSize: 12, color: colors.textTertiary }}>
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={locationsBody}>
            {hasLocations ? (
              card.locations.map((loc) => (
                <ExportLocationRow
                  key={loc.id}
                  row={loc}
                  selected={selectedIds.has(loc.id)}
                  disabled={isExporting}
                  onToggle={(locationId) => onToggleLocation(card.id, locationId)}
                />
              ))
            ) : (
              // An empty case is a real state, not an error. In-card empty LINE, so it is NOT
              // A80's screen-level `EmptyState` — phone
              // `case-management/export-hub/components/ExportCaseCard.tsx:340-346`:
              // `fontSize.sm` (14), italic KEPT, `colors.textTertiary`, centred,
              // `paddingVertical: Layout.spacing.md` (16).
              //
              // The copy is now the phone's, verbatim from its `:218`. It read
              // "No locations — nothing exportable" with an em dash, above a comment claiming
              // "Verbatim (phone :195)" — the phone spells it with a COMMA, at `:218`, and the
              // standing campaign copy rule (plan §4.3) bans em dashes in user-facing strings.
              <div
                style={{
                  fontSize: 14,
                  fontStyle: 'italic',
                  color: colors.textTertiary,
                  textAlign: 'center',
                  padding: `${spacing.md}px 0`,
                }}
              >
                No locations, nothing exportable
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
