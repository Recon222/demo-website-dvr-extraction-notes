'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { GlassBottomSheet } from '@/features/demo/ui/controls/GlassBottomSheet'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { MAP_FILTER_STATUSES, toggleStatus } from '@/features/demo/ui/screens/map/mapFilters'
import {
  PROXIMITY_PRESETS,
  STATUS_LABEL,
  type RadiusPreset,
} from '@/features/demo/ui/screens/map/mapTokens'
import { Toggle } from '@/features/demo/ui/screens/_shared'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'
import { STATUS_ACCENT, STATUS_SEVERITY, severityTone } from '@/features/demo/ui/tokens/status'

/**
 * `MapFiltersSheet` — the status + proximity controls, re-homed into the app's one bottom-sheet
 * shell. Matrix A82, plan §5 U5.3. Port of the phone's PR #127 component
 * (`src/features/location/map-view/components/MapFiltersSheet.tsx` @ `dd5551ec`), created by
 * `41b27af3`.
 *
 * This is the DESTINATION for everything U5.2 deleted: the three rows of glass pills that used to
 * float over the map tiles. The map keeps the search row and — while proximity is running — a
 * compact summary chip; everything else is in here.
 *
 * ## Theming: app chrome, not map chrome
 *
 * The phone's own D3(a) reasoning (`:11-13`): this sheet follows the APP theme rather than the
 * theme-invariant map palette, so it reads `colors` / `severityTone()` and never `MAP_PIN_COLORS`
 * or `SHEET_COLORS` (which is the map BOTTOM sheet's ground — U5.1's standing advice).
 *
 * ## The two status vocabularies, both used, one each
 *
 * `tokens/status.ts:19-23` publishes two lookups and this component is the clearest case for
 * both at once:
 *
 *   the chip has a FILL and TEXT  -> `severityTone(STATUS_SEVERITY[status])`
 *   the dot is a BARE MARK        -> `colors[STATUS_ACCENT[status]]`
 *
 * …and the dot is TWO-STATE (`MapFiltersSheet.tsx:139`, partner-legwork W3-C10): active dots take
 * the chip's own `*OnLight` foreground, because they sit ON the `*Light` fill and the bare-mark
 * accent is not measured against that. Only the INACTIVE dot — which sits on the sheet ground with
 * no fill under it — takes `STATUS_ACCENT`. Painting every dot from one of the two loses either
 * the active/inactive distinction or the 1.4.11 floor.
 *
 * The radius presets use the `info` pair for the phone's stated reason (`:19-22`): `working` and
 * proximity share the info hue on the map (`PROXIMITY_COLORS.accent === MAP_PIN_COLORS.working`),
 * so the in-sheet selection stays in the same hue family without reading the theme-invariant map
 * palette.
 *
 * ## Presentational
 *
 * Props in, callbacks out — no store, no engine (`features/demo/CLAUDE.md`). `visible` is owned by
 * `MapScreen`, which is the component-local UI state D20 names this package for. The filter VALUES
 * and their pipeline (`mapFilters.ts`) are untouched: this package moves the CONTROLS, not the
 * data.
 */

export interface MapFiltersSheetProps {
  /** Controls sheet visibility. The host owns this state (D20 — `MapScreen`'s `filtersVisible`). */
  visible: boolean
  /** Scrim tap, swipe-down, Escape, and the Done button. Four routes, one handler. */
  onClose(): void
  /** Currently-active status filters (empty = no status filter). */
  activeStatuses: readonly LocationMapStatus[]
  /**
   * Receives the FULL updated status set on every toggle, never a delta (A82).
   *
   * The array arrives in `MAP_FILTER_STATUSES` order rather than tap order — see the docblock on
   * the handler below.
   */
  onStatusToggle(statuses: readonly LocationMapStatus[]): void
  proximityActive: boolean
  proximityRadius: RadiusPreset
  /** Flips proximity mode. Resolving the ring's centre is the host's concern. */
  onProximityToggle(): void
  onRadiusChange(radius: RadiusPreset): void
  /** Clears the status + search filters AND deactivates proximity — the host composes both. */
  onClearAll(): void
  /** Plottable locations surviving the status/text filters. */
  locationCount: number
  /** Locations surviving those filters AND the proximity ring. */
  filteredCount: number
  /**
   * Is there a live map surface to long-press? (F58.)
   *
   * The hint below is the phone's, and the phone always has a map. The demo does not: without
   * `NEXT_PUBLIC_MAPBOX_TOKEN`, `MapCanvas` returns `[data-map-fallback]` INSTEAD of
   * `[data-map-canvas]` (`MapCanvas.tsx:620-626`) — a panel that says "Map preview unavailable"
   * in as many words. Shipping the long-press hint over that panel had the sheet contradicting
   * the surface underneath it, which is the demo's honesty rule failing in the one direction it
   * exists to catch: telling the visitor to perform a gesture on something that is not there.
   *
   * REQUIRED, not defaulted-true: a default would make the honest branch the one a caller has to
   * remember, and there is exactly one caller.
   */
  canPlaceRing: boolean
}

