'use client'

import { useCallback, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MapCanvas, type MapCanvasHandle } from '@/features/demo/ui/screens/map/MapCanvas'
import { buildMarkers } from '@/features/demo/ui/screens/map/buildMarkers'
import { MapBottomSheet } from '@/features/demo/ui/screens/map/MapBottomSheet'
import type { MapData } from '@/features/demo/ui/screens/map/mapData'

const FLY_ZOOM = 16
const backBtn: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '6px 12px',
  borderRadius: 16,
  border: 'none',
  background: 'rgba(43,140,193,0.14)',
  color: '#4ba3d4',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

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
  const [snapIndex, setSnapIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<'list' | 'detail'>('list')
  const mapRef = useRef<MapCanvasHandle>(null)

  // Tap a pin or a row → fly the camera to it and open its detail (at least the partial detent).
  const selectItem = useCallback(
    (id: string) => {
      const item = mapData.items.find((i) => i.id === id)
      if (!item) return
      mapRef.current?.flyTo(item.coord[0], item.coord[1], FLY_ZOOM)
      setSelectedId(id)
      setSheetMode('detail')
      setSnapIndex((i) => Math.max(i, 1))
    },
    [mapData.items],
  )

  const back = useCallback(() => {
    setSheetMode('list')
    setSelectedId(null)
    setSnapIndex(1)
  }, [])

  // A stale selection (after a case switch) falls back to the list.
  const selectedItem = mapData.items.find((i) => i.id === selectedId) ?? null
  const contentMode = sheetMode === 'detail' && selectedItem ? 'detail' : 'list'
  const detail = selectedItem ? (
    <div data-map-detail style={{ padding: 16 }}>
      <button type="button" onClick={back} style={backBtn}>
        {'‹'} All Locations
      </button>
      <div style={{ fontSize: 18, fontWeight: 700, color: '#e7eef6', marginTop: 12 }}>
        {selectedItem.kind === 'location' ? selectedItem.locationName : selectedItem.displayName || selectedItem.caseNumber}
      </div>
    </div>
  ) : null

  return (
    <div data-map-screen style={{ position: 'absolute', inset: 0, background: '#0a1422' }}>
      {viewerCaseId === null ? (
        <div style={emptyStyle}>
          <div style={{ fontWeight: 600, color: '#cdd9e6', marginBottom: 6 }}>No case selected</div>
          <div>Pick a case to view its locations on the map.</div>
        </div>
      ) : (
        <>
          <MapCanvas ref={mapRef} markers={markers} onMarkerPress={selectItem} />
          {onChangeCase && (
            <button type="button" onClick={onChangeCase} style={changeCasePill}>
              Change Case
            </button>
          )}
          <MapBottomSheet
            items={mapData.items}
            statusCounts={mapData.statusCounts}
            snapIndex={snapIndex}
            onSnapChange={setSnapIndex}
            contentMode={contentMode}
            selectedId={selectedId}
            onSelect={selectItem}
            detail={detail}
          />
        </>
      )}
    </div>
  )
}
