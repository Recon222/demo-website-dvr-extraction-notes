'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

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
}

const list: CSSProperties = { padding: '4px 14px 18px' }
const empty: CSSProperties = { padding: '24px 16px', textAlign: 'center', color: SHEET_COLORS.textFaint, fontSize: 13, lineHeight: 1.6 }
const clearButton: CSSProperties = {
  marginTop: 12,
  padding: '7px 16px',
  borderRadius: 16,
  border: `1px solid ${SHEET_COLORS.rowBorder}`,
  background: 'rgba(43,140,193,0.14)',
  color: '#4ba3d4',
  fontSize: 13,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

export const EMPTY_COPY: Record<SheetEmptyReason, string> = {
  'no-data': 'No located locations yet — add an address to a location to plot it here.',
  filters: 'No locations match your filters.',
  proximity: 'No locations inside the proximity radius — widen it or turn Proximity off.',
}

export function LocationList({ items, selectedId, onSelect, emptyReason = 'no-data', onClearFilters }: LocationListProps) {
  if (items.length === 0) {
    return (
      <div data-testid="map-sheet-empty" data-empty-reason={emptyReason} style={empty}>
        <div>{EMPTY_COPY[emptyReason]}</div>
        {emptyReason === 'filters' && onClearFilters && (
          <button type="button" data-testid="map-sheet-clear-filters" onClick={onClearFilters} style={clearButton}>
            Clear filters
          </button>
        )}
      </div>
    )
  }
  return (
    <div style={list}>
      {items.map((it) => (
        <LocationRow key={it.id} item={it} selected={it.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  )
}