/**
 * The section-label recipe. Phone `styles.sectionLabel` (`:231-237`): `fontSize.xs` (12),
 * `fontWeight.bold` (700), `letterSpacing 0.5`, uppercase, `marginBottom: spacing.sm` (8), painted
 * `colors.textSecondary` (`:133`, `:168`).
 *
 * EXPORTED so §C.1 row 45 pins the ratio at the constant this component paints rather than at
 * `palette.textSecondary` — U0.5's structural rule, and the same reason `MAP_FILTER_BADGE_FILL`
 * and `MEDIA_CLOSE_CHIP` are exported. A pin against the palette stays green through exactly the
 * edit it exists to catch (re-pointing this label at `textTertiary`, which measures below AA on
 * the sheet tier).
 */
export const MAP_FILTER_SECTION_LABEL: CSSProperties & { color: string } = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.5,
  textTransform: 'uppercase',
  marginBottom: spacing.sm,
  color: colors.textSecondary,
}

/** Phone `styles.body` `:226-230` — `16 / 16 / 8` (A82). The shell's body has no padding of its own. */
const body: CSSProperties = {
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
  paddingTop: spacing.md,
  paddingBottom: spacing.sm,
}

/** Phone `styles.chipRow` `:238-243`. */
const chipRow: CSSProperties = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: spacing.sm,
  marginBottom: spacing.lg,
}

/**
 * Phone `styles.chip` `:244-253`.
 *
 * NOT `statusBadgeStyle` — U5.4's R2 settled that for all three map surfaces: the phone's map
 * chips are hand-rolled with their own geometry and importing the badge recipe (radius `lg`,
 * `BADGE_PADDING`, no `minHeight`) would invent a contract the phone does not hold. Only the
 * COLOURS come from `severityTone()`.
 *
 * Border longhands, no shorthand: `borderColor` is itself a four-side shorthand and this object is
 * spread by two callers that then re-tint. `borderStyle` is CSS's default-none problem, not RN's.
 */
const chip: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.xs,
  paddingLeft: spacing.base,
  paddingRight: spacing.base,
  borderRadius: radius.full,
  borderStyle: 'solid',
  borderWidth: 1,
  borderTopColor: colors.border,
  borderRightColor: colors.border,
  borderBottomColor: colors.border,
  borderLeftColor: colors.border,
  minHeight: touchTarget.min,
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  // Phone `styles.chipText` `:259-262`: `fontSize.sm` (14), `fontWeight.semibold`. RN needs a
  // separate `<Text>`; a web `<button>` carries and inherits both.
  fontSize: 14,
  fontWeight: 600,
  whiteSpace: 'nowrap',
  // The UNSELECTED foreground, i.e. the `false` arm of the phone's `foreground` ternary
  // (`:138`, `:206`). `chipSelected` overrides it; a `<button>` has a UA colour, so leaving this
  // to the default paints the browser's, not the palette's.
  color: colors.textSecondary,
}

/** Phone `styles.chipDot` `:254-258`. */
const chipDot: CSSProperties = {
  width: 7,
  height: 7,
  borderRadius: radius.full,
  flex: '0 0 auto',
}

/** Phone `styles.switchRow` `:263-269`. */
const switchRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: spacing.sm,
  minHeight: touchTarget.min,
}

/** Phone `styles.switchLabel` `:270-273` — 14/500 `colors.text`, NOT the shared switch's own 16. */
const switchLabel: CSSProperties = { fontSize: 14, fontWeight: 500, color: colors.text }

