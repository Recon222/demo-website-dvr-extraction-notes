'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { caseCheckboxState, type ExportSelection, type ExportSelectionPlan } from '@/features/demo/engine/logic/export'
import { GLASS, glassBtnPrimary } from '@/features/demo/ui/glass-tokens'
import { TAB_BAR_HEIGHT } from '@/features/demo/ui/controls/TabBar'
import type { CaseCard } from '@/features/demo/ui/screens/screenData'
import { ExportCaseCard } from '@/features/demo/ui/screens/export/ExportCaseCard'

/**
 * The Export tab's screen — port of the phone's `ExportHub`
 * (`src/features/case-management/export-hub/components/ExportHub.tsx`).
 *
 * Layer roles are the phone's (:6-9): the hub owns the list, the accordion coordination (so
 * arming a case can surface it) and the pre-flight footer. Selection TRANSITIONS live in the
 * engine (`engine/logic/export/selection.ts`) and the selection itself in the bridge — this
 * component reads them and reports intent.
 *
 * THE FOOTER IS NOT A SECOND DECISION. `plan` arrives pre-resolved from `resolveExportPlan`,
 * so the copy above the CTA and the pipeline the CTA dispatches are literally the same object
 * (engine invariant: the route cannot dispatch a subset ZIP under a footer promising the
 * canonical case artifact). The only thing derived here is which COLOUR that already-made
 * decision wears.
 *
 * DEMO DEVIATIONS from the phone's five screen states (all honest, none faked):
 * - No loading / refreshing / error / retry states, and no pagination. The phone reads cases
 *   from SQLite through `useCases` (`export.tsx:35`) and can therefore fail, be mid-flight, or
 *   be truncated; the demo's cases are already in memory in the store, so a spinner or a
 *   "Couldn't load cases" banner would be theatre. Empty and list are the two real states.
 * - No pull-to-refresh: there is no other device writing to this data.
 */

/** Everything the sticky footer renders, resolved ONCE by the bridge. */
export interface ExportFooterView {
  /** The armed case's number — the footer's authoritative "what am I exporting" line. */
  caseNumber: string
  /** The engine's single decision: CTA label, artifact descriptor, detail line, dispatch. */
  plan: ExportSelectionPlan
}

export interface ExportHubProps {
  cases: CaseCard[]
  selection: ExportSelection | null
  /** Null while nothing is selected (or the armed case has vanished) — the phone's
   *  `selection && armedCase` footer gate (`ExportHub.tsx:148`). */
  footer: ExportFooterView | null
  /** True during an export run — disables every checkbox and the CTA (phone :260). */
  isExporting: boolean
  onToggleCase(caseId: string): void
  onToggleLocation(caseId: string, locationId: string): void
  onClearSelection(): void
  onExportPress(): void
}

const root: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  // Flush with the tab bar, no seam — the `MapBottomSheet.tsx:97` convention.
  bottom: TAB_BAR_HEIGHT,
  display: 'flex',
  flexDirection: 'column',
}

const listArea: CSSProperties = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  overscrollBehavior: 'contain',
  padding: '58px 16px 16px',
}

const emptyArea: CSSProperties = {
  flex: 1,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 24,
  fontSize: 16,
  color: '#99badd',
  textAlign: 'center',
}

const footerStyle: CSSProperties = {
  flex: '0 0 auto',
  background: GLASS.gradientPanel,
  borderTop: GLASS.border,
  padding: '12px 16px 14px',
}

/** Stable empty set for every card that isn't the armed one (one-case rule). */
const EMPTY_IDS: ReadonlySet<string> = new Set<string>()

/** Artifact-line colour, keyed off the decision the engine already made (phone :139-143). */
const ARTIFACT_COLOR = {
  'full-case': '#10d177',
  'single-location': '#99badd',
  subset: '#ffd93d',
} as const

