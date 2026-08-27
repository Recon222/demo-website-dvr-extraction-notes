'use client'

import type { CSSProperties, ReactNode } from 'react'
import { MAP_GLASS_COLORS, type RadiusPreset } from '@/features/demo/ui/screens/map/mapTokens'
import type { MapFilterState } from '@/features/demo/ui/screens/map/mapFilters'
import { colors } from '@/features/demo/ui/tokens/palette'
import { radius, spacing, touchTarget } from '@/features/demo/ui/tokens/scale'

/**
 * The floating map chrome, collapsed to a single search row — port of the phone's PR #127
 * `MapControls.tsx` (`src/features/location/map-view/components/MapControls.tsx` @ `dd5551ec`,
 * collapsed by `1740f226`). Matrix A81, plan §5 U5.2.
 *
 *   [← close]  [🔍 search field ............ ✕  │ ⚙ filters ●]
 *   [◎ 2 km · 5 of 9  ✕]        ← only while proximity is active
 *
 * - The close button REPLACES `MapScreen`'s absolutely-positioned "Change Case" pill, which used
 *   a different colour system and could overlap the count badge. Same gating the pill had.
 * - The filters button (right edge of the search pill) opens `MapFiltersSheet` (U5.3), where the
 *   status filters, the proximity toggle and the radius presets now live. Its badge shows
 *   `filterBadgeCount`; the search text is NOT counted — it is visible in the field itself.
 * - The proximity chip is the one piece of filter state that must stay on the map: proximity is
 *   activated and re-centred by long-pressing the map, so its active state needs a visible on-map
 *   indicator and a one-tap exit. The chip body opens the sheet; the ✕ deactivates.
 *
 * **There is NO collapse/expand animation and no collapsed-icon state.** "Collapsed" names the
 * three-rows-to-one change, not a tap-to-expand affordance. Do not build one.
 *
 * ## The superseded 378px adaptation
 *
 * The pre-#127 demo stacked three rows and documented why (old `:48-53`): *"On the phone the pill
 * and row 1 sit at the same height because a 390-430 pt screen has room beside three status pills;
 * the demo's screen slot is 378 px wide, where they collide. Stacking below is the smallest honest
 * adaptation."* #127 removes the premise by deleting the pills that collided. **Measured at 378:**
 * 12 + 44 (close) + 8 (gap) + pill + 12 = 378 leaves the pill 302px, of which its own chrome takes
 * 12 + 16 + 6 + 44 + 1 + 44 = 123 — so the input keeps 179px, and the proximity chip's row
 * (12 + 15 + 6 + ~90 of text + 44 = ~167) uses under half the width. The single row fits.
 *
 * Presentational: state in via props, intent out via callbacks. Theme resolution happens once in
 * `mapTokens` (`MAP_GLASS_COLORS` is `[scheme]`-indexed), so unlike the phone this takes no
 * `isDark` prop — plan §9 clause 12's shape.
 */

export interface MapControlsProps {
  filters: MapFilterState
  onSearchChange(text: string): void
  /**
   * `SEAM(U5.3)` — opens `MapFiltersSheet`.
   *
   * **OPTIONAL, where the phone's is required** (`MapControls.tsx:47`), and that is this port's
   * one prop-shape divergence. U5.3 builds the sheet; until it lands there is nowhere for the
   * button to go, and this repo's §49a rule is explicit that *"a mount without a handler simply
   * has no button, rather than a button that swallows every press"* — the same gate
   * `onClose`/`onGoToLocation`/`onExportMap` already use (`MapScreen.tsx:58-68`). Omitting it
   * drops the divider, the button and the badge, and demotes the chip body to a plain readout;
   * the chip's ✕ stays live, because long-press can still turn proximity ON.
   */
  onOpenFilters?(): void
  /**
   * The filters button's badge: one per ACTIVE STATUS plus one for proximity. Search text is
   * excluded — it is visible in the field. 0 hides the badge.
   *
   * Per-status, NOT per filter SLOT: the phone computes
   * `(filters.statuses?.length ?? 0) + (proximityIsActive ? 1 : 0)` (`MapHost.tsx:268`), and its
   * own test pins three statuses + proximity at **4** precisely to separate that from
   * `activeFilterCount`'s 2 + 1 (`MapHost.test.tsx:490-521`). `countActiveFilters` is the slot
   * count and is NOT this number.
   */
  filterBadgeCount: number
  /**
   * Renders the back/close button when provided — the demo's "view a different case" route.
   * Omitted where there is nowhere to go back to, exactly as on the phone.
   */
  onClose?(): void
  /** True while the proximity ring is active — renders the summary chip. */
  proximityActive: boolean
  proximityRadius: RadiusPreset
  /** Chip ✕ — deactivates proximity mode. */
  onProximityDeactivate(): void
  /** Total plottable locations after the status/text filters — the chip's "of M". */
  locationCount: number
  /** Locations inside the ring — the chip's "N". */
  filteredCount: number
}

