'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

export interface LocationListProps {
  items: SheetItem[]
  selectedId: string | null
  onSelect(id: string): void
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
   * map opens, not on the click), and `aria-busy` says why to anyone who cannot see the state.
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

const list: CSSProperties = { padding: '4px 14px 18px' }
const empty: CSSProperties = { padding: '24px 16px', textAlign: 'center', color: SHEET_COLORS.textFaint, fontSize: 13, lineHeight: 1.6 }
const footer: CSSProperties = { padding: '8px 14px 20px' }
/** The phone's export CTA (`LocationList.tsx:114-132`): 50 high, radius 14, the same CTA
 *  gradient as the detail card's "Go to Location", icon + label centred with an 8px gap. */
const exportButton: CSSProperties = {
  width: '100%',
  height: 50,
  borderRadius: 14,
  border: 'none',
  background: 'linear-gradient(135deg,#1a8fc2,#0f6f9e)',
  color: '#fff',
  fontSize: 15,
  fontWeight: 700,
  letterSpacing: -0.2,
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 8,
  boxShadow: '0 4px 16px rgba(26,143,194,0.35)',
}

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
        aria-label={EXPORT_MAP_A11Y_LABEL}
        onClick={onExportMap}
        disabled={disabled}
        // Only the chunk fetch is "busy"; a dialog covering the button is not work in progress.
        aria-busy={pending || undefined}
        style={disabled ? { ...exportButton, opacity: 0.55, cursor: pending ? 'progress' : 'default' } : exportButton}
      >
        {/* Ionicons `map-outline` — the phone's icon, the same path the Map tab draws. */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V3l-6 2.5L9 4z" />
          <path d="M9 4v13.5M15 6.5V20" />
        </svg>
        {EXPORT_MAP_LABEL}
      </button>
    </div>
  )
}

export function LocationList({ items, selectedId, onSelect, onExportMap, exportMapPending, exportMapBlocked }: LocationListProps) {
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
        <div style={empty}>No located locations yet — add an address to a location to plot it here.</div>
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