export function ExportHub({
  cases,
  selection,
  footer,
  isExporting,
  onToggleCase,
  onToggleLocation,
  onClearSelection,
  onExportPress,
}: ExportHubProps) {
  /**
   * SINGLE-OPEN accordion, coordinated here rather than per card (phone :56-64, operator
   * decision): expanding a case closes any other; pressing the open one closes it.
   */
  const [expandedId, setExpandedId] = useState<string | null>(null)

  /**
   * Auto-open the newly ARMED case — the phone's "raised focus" beat (:66-78). Ref-guarded
   * against the selection the component MOUNTED with, so a hub that mounts already armed does
   * not steal the accordion open on its first render.
   */
  const prevArmedIdRef = useRef<string | null>(selection?.caseId ?? null)
  useEffect(() => {
    const armedId = selection?.caseId ?? null
    if (armedId && armedId !== prevArmedIdRef.current) setExpandedId(armedId)
    prevArmedIdRef.current = armedId
  }, [selection])

  /**
   * `expandedId` is a FOREIGN KEY into `cases` that nothing prunes — unlike the selection,
   * which the bridge re-validates on every read. A case deleted from another tab would
   * otherwise leave an id nothing matches: nothing lit and EVERY card dimmed (phone :80-88).
   * Resolved at render; the state self-heals on the next toggle.
   */
  const openId = expandedId !== null && cases.some((c) => c.id === expandedId) ? expandedId : null

  const reduce = useReducedMotion()

  return (
    <div data-export-hub style={root}>
      {cases.length === 0 ? (
        // Verbatim (phone :184). The phone shows its error state AHEAD of this one; the demo
        // has no failing read to report — see the deviations note above.
        <div style={emptyArea}>No cases to export</div>
      ) : (
        <div style={listArea}>
          {footer && (
            // The armed case echoed at the top of the list (phone :203-209): quiet mono that
            // mirrors the footer's promise while the visitor scrolls away from it.
            <div style={{ textAlign: 'right', paddingBottom: 8 }}>
              <span
                style={{
                  fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
                  fontSize: 11,
                  letterSpacing: 0.6,
                  color: '#7a9fc4',
                }}
              >
                {footer.caseNumber}
              </span>
            </div>
          )}
          {cases.map((card) => (
            <ExportCaseCard
              key={card.id}
              card={card}
              // The id set the checkbox counts is the set of rows this card RENDERS, so the
              // tri-state can never disagree with what the visitor can see and tick.
              checkbox={caseCheckboxState(selection, { id: card.id, locationIds: card.locations.map((l) => l.id) })}
              selectedIds={selection?.caseId === card.id ? selection.locationIds : EMPTY_IDS}
              expanded={openId === card.id}
              dimmed={openId !== null && openId !== card.id}
              isExporting={isExporting}
              onToggleExpand={(id) => setExpandedId((prev) => (prev === id ? null : id))}
              onToggleCase={onToggleCase}
              onToggleLocation={onToggleLocation}
            />
          ))}
        </div>
      )}

      {footer && (
        <div
          data-export-footer
          style={{
            ...footerStyle,
            // Transform-only entrance (phone :145-159, translateY 12 → 0 over 220ms), so no
            // element's presence ever depends on an animation having run.
            animation: reduce ? undefined : 'exportFooterRise 220ms cubic-bezier(0.32,0.72,0,1)',
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-jbmono),'JetBrains Mono',monospace",
              fontSize: 11,
              letterSpacing: 0.6,
              marginBottom: 6,
              color: ARTIFACT_COLOR[footer.plan.kind],
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {footer.plan.artifactLine}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>{footer.caseNumber}</span>
            <span style={{ flex: 1, fontSize: 11, color: '#99badd' }}>{footer.plan.detailLine}</span>
            {/* Deliberately NOT gated on `isExporting` — the phone leaves Clear enabled while
                every other control locks (ui-mapping 04 records it as observed behaviour). */}
            <button
              type="button"
              onClick={onClearSelection}
              style={{
                padding: '6px 10px',
                background: 'transparent',
                border: 'none',
                borderRadius: 8,
                color: '#99badd',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Clear
            </button>
          </div>
          <button
            type="button"
            onClick={onExportPress}
            disabled={isExporting}
            style={{
              ...glassBtnPrimary,
              width: '100%',
              padding: 12,
              fontSize: 14,
              fontWeight: 700,
              cursor: isExporting ? 'default' : 'pointer',
              opacity: isExporting ? 0.6 : 1,
            }}
          >
            {footer.plan.ctaLabel}
          </button>
        </div>
      )}
    </div>
  )
}