/**
 * The active-filter badge fill. **`primaryDark`, not the phone's flat `primary`** — a deliberate,
 * owner-ruled divergence (D5's amendment, matrix §C.1 row 41, A19's binding rider).
 *
 * The phone paints `Colors.dark.onPrimary` on `Colors.dark.primary` (`MapControls.tsx:181`,
 * `:328`), which measures **3.73:1**. The badge renders a NUMERAL, so §C.3 rule 2's "non-text
 * marks" carve-out does not cover it and the 4.5 text floor applies. `primaryDark` measures
 * **5.80:1**. The phone genuinely ships the 3.73 pairing; this is not drift, and the divergence
 * is named in the PR body.
 *
 * (The hexes are named in `tokens/palette.ts` and nowhere else, deliberately: quoting
 * `primaryDark`'s literal even in this comment reds `glass-tokens.test.ts`'s banned-literal
 * scan, which reads raw text — U5.1 tripped the same wire three times.)
 *
 * Exported so `palette-contrast.test.ts` pins the ratio **at the constant the component paints**
 * rather than at `palette.primaryDark` — a pin against the palette stays green through exactly
 * the edit it exists to catch (U0.5's `SwipeDeleteAction` lesson; the `MEDIA_CLOSE_CHIP`
 * precedent at `MediaLibrarySheet.tsx`).
 */
export const MAP_FILTER_BADGE_FILL: string = colors.primaryDark

/**
 * PhoneFrame's status bar is `height: 50` (`PhoneFrame.tsx:100`) and paints above the screen
 * slot. It is the demo's `safeAreaTop`: the phone applies `paddingTop: insets.top` on the outer
 * container and then `paddingTop: Layout.spacing.sm` on the inner one (`MapControls.tsx:107`,
 * `:251`), and this reproduces both.
 *
 * The demo used to sit at `top: 92`, which cleared the "Change Case" pill at `top: 58`. That pill
 * is deleted, so the clearance goes with it. (The phone's own stale `paddingTop: 28` — the Mapbox
 * scale-bar ornament — never existed here; it is phone history, not demo history.)
 */
const DEMO_STATUS_BAR = 50

const outerContainer: CSSProperties = {
  position: 'absolute',
  top: 0,
  left: 0,
  right: 0,
  // The demo's own z-scheme, deliberately NOT the phone's `Layout.zIndex.sticky` 1020: D14 rules
  // z-index reconciliation out of scope, and 1020 would put the floating chrome above the bottom
  // sheet (20), the map error overlay (25), the case picker (30), the call sheet (48) and the
  // notification (60).
  zIndex: 15,
  // `box-none` on the phone: map drags must pass BETWEEN the controls. Each painted surface
  // restores `auto`.
  pointerEvents: 'none',
}

const innerPadding: CSSProperties = {
  paddingLeft: 12,
  paddingRight: 12,
  paddingTop: DEMO_STATUS_BAR + spacing.sm,
  display: 'flex',
  flexDirection: 'column',
  gap: spacing.sm,
}

const row: CSSProperties = { display: 'flex', alignItems: 'center', gap: spacing.sm }

/** `0 1px 4px` — the CSS spelling of the phone's iOS shadow (offset 0/1, opacity 1, radius 4). */
const surfaceShadow = `0 1px 4px ${MAP_GLASS_COLORS.shadow}`

