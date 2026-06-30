'use client'

import type { CSSProperties } from 'react'
import { MapCanvas } from '@/features/demo/ui/screens/map/MapCanvas'

export interface MapScreenProps {
  /** The tab-local viewer case (distinct from the form's current case). `null` → pick-a-case prompt. */
  viewerCaseId: string | null
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
export function MapScreen({ viewerCaseId }: MapScreenProps) {
  return (
    <div data-map-screen style={{ position: 'absolute', inset: 0, background: '#0a1422' }}>
      {viewerCaseId === null ? (
        <div style={emptyStyle}>
          <div style={{ fontWeight: 600, color: '#cdd9e6', marginBottom: 6 }}>No case selected</div>
          <div>Pick a case to view its locations on the map.</div>
        </div>
      ) : (
        <MapCanvas />
      )}
    </div>
  )
}
