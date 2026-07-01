'use client'

import type { CSSProperties } from 'react'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { MAP_PIN_COLORS, STATUS_LABEL, SHEET_COLORS } from '@/features/demo/ui/screens/map/mapTokens'

export interface SheetHandleProps {
  contentMode: 'list' | 'detail'
  locationCount: number
  statusCounts: { started: number; working: number; complete: number }
}

const STATUSES: LocationMapStatus[] = ['started', 'working', 'complete']

const container: CSSProperties = { paddingTop: 8 }
const pillRow: CSSProperties = { display: 'flex', justifyContent: 'center', paddingBottom: 10 }
const pill: CSSProperties = { width: 38, height: 4, borderRadius: 2, background: SHEET_COLORS.handle }
const summary: CSSProperties = { padding: '0 18px 10px' }
const countText: CSSProperties = { fontSize: 16, fontWeight: 700, color: SHEET_COLORS.text }
const badgeRow: CSSProperties = { display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 5 }

const badge = (color: string): CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 5,
  padding: '2px 7px',
  borderRadius: 8,
  border: `1px solid ${color}55`,
  background: `${color}1e`,
  fontSize: 11,
  fontWeight: 700,
  color,
})
const dot = (color: string): CSSProperties => ({ width: 6, height: 6, borderRadius: 3, background: color })

/** The peek-bar handle: drag pill + a live summary (count + status badges in list mode; a title in
 *  detail mode). Presentational — the drag is owned by MapBottomSheet. */
export function SheetHandle({ contentMode, locationCount, statusCounts }: SheetHandleProps) {
  return (
    <div style={container}>
      <div style={pillRow}>
        <div style={pill} />
      </div>
      {contentMode === 'list' ? (
        <div style={summary}>
          <div style={countText}>
            {locationCount} {locationCount === 1 ? 'Location' : 'Locations'}
          </div>
          <div style={badgeRow}>
            {STATUSES.map((s) =>
              statusCounts[s] > 0 ? (
                <span key={s} style={badge(MAP_PIN_COLORS[s])}>
                  <span style={dot(MAP_PIN_COLORS[s])} />
                  <span>
                    {statusCounts[s]} {STATUS_LABEL[s]}
                  </span>
                </span>
              ) : null,
            )}
          </div>
        </div>
      ) : (
        <div style={summary}>
          <div style={countText}>Location Details</div>
        </div>
      )}
    </div>
  )
}
