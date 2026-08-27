'use client'

import { useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { useReducedMotion } from 'motion/react'
import { caseCheckboxState, type ExportSelection, type ExportSelectionPlan } from '@/features/demo/engine/logic/export'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { glassHeaderBar, glassHeaderFooterBar } from '@/features/demo/ui/controls/header-chrome'
import { TAB_BAR_HEIGHT } from '@/features/demo/ui/controls/TabBar'
import type { CaseCard } from '@/features/demo/ui/screens/screenData'
import { ExportCaseCard } from '@/features/demo/ui/screens/export/ExportCaseCard'
import { colors } from '@/features/demo/ui/tokens/palette'
import { spacing } from '@/features/demo/ui/tokens/scale'

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

/**
 * The pre-flight bar is a HEADER-TIER surface (A37), not the `elevated` panel it painted before
 * — phone `export-hub/components/ExportHub.tsx:230-234` (the `LinearGradient`) over `:316-322`
 * (`styles.footer`).
 *
 * COMPOSED FROM BOTH header exports rather than taken whole from either, because the phone is
 * not consistent about this and the inconsistency is visible:
 *
 *   drawer footer  `CustomDrawerContent.tsx:437`  `colors={[...gradient].reverse()}`  FLIPPED
 *   export footer  `ExportHub.tsx:231`            `colors={[...glass.header.gradient]}`  NOT
 *
 * Both bars sit BELOW their content and both hang their hairline on the top edge, but only the
 * drawer's flips its stops. `glassHeaderFooterBar` transcribes the drawer, so taking it whole
 * here would invert this bar's light source against its own phone counterpart. It therefore
 * takes `glassHeaderBar`'s unflipped ground and `glassHeaderFooterBar`'s top edge — the two
 * halves the phone actually spells — and both still resolve through `GLASS_TIER[scheme].header`,
 * so a phone-side re-tint moves this bar with every other one.
 *
 * `footerWrap`'s opaque `colors.background` (phone `:313-315`) is deliberately NOT ported. It
 * backs an `Animated.View` that floats over a `FlatList`; the demo's footer is a `flex: 0 0 auto`
 * sibling of its own scroll container, so nothing passes behind it for the tier's 0.95/0.98
 * alphas to reveal. Porting it would paint a ground no other demo bar carries.
 */
const footerStyle: CSSProperties = {
  flex: '0 0 auto',
  background: glassHeaderBar.background,
  borderTop: glassHeaderFooterBar.borderTop,
  // phone `:319-321` — `paddingHorizontal: md`, `paddingTop: base`, `paddingBottom: md`. The
  // demo's closing `14` was a prototype value with no phone counterpart.
  padding: `${spacing.base}px ${spacing.md}px ${spacing.md}px`,
}

/** Stable empty set for every card that isn't the armed one (one-case rule). */
const EMPTY_IDS: ReadonlySet<string> = new Set<string>()

/**
 * Artifact-line colour, keyed off the decision the engine already made (phone
 * `export-hub/components/ExportHub.tsx:133-137`, styles `:329-337`).
 *
 * **NOT a `STATUS_SEVERITY` consumer, and not a badge.** The phone spells these as three direct
 * token reads on a bare mono line — `colors.success` / `colors.textSecondary` / `colors.warning`
 * — and all three demo values already matched byte for byte, so this is a pure tokenisation:
 * A69 counts it among the eight owners, but the two lookups are not what it collapses INTO.
 * Routing it through the badge trio would repaint a line of text with a fill tone.
 *
 * `textSecondary` and not a severity for `single-location`: one location is not a lesser
 * outcome, it is a neutral fact about the plan.
 */
const ARTIFACT_COLOR = {
  'full-case': colors.success,
  'single-location': colors.textSecondary,
  subset: colors.warning,
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
          {/*
           * THE ARMED-CASE ECHO ROW LIVED HERE until U6.3 (D16). It was a right-aligned jbmono
           * line — `fontSize:11, letterSpacing:0.6, color:'#7a9fc4'` — repeating the footer's
           * case number above the list, and its comment cited phone `ExportHub.tsx:203-209`.
           *
           * The citation was ALREADY STALE when it was written and is stale twice over now:
           * PR #125 `16d8c67c` deleted the row from the phone by owner ruling, and at `dd5551ec`
           * `:203-209` is a block of `Reanimated.FlatList` props (`onEndReachedThreshold`,
           * `onScroll`, `scrollEventThrottle`, `ListHeaderComponent`) — not a rendered surface at
           * all. The phone's list area between `:178` and `:196` is the stale-data Banner and
           * nothing else.
           *
           * So the footer is the ONLY place the armed case is named, which is also what makes it
           * "the export truth" in `ExportCaseCard`'s lit-follows-open note: one statement of what
           * is armed, in the one place that also carries the CTA that acts on it.
           */}
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
              // phone `:327` — `marginBottom: Layout.spacing.xs`.
              marginBottom: spacing.xs,
              color: ARTIFACT_COLOR[footer.plan.kind],
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {footer.plan.artifactLine}
          </div>
          {/* phone `:338-343` — `gap` and `marginBottom` are both `Layout.spacing.sm`. */}
          <div style={{ display: 'flex', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm }}>
            {/* phone `:344-353` — `colors.text` on the case number, `colors.textSecondary` on
                the detail line. Both were the same values spelled as bare hex. */}
            <span style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>{footer.caseNumber}</span>
            <span style={{ flex: 1, fontSize: 11, color: colors.textSecondary }}>{footer.plan.detailLine}</span>
            {/* Deliberately NOT gated on `isExporting` — the phone leaves Clear enabled while
                every other control locks (ui-mapping 04 records it as observed behaviour). */}
            <button
              type="button"
              onClick={onClearSelection}
              style={{
                // phone `:242-249` — `<Button variant="ghost" size="small">`, through THE recipe.
                ...buttonStyle({ variant: 'ghost', size: 'small' }),
                // phone `:358-360` — `paddingHorizontal: Layout.spacing.sm`, and ONLY that. Its
                // comment at `:354-357` is explicit that overriding `minHeight`/`paddingVertical`
                // shrinks the real target below `touchTarget.min`, the HIG 44pt and the Android
                // 48dp floor — which is exactly what this button's `padding: '6px 10px'` did.
                // Longhands AFTER the recipe's `padding` shorthand: the safe direction (§4.3).
                paddingLeft: spacing.sm,
                paddingRight: spacing.sm,
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
              width: '100%',
              ...buttonStyle({ disabled: isExporting }),
            }}
          >
            {footer.plan.ctaLabel}
          </button>
        </div>
      )}
    </div>
  )
}
