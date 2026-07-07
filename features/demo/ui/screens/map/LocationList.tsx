'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { LocationRow } from '@/features/demo/ui/screens/map/LocationRow'
import { SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

export interface LocationListProps {
  items: SheetItem[]
  selectedId: string | null
  onSelect(id: string): void
}

const list: CSSProperties = { padding: '4px 14px 18px' }
const empty: CSSProperties = { padding: '24px 16px', textAlign: 'center', color: SHEET_COLORS.textFaint, fontSize: 13, lineHeight: 1.6 }

export function LocationList({ items, selectedId, onSelect }: LocationListProps) {
  if (items.length === 0) {
    return <div style={empty}>No located locations yet — add an address to a location to plot it here.</div>
  }
  return (
    <div style={list}>
      {items.map((it) => (
        <LocationRow key={it.id} item={it} selected={it.id === selectedId} onSelect={onSelect} />
      ))}
    </div>
  )
}