/** Phone `styles.hintText` `:279-282`, painted `colors.textTertiary` (`:217`). */
const hintText: CSSProperties = { fontSize: 12, lineHeight: '16px', color: colors.textTertiary }

/** The phone's hint, verbatim (`MapFiltersSheet.tsx:218`). Only true when a map is rendered. */
const HINT_CAN_PLACE = 'Long-press the map to place or move the proximity ring.'
/**
 * F58: what the sheet says instead when there is no map surface to press. It promises no gesture
 * and describes no view — it states the one thing that is true, which is that the ring is where
 * the demo put it and cannot be moved. No em-dash (A93's sweep + its guard).
 */
const HINT_NO_MAP = 'The live map is unavailable, so the proximity ring cannot be moved.'

/** Phone `styles.footerRow` `:283-287`. The shell wraps this in `paddingBottom: 12` and nothing else. */
const footerRow: CSSProperties = {
  display: 'flex',
  gap: spacing.sm,
  paddingLeft: spacing.md,
  paddingRight: spacing.md,
}

/** Phone `styles.footerButton` `:288-290`. */
const footerButton: CSSProperties = { flexGrow: 1, flexShrink: 1, flexBasis: 0 }

/**
 * Off-screen but readable by assistive tech. A second copy of `ExportModal.tsx:70-80`'s constant,
 * knowingly: hoisting it would mean editing that screen, which belongs to no U5 package. Proposed
 * as a deferral rather than smuggled across a package boundary.
 */
const srOnly: CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  margin: -1,
  padding: 0,
  overflow: 'hidden',
  clip: 'rect(0 0 0 0)',
  whiteSpace: 'nowrap',
  border: 0,
}

/** The chip's selected paint, from the severity trio. Spread AFTER `chip`, colour longhands only. */
function chipSelected(tone: ReturnType<typeof severityTone>): CSSProperties {
  return {
    background: tone.background,
    color: tone.color,
    borderTopColor: tone.borderColor,
    borderRightColor: tone.borderColor,
    borderBottomColor: tone.borderColor,
    borderLeftColor: tone.borderColor,
  }
}

