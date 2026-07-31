'use client'

import type { CSSProperties } from 'react'
import type { CaseCheckboxState } from '@/features/demo/engine/logic/export'
import { GLASS } from '@/features/demo/ui/glass-tokens'
import type { CaseCard } from '@/features/demo/ui/screens/screenData'
import { ExportLocationRow } from '@/features/demo/ui/screens/export/ExportLocationRow'

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

const wrapper: CSSProperties = {
  marginBottom: 14,
  borderRadius: 16,
  overflow: 'hidden',
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

/** 20px rounded square — the case-level control, visually distinct from the round row marks. */
const boxBase: CSSProperties = {
  flex: '0 0 auto',
  width: 20,
  height: 20,
  borderRadius: 5,
  borderWidth: 2,
  borderStyle: 'solid',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: 12,
  fontWeight: 700,
  lineHeight: '14px',
  color: '#fff',
}

/** `aria-checked` for a tri-state control: `'mixed'` is the web's indeterminate. */
function ariaChecked(state: CaseCheckboxState): boolean | 'mixed' {
  return state === 'all' ? true : state === 'some' ? 'mixed' : false
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
        border: expanded ? `1px solid ${GLASS.accentFrom}` : GLASS.borderSoft,
        boxShadow: expanded ? '0 4px 12px rgba(53,160,214,0.35)' : '0 4px 8px rgba(0,0,0,0.15)',
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
            opacity: checkboxDisabled ? 0.4 : 1,
          }}
        >
          <span
            aria-hidden
            style={{
              ...boxBase,
              background: checkbox === 'all' ? '#2B8CC1' : 'transparent',
              borderColor: checkbox === 'none' ? '#7a9fc4' : '#2B8CC1',
              color: checkbox === 'all' ? '#fff' : '#2B8CC1',
            }}
          >
            {checkbox === 'all' ? '✓' : checkbox === 'some' ? '–' : null}
          </span>
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
                color: '#f0f4f8',
              }}
            >
              {card.caseNumber}
            </span>
            {card.displayName && (
              <span style={{ display: 'block', fontSize: 13, color: '#99badd', marginTop: 4 }}>{card.displayName}</span>
            )}
          </span>
          <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <span style={{ padding: '3px 9px', borderRadius: 20, border: `1px solid ${card.status.border}`, background: card.status.bg }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: 0.5, color: card.status.color }}>{card.status.label}</span>
            </span>
            <span style={{ fontSize: 11, color: '#7a9fc4' }}>{card.locationCountLabel}</span>
          </span>
          {/* Plain glyphs, exactly as the phone renders them (:173) — not an icon component. */}
          <span aria-hidden style={{ width: 16, textAlign: 'center', fontSize: 12, color: '#7a9fc4' }}>
            {expanded ? '▾' : '▸'}
          </span>
        </button>
      </div>

      {expanded && (
        <div style={{ padding: '0 16px 12px' }}>
          <div style={{ height: 1, background: '#1e3a5f', marginBottom: 4 }} />
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
            // Verbatim (phone :195) — an empty case is a real state, not an error.
            <div style={{ fontSize: 13, fontStyle: 'italic', color: '#7a9fc4', textAlign: 'center', padding: '12px 0' }}>
              No locations — nothing exportable
            </div>
          )}
        </div>
      )}
    </div>
  )
}
