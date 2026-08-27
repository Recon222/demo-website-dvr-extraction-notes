'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { buttonStyle } from '@/features/demo/ui/controls/button-recipe'
import { EmptyState } from '@/features/demo/ui/controls/EmptyState'
import { spacing } from '@/features/demo/ui/tokens/scale'

/**
 * Why the empty state is discriminated (review R-6): one sentence cannot be true of three
 * different situations. "No located locations yet — add an address…" is a statement about the
 * visitor's DATA, and firing it after a zero-match filter tells someone with three geocoded
 * locations that they have none — then prescribes an action that would not bring the rows back.
 *
 * The phone has no empty-state copy here at all (blank list), so this false sentence is
 * demo-only and the fix has to be demo-only too.
 */
export type SheetEmptyReason = 'no-data' | 'filters' | 'proximity'

export interface LocationListProps {
  items: SheetItem[]
  selectedId: string | null
  onSelect(id: string): void
  /** Which stage emptied the list. Consulted only when `items` is empty. */
  emptyReason?: SheetEmptyReason
  /** Offered as the recovery affordance for the `'filters'` reason. */
  onClearFilters?(): void
  /**
   * Case-level "Export Map" action, rendered as the list footer (P5.4). Omit to hide it —
   * the phone's own contract, verbatim: "Rendered only when `onExportMap` prop supplied"
   * (ui-mapping 03:182; phone `LocationList.tsx:67` returns `null` without it). The route
   * host owns the export itself; this component only reports the press.
   */
  onExportMap?(): void
  /**
   * The Case Map builder — a lazy chunk — has not arrived yet (review R-8).
   *
   * The button disables rather than accepting the press, because the alternative is what this
   * finding was about: a press that produces nothing visible while the network works, a second
   * press, and N builds/downloads from N presses. Held briefly (the chunk is fetched when the
   * map opens, not on the click), and the accessible NAME carries the reason (delta D-10).
   */
  exportMapPending?: boolean
  /**
   * Something else owns the export flow, so the footer is not live (review R-8, delta D-4).
   *
   * The phone's `Alert.alert` is OS-modal — nothing underneath it can be pressed. The demo's
   * overlays render their own scrims, which stop a real pointer, but "the overlay happens to
   * cover it" is geometry rather than a contract: the same reasoning §70i rejected for the
   * validation prompt. Disabling says it.
   *
   * THREE states, not one (D-4). The original term covered only the terminal alert — the state
   * where a press is at worst redundant. The two it missed are the ones where a press VANISHES:
   * with the validation prompt open, `requestExportFlow`'s §70i guard returns early; with a ZIP
   * running, the engine's entry guard returns `ignored`. Both are reachable because the demo's
   * narration rail sits outside the phone and can jump the visitor to the Map tab mid-flow, and
   * neither overlay traps focus or sets `inert`, so the button stays keyboard-reachable.
   */
  exportMapBlocked?: boolean
}

/**
 * phone `styles.listContent` `:94-97` — `paddingTop: sm`, `paddingBottom: lg`, and no horizontal
 * padding because each row carries `marginHorizontal: md` there. On the web the inset lives here
 * instead, so a `width: 100%` row cannot overflow it; the rendered geometry is the phone's.
 */
const list: CSSProperties = { padding: `${spacing.sm}px ${spacing.md}px ${spacing.lg}px` }
/** The horizontal inset only — `EmptyState` owns the block's own 48pt padding (A80). */
const empty: CSSProperties = { padding: `0 ${spacing.md}px` }
/** A80's action slot: "optional primary Button `minWidth 200`". `EmptyState` sets the min width. */
const clearButton: CSSProperties = { ...buttonStyle({ variant: 'primary' }), width: '100%', fontFamily: 'inherit' }

export const EMPTY_COPY: Record<SheetEmptyReason, string> = {
  'no-data': 'No located locations yet — add an address to a location to plot it here.',
  filters: 'No locations match your filters.',
  proximity: 'No locations inside the proximity radius — widen it or turn Proximity off.',
}

/** phone `styles.footer` `:101-104` — `paddingHorizontal: md`, `paddingTop: sm`. The bottom
 *  24 is `listContent`'s `paddingBottom` on the phone, where the footer is INSIDE the list. */