/** One fill for every floating surface. `inputBg` was deleted with the redesign — do not add a second. */
const surface: CSSProperties = {
  background: MAP_GLASS_COLORS.containerBg,
  border: `1px solid ${MAP_GLASS_COLORS.border}`,
  boxShadow: surfaceShadow,
  pointerEvents: 'auto',
}

const closeButton: CSSProperties = {
  ...surface,
  width: touchTarget.min,
  height: touchTarget.min,
  flex: '0 0 auto',
  borderRadius: radius.full,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: MAP_GLASS_COLORS.text,
  cursor: 'pointer',
  padding: 0,
}

const searchPill: CSSProperties = {
  ...surface,
  flex: 1,
  minWidth: 0,
  display: 'flex',
  alignItems: 'center',
  paddingLeft: 12,
  borderRadius: radius.full,
  height: touchTarget.min,
}

const searchInput: CSSProperties = {
  flex: 1,
  minWidth: 0,
  height: '100%',
  border: 'none',
  outline: 'none',
  background: 'transparent',
  color: MAP_GLASS_COLORS.text,
  fontSize: 14,
  fontFamily: 'inherit',
}

/**
 * The inline icon buttons inside the pill. Full pill height and ≥44 wide — real touch targets,
 * for the phone's own stated reason: hitSlop outside a tightly-wrapped parent is not dispatched
 * on Android, and the web has no hitSlop at all (DEF-UI-019).
 */
const inlineButton: CSSProperties = {
  position: 'relative',
  height: '100%',
  minWidth: touchTarget.min,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  border: 'none',
  background: 'transparent',
  padding: 0,
  cursor: 'pointer',
  color: MAP_GLASS_COLORS.text,
}

const filterDivider: CSSProperties = {
  width: 1,
  height: 22,
  flex: '0 0 auto',
  background: MAP_GLASS_COLORS.border,
}

const badge: CSSProperties = {
  position: 'absolute',
  top: 6,
  right: 4,
  minWidth: 16,
  height: 16,
  borderRadius: radius.full,
  paddingLeft: 4,
  paddingRight: 4,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: MAP_FILTER_BADGE_FILL,
  color: colors.onPrimary,
  fontSize: 10,
  fontWeight: 700,
  lineHeight: 1,
}

const chip: CSSProperties = {
  ...surface,
  display: 'inline-flex',
  alignItems: 'center',
  borderRadius: radius.full,
  height: touchTarget.min,
}

const chipBody: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: spacing.xsm,
  paddingLeft: 12,
  height: '100%',
  border: 'none',
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'inherit',
  padding: '0 0 0 12px',
}

const chipText: CSSProperties = { fontSize: 12, fontWeight: 600, color: MAP_GLASS_COLORS.text, whiteSpace: 'nowrap' }

// --- icons: the demo's inline-SVG idiom (24 viewBox, currentColor, aria-hidden) ---------------

function Icon({ size, stroke = 2, children }: { size: number; stroke?: number; children: ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ flex: '0 0 auto' }}
    >
      {children}
    </svg>
  )
}

/** Ionicons `arrow-back` — the same path `WizardDrawer.tsx:389` already draws. */
const ArrowBack = () => (
  <Icon size={20}>
    <path d="M19 12H5M12 19l-7-7 7-7" />
  </Icon>
)
/** Ionicons `search`. */
const Search = () => (
  <Icon size={16}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.6-3.6" />
  </Icon>
)
/** Ionicons `close-circle`. */
const CloseCircle = () => (
  <Icon size={18}>
    <circle cx="12" cy="12" r="9" />
    <path d="M15 9l-6 6M9 9l6 6" />
  </Icon>
)
/** Ionicons `options-outline` — the sliders glyph that opens the filters sheet. */
const Options = () => (
  <Icon size={20}>
    <path d="M4 7h8M16 7h4M4 12h4M12 12h8M4 17h8M16 17h4" />
    <circle cx="14" cy="7" r="2" />
    <circle cx="8" cy="12" r="2" />
    <circle cx="14" cy="17" r="2" />
  </Icon>
)
/** Ionicons `locate-outline` — the proximity chip's mark. Decorative: the chip's own text
 *  carries every bit of its meaning, which is why 1.4.11's 3:1 does not bind it (it measures
 *  2.27:1 on the chrome over a white tile — recorded, not hidden). */
