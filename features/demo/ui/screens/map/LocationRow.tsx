'use client'

import type { CSSProperties } from 'react'
import type { SheetItem } from '@/features/demo/ui/screens/map/mapData'
import { MAP_PIN_COLORS, SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

export interface LocationRowProps {
  item: SheetItem
  selected: boolean
  onSelect(id: string): void
}

const rowBtn = (selected: boolean, color: string): CSSProperties => ({
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  textAlign: 'left',
  padding: '13px 14px',
  margin: '0 0 8px',
  borderRadius: 12,
  border: `1px solid ${selected ? `${color}50` : SHEET_COLORS.rowBorder}`,
  background: selected ? `${color}14` : SHEET_COLORS.rowBg,
  cursor: 'pointer',
})
const statusDot = (color: string): CSSProperties => ({ width: 10, height: 10, borderRadius: 5, background: color, flex: '0 0 auto', boxShadow: `0 0 6px ${color}88` })
const name: CSSProperties = { fontSize: 14, fontWeight: 700, color: SHEET_COLORS.text }
const biz: CSSProperties = { fontSize: 11, color: SHEET_COLORS.textFaint, fontStyle: 'italic', marginTop: 1 }
const addr: CSSProperties = { fontSize: 11, color: SHEET_COLORS.textDim, marginTop: 2 }
const chevron: CSSProperties = { fontSize: 20, color: SHEET_COLORS.textDim, fontWeight: 300, marginLeft: 'auto', flex: '0 0 auto' }
const chip: CSSProperties = { fontSize: 10, fontWeight: 700, color: MAP_PIN_COLORS.incident, textTransform: 'uppercase', letterSpacing: 0.4, marginTop: 1 }

/** A glass row in the location list — location variant (status dot + name + business + address) or
 *  incident variant (red dot + headline + "Incident" chip). Pressable. */
export function LocationRow({ item, selected, onSelect }: LocationRowProps) {
  if (item.kind === 'incident') {
    const headline = item.displayName || item.caseNumber
    return (
      <button type="button" data-testid="location-row" onClick={() => onSelect(item.id)} style={rowBtn(selected, MAP_PIN_COLORS.incident)}>
        <span style={statusDot(MAP_PIN_COLORS.incident)} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={name}>{headline}</div>
          <div style={chip}>Incident</div>
          {item.address && <div style={addr}>{item.address}</div>}
        </div>
        <span style={chevron}>{'›'}</span>
      </button>
    )
  }
  const color = MAP_PIN_COLORS[item.status]
  return (
    <button type="button" data-testid="location-row" onClick={() => onSelect(item.id)} style={rowBtn(selected, color)}>
      <span style={statusDot(color)} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={name}>{item.locationName}</div>
        {item.businessName && <div style={biz}>{item.businessName}</div>}
        {item.address && <div style={addr}>{item.address}</div>}
      </div>
      <span style={chevron}>{'›'}</span>
    </button>
  )
}