const footer: CSSProperties = { padding: `${spacing.sm}px ${spacing.md}px ${spacing.lg}px` }
/**
 * The export CTA — phone `LocationList.tsx:66-77`, a `<Button variant="primary" fullWidth>`.
 *
 * The demo's copy of `linear-gradient(135deg,#1a8fc2,#0f6f9e)` + `0 4px 16px rgba(26,143,194,0.35)`
 * at height 50 / radius 14 is gone, and so is the `map-outline` icon (PR #118 D-4). The phone
 * records why the local button went, at `styles.footer` `:98-100`: *"The CTA is the shared
 * <Button variant=\"primary\">, so this only positions it. It used to be a locally-authored
 * gradient button (one of six local button implementations on this screen, at a seventh height
 * and radius)."*
 *
 * A68 + PR #127 `e882912f`: `medium`, the recipe's default — no `size=\"large\"` in the map view.
 */
const exportButton = (disabled: boolean): CSSProperties => ({
  ...buttonStyle({ variant: 'primary', disabled }),
  width: '100%',
})

/** Phone copy, verbatim (ui-mapping 03:182; `LocationList.tsx:71-83`). */
export const EXPORT_MAP_LABEL = 'Export Map'
/** Phone `accessibilityLabel` (`LocationList.tsx:73`). */
export const EXPORT_MAP_A11Y_LABEL = 'Export case map'

function ExportMapFooter({
  onExportMap,
  pending,
  blocked,
}: {
  onExportMap(): void
  pending: boolean
  blocked: boolean
}) {
  const disabled = pending || blocked
  return (
    <div style={footer}>
      <button
        type="button"
        data-testid="export-map-button"
        // The state rides on the NAME, not on `aria-busy` (delta D-10). A `disabled` button is
        // out of the tab order, carries no spinner here and never changes its label, so
        // `aria-busy` had nothing to announce it to and no change to announce — it read as
        // diligence while reaching no one. The accessible name IS reachable: a screen reader's
        // browse cursor still visits a disabled control and reads it out. Demo-only state (the
        // phone has no lazy chunk), so the phone-verbatim label is unchanged in every state a
        // phone user can be in.
        aria-label={pending ? `${EXPORT_MAP_A11Y_LABEL} (preparing)` : EXPORT_MAP_A11Y_LABEL}
        onClick={onExportMap}
        disabled={disabled}
        // The disabled PAINT is the recipe's own arm (`colors.disabled` fill, `disabledText`
        // label), not the demo's old `opacity: 0.55` over a live gradient — an idiom
        // `button-recipe.ts:20-23` records as one the phone does not have. Only the cursor is
        // overridden, because `progress` says "held briefly" where `not-allowed` says "no".
        style={pending ? { ...exportButton(true), cursor: 'progress' } : exportButton(disabled)}
      >
        {/* PR #118 D-4 dropped the `map-outline` icon; the phone's CTA is label-only. */}
        {EXPORT_MAP_LABEL}
      </button>
    </div>
  )
}

export function LocationList({ items, selectedId, onSelect, emptyReason = 'no-data', onClearFilters, onExportMap, exportMapPending, exportMapBlocked }: LocationListProps) {
  // The footer rides BELOW the rows in both branches: on the phone it is the FlatList's
  // `ListFooterComponent`, which renders whether or not there is any data. A case whose
  // sites have no coordinates yet can still export its map (incident pin, header, timeline)
  // — and the handler says out loud when the file will open empty.
  const exportFooter = onExportMap ? (
    <ExportMapFooter
      onExportMap={onExportMap}
      pending={exportMapPending ?? false}
      blocked={exportMapBlocked ?? false}
    />
  ) : null

  if (items.length === 0) {
    return (
      <>
        {/* A80's tenth site. The three-reason discrimination above is demo-only (the phone shows
            a blank list) and is unchanged; only the chrome moves onto the shared recipe, whose
            docblock names this file as an expected first caller. */}
        <div data-testid="map-sheet-empty" data-empty-reason={emptyReason} style={empty}>
          <EmptyState
            message={EMPTY_COPY[emptyReason]}
            action={
              emptyReason === 'filters' && onClearFilters ? (
                <button type="button" data-testid="map-sheet-clear-filters" onClick={onClearFilters} style={clearButton}>
                  Clear filters
                </button>
              ) : undefined
            }
          />
        </div>
        {exportFooter}
      </>
    )
  }
  return (
    <>
      <div style={list}>
        {items.map((it) => (
          <LocationRow key={it.id} item={it} selected={it.id === selectedId} onSelect={onSelect} />
        ))}
      </div>
      {exportFooter}
    </>
  )
}