const Locate = () => (
  <Icon size={15}>
    <circle cx="12" cy="12" r="5" />
    <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
  </Icon>
)

export function MapControls({
  filters,
  onSearchChange,
  onOpenFilters,
  filterBadgeCount,
  onClose,
  proximityActive,
  proximityRadius,
  onProximityDeactivate,
  locationCount,
  filteredCount,
}: MapControlsProps) {
  const searchText = filters.searchText
  const summary = `${proximityRadius} km · ${filteredCount} of ${locationCount}`

  return (
    <div data-map-controls data-testid="map-controls-container" style={outerContainer}>
      <div style={innerPadding}>
        {/* ---- Search row: [close] [search field + clear + filters] ---- */}
        <div style={row}>
          {onClose && (
            <button
              type="button"
              data-testid="map-close-button"
              onClick={onClose}
              aria-label="Change case"
              // The phone's `accessibilityHint`, verbatim. On the web a hint rides as the
              // tooltip — the repo's convention (`WizardDrawer.tsx:262-264`).
              title="Returns to the case picker"
              style={closeButton}
            >
              <ArrowBack />
            </button>
          )}

          <div data-testid="map-search-pill" style={searchPill}>
            <span style={{ display: 'flex', marginRight: spacing.xsm, color: MAP_GLASS_COLORS.textSecondary }}>
              <Search />
            </span>
            <input
              data-testid="map-search-input"
              type="text"
              placeholder="Search locations..."
              aria-label="Search locations"
              value={searchText}
              onChange={(e) => onSearchChange(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              style={searchInput}
            />

            {searchText.length > 0 && (
              <button
                type="button"
                data-testid="map-search-clear"
                onClick={() => onSearchChange('')}
                aria-label="Clear search"
                style={{ ...inlineButton, color: MAP_GLASS_COLORS.textSecondary }}
              >
                <CloseCircle />
              </button>
            )}

            {onOpenFilters && (
              <>
                <div data-testid="map-filter-divider" style={filterDivider} />
                <button
                  type="button"
                  data-testid="map-open-filters"
                  onClick={onOpenFilters}
                  aria-label={
                    filterBadgeCount > 0 ? `Open map filters, ${filterBadgeCount} active` : 'Open map filters'
                  }
                  style={inlineButton}
                >
                  <Options />
                  {filterBadgeCount > 0 && (
                    <span data-testid="map-filter-badge" style={badge}>
                      {filterBadgeCount}
                    </span>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* ---- Proximity summary chip — the only filter state that stays on the map
             (activated by long-press, so it needs a visible exit) ---- */}
        {proximityActive && (
          <div style={row}>
            <div data-testid="proximity-chip" style={chip}>
              {onOpenFilters ? (
                <button
                  type="button"
                  data-testid="proximity-chip-body"
                  onClick={onOpenFilters}
                  aria-label={`Proximity filter, ${proximityRadius} kilometre radius, showing ${filteredCount} of ${locationCount} locations`}
                  title="Opens map filters"
                  style={chipBody}
                >
                  <ProximitySummary text={summary} />
                </button>
              ) : (
                // No sheet wired yet (SEAM(U5.3)): a readout, never a button that does nothing.
                <div data-testid="proximity-chip-body" style={chipBody}>
                  <ProximitySummary text={summary} />
                </div>
              )}
              <button
                type="button"
                data-testid="proximity-chip-dismiss"
                onClick={onProximityDeactivate}
                aria-label="Deactivate proximity mode"
                style={{ ...inlineButton, color: MAP_GLASS_COLORS.textSecondary }}
              >
                <CloseCircle />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The chip's mark + count.
 *
 * `role="status"` is the demo's own (review R-7a), carried across from the count pill this
 * redesign deletes: that pill was *"the ONLY feedback the filter, search and proximity controls
 * give"*, and the chip is the surface that inherited its "N of M". The phone has no live region
 * here; the demo keeps one because it kept the promise.
 */
function ProximitySummary({ text }: { text: string }) {
  return (
    <>
      <span style={{ display: 'flex', color: MAP_GLASS_COLORS.primary }}>
        <Locate />
      </span>
      <span data-testid="proximity-chip-summary" role="status" style={chipText}>
        {text}
      </span>
    </>
  )
}