export function MapFiltersSheet({
  visible,
  onClose,
  activeStatuses,
  onStatusToggle,
  proximityActive,
  proximityRadius,
  onProximityToggle,
  onRadiusChange,
  onClearAll,
  locationCount,
  filteredCount,
  canPlaceRing,
}: MapFiltersSheetProps) {
  // Phone `:94-98`, verbatim — including that BOTH arms take their plural from `locationCount`.
  const plural = locationCount === 1 ? 'location' : 'locations'
  const subtitle =
    filteredCount === locationCount
      ? `${locationCount} ${plural}`
      : `${filteredCount} of ${locationCount} ${plural} shown`

  /**
   * The spoken count — U5.2's deferral D-5, placed here.
   *
   * The count pill that carried `role="status"` (review R-7a: *"the ONLY feedback the filter,
   * search and proximity controls give"*) went with the pill chrome. This sheet is the surface
   * that replaced it: while it is open it is the ONLY place a filter can be changed — the scrim
   * covers the search field — so its subtitle reflects every reachable change, and a region here
   * cannot announce something the visitor has no way to have caused.
   *
   * Written on the next tick from an EMPTY mount, which is `ExportModal.tsx:124-139`'s idiom and
   * the reason it exists: *"an aria-live region only announces what changes AFTER it mounts"*. The
   * reset on close is the second half — without it every open after the first re-shows a region
   * that is already populated, which is precisely the inconsistency D-5 recorded against the
   * proximity chip.
   */
  const [announcement, setAnnouncement] = useState('')
  useEffect(() => {
    setAnnouncement(visible ? subtitle : '')
  }, [visible, subtitle])

  /**
   * Add/remove semantics moved verbatim from the phone (`:83-92`), with one substitution: the
   * emitted array is built by `toggleStatus` (`mapFilters.ts:75-83`) rather than by
   * `[...activeStatuses, status]`.
   *
   * Same SET either way — `matchesStatusFilter` and the badge count are both order-blind — but
   * `toggleStatus` re-derives through `MAP_FILTER_STATUSES`, the exhaustive registry review R-17
   * built so a fourth `LocationMapStatus` cannot be silently dropped from a toggle. Appending
   * inline would leave that registry with no runtime reader and the guarantee with nothing behind
   * it.
   */
  const pressStatus = (status: LocationMapStatus) => onStatusToggle(toggleStatus(activeStatuses, status))

  return (
    <GlassBottomSheet
      visible={visible}
      onClose={onClose}
      title="Map Filters"
      subtitle={subtitle}
      // Labels the SCRIM (U4.1 §8.2). Passed BECAUSE this sheet renders no visible close control
      // in its header — Done in the footer is the affordance — so the scrim is the only dismiss
      // control that would otherwise be unnamed. The phone's own string (`:106`).
      closeLabel="Close map filters"
      footer={
        <div style={footerRow}>
          <button
            type="button"
            data-testid="filter-clear-all"
            onClick={onClearAll}
            aria-label="Clear all filters"
            style={{ ...buttonStyle({ variant: 'outline' }), ...footerButton }}
          >
            Clear All
          </button>
          <button
            type="button"
            data-testid="filter-done"
            onClick={onClose}
            aria-label="Apply filters and close"
            style={{ ...buttonStyle({ variant: 'primary' }), ...footerButton }}
          >
            Done
          </button>
        </div>
      }
    >
      <div data-testid="map-filters-sheet" style={body}>
        {/* ---- Location status ---- */}
        <div style={MAP_FILTER_SECTION_LABEL}>Location Status</div>
        <div style={chipRow}>
          {MAP_FILTER_STATUSES.map((status) => {
            const isActive = activeStatuses.includes(status)
            const tone = severityTone(STATUS_SEVERITY[status])
            const dotColor = isActive ? tone.color : colors[STATUS_ACCENT[status]]
            return (
              <button
                key={status}
                type="button"
                data-testid={`filter-status-${status}`}
                onClick={() => pressStatus(status)}
                aria-label={`Filter by ${STATUS_LABEL[status]}`}
                // `aria-pressed`, where the phone spells `accessibilityState={{ selected }}`
                // (`:156`). On the web `aria-selected` is only valid on option/tab/row roles, so a
                // literal port would announce nothing on a button; `aria-pressed` is the two-state
                // toggle semantic AND what makes the state queryable without reading styles.
                aria-pressed={isActive}
                style={isActive ? { ...chip, ...chipSelected(tone) } : chip}
              >
                <span
                  data-testid={`filter-status-${status}-dot`}
                  aria-hidden="true"
                  style={{ ...chipDot, background: dotColor }}
                />
                {STATUS_LABEL[status]}
              </button>
            )
          })}
        </div>

        {/* ---- Proximity ---- */}
        <div style={MAP_FILTER_SECTION_LABEL}>Proximity</div>
        <div style={switchRow}>
          <span style={switchLabel}>Filter by radius</span>
          {/* The demo's ONE switch renderer (SEAM(U2.3)). `hideLabel` is exactly what the phone
              does here — it passes the shared `<Switch>` no `label` and draws its own row
              (`:169-180`) — and it is the prop U2.3 added so a host with its own label never
              re-implements the track. The accessible name carries the DIRECTION, verbatim from
              `:175-177`. */}
          <Toggle
            hideLabel
            testId="filter-proximity"
            label={proximityActive ? 'Deactivate proximity mode' : 'Activate proximity mode'}
            on={proximityActive}
            onClick={onProximityToggle}
          />
        </div>

        {proximityActive && (
          <div style={chipRow}>
            {PROXIMITY_PRESETS.map((preset) => {
              const isSelected = proximityRadius === preset
              const info = severityTone('info')
              return (
                <button
                  key={preset}
                  type="button"
                  data-testid={`filter-radius-${preset}`}
                  onClick={() => onRadiusChange(preset)}
                  aria-label={`${preset} kilometre radius`}
                  aria-pressed={isSelected}
                  style={isSelected ? { ...chip, ...chipSelected(info) } : chip}
                >
                  {preset} km
                </button>
              )
            })}
          </div>
        )}

        <div data-testid="filter-hint" style={hintText}>
          {canPlaceRing ? HINT_CAN_PLACE : HINT_NO_MAP}
        </div>

        {/* Last in the body so the sr-only copy never interrupts the linear reading order; a live
            region announces from wherever it sits. */}
        <div data-testid="map-filters-announcement" role="status" aria-live="polite" style={srOnly}>
          {announcement}
        </div>
      </div>
    </GlassBottomSheet>
  )
}
