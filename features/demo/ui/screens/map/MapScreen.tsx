'use client'

import { useMemo } from 'react'
import type { CSSProperties } from 'react'
import { MapCanvas } from '@/features/demo/ui/screens/map/MapCanvas'
import { buildMarkers } from '@/features/demo/ui/screens/map/buildMarkers'
import type { MapData } from '@/features/demo/ui/screens/map/mapData'

export interface MapScreenProps {
  /** The tab-local viewer case (distinct from the form's current case). `null` → pick-a-case prompt. */
  viewerCaseId: string | null
  /** The viewer case's projected map data (pins, incident, sheet items). */
  mapData: MapData
  /** Opens the (dismissible) case picker to view a different case. */
  onChangeCase?(): void
}

const changeCasePill: CSSProperties = {
  position: 'absolute',
  top: 58,
  right: 12,
  zIndex: 16,
  padding: '7px 12px',
  borderRadius: 999,
  border: '1px solid rgba(40,69,107,0.9)',
  background: 'rgba(13,27,42,0.82)',
  color: '#cdd9e6',
  fontSize: 12,
  fontWeight: 600,
  cursor: 'pointer',
}

const emptyStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 32,
  color: '#9fb6d0',
  fontSize: 14,
  lineHeight: 1.6,
}

/**
 * The map orchestrator (the demo's analog of the phone's MapHost). Presentational: data + callbacks
 * via props, no store. It owns only ephemeral interaction state (added in later slices). For now it
 * shows the live map when a viewer case is chosen, else a prompt (the picker arrives in Slice 3).
 */
export function MapScreen({ viewerCaseId, mapData, onChangeCase }: MapScreenProps) {
  const markers = useMemo(() => buildMarkers(mapData), [mapData])
  return (
    <div data-map-screen style={{ position: 'absolute', inset: 0, background: '#0a1422' }}>
      {viewerCaseId === null ? (
        <div style={emptyStyle}>
          <div style={{ fontWeight: 600, color: '#cdd9e6', marginBottom: 6 }}>No case selected</div>
          <div>Pick a case to view its locations on the map.</div>
        </div>
      ) : (
        <>
          <MapCanvas markers={markers} />
          {onChangeCase && (
            <button type="button" onClick={onChangeCase} style={changeCasePill}>
              Change Case
            </button>
          )}
        </>
      )}
    </div>
  )
}
