'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MapCanvas, type MapCanvasHandle } from '@/features/demo/ui/screens/map/MapCanvas'
import { buildFitPoints, buildMarkers } from '@/features/demo/ui/screens/map/buildMarkers'
import { MapBottomSheet } from '@/features/demo/ui/screens/map/MapBottomSheet'
import { MapControls } from '@/features/demo/ui/screens/map/MapControls'
import { LocationDetailCard } from '@/features/demo/ui/screens/map/LocationDetailCard'
import { CallConfirmSheet } from '@/features/demo/ui/screens/map/CallConfirmSheet'
import { DemoNotification } from '@/features/demo/ui/screens/map/DemoNotification'
import { countLocations, type MapCameraMarker, type MapData } from '@/features/demo/ui/screens/map/mapData'
import type { SheetEmptyReason } from '@/features/demo/ui/screens/map/LocationList'
import {
  EMPTY_MAP_FILTERS,
  applyMapFilters,
  countActiveFilters,
  toggleStatus,
  type MapFilterState,
} from '@/features/demo/ui/screens/map/mapFilters'
import { DEFAULT_MAP_CENTER, DEFAULT_PROXIMITY_RADIUS, type RadiusPreset } from '@/features/demo/ui/screens/map/mapTokens'
import type { ProximityResult } from '@/features/demo/ui/screens/map/mapProximity'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'

const FLY_ZOOM = 16
const CALL_UNAVAILABLE = "Calling isn't available in the demo."
const EMAIL_UNAVAILABLE = "Email isn't available in the demo."
/**
 * Proximity analysis lives in a lazily-fetched chunk (Turf). When that fetch fails — a
 * post-redeploy `ChunkLoadError`, an offline blip, a blocking proxy — the honest answer is to
 * say so and leave the control OFF, never to light up "Proximity ON" over a map that is not
 * filtering (§49a/R-9: a control must not assert what it cannot do).
 */
const PROXIMITY_UNAVAILABLE = "Proximity analysis couldn't load. Check your connection and try again."
/**
 * Said once, when the ring's centre was chosen FOR the visitor rather than taken from a row they
 * can see (review R-18a). Reachable whenever nothing is plotted — including after a zero-match
 * filter, since the anchor chain reads the post-filter list — and without it the ring simply
 * appears somewhere, filtering against a point nobody picked.
 */
const PROXIMITY_CENTRED_ON_VIEW = 'Proximity centred on the current view — long-press the map to move it.'

/** Stable empty list — a fresh `[]` per render would re-plot MapCanvas's markers every commit. */
const NO_CAMERAS: readonly MapCameraMarker[] = Object.freeze([])


type ProximityModule = typeof import('@/features/demo/ui/screens/map/mapProximity')

export interface MapScreenProps {
  /** The tab-local viewer case (distinct from the form's current case). `null` → pick-a-case prompt. */
  viewerCaseId: string | null
  /** The viewer case's projected map data (pins, incident, sheet items). */
  mapData: MapData
  /** Opens the (dismissible) case picker to view a different case. */
  onChangeCase?(): void
  /** Hands off to the wizard for a location (switches the form's case/location). */
  onGoToLocation?(id: string): void
  /**
   * Opens the incident-location editor for the viewer case (matrix rows 22 → 23).
   *
   * REQUIRED, unlike its two neighbours (review R-14). Those gate their own affordances; this
   * one's CTA — the full-size primary "Edit Incident Location" — rendered unconditionally, so a
   * handler-less mount would have shipped a button that swallows every press. §49a chose the
   * opposite shape one package earlier for exactly this reason ("a button that cannot do what
   * it says would break the demo's honesty rule"), and gates `CaseActionsSheet`'s Edit Case on
   * the prop's presence. This is the first contract added AFTER that precedent was written
   * down; requiring the prop is the cheaper of the two ways to honour it, since the bridge
   * already passes it and no caller wants the CTA hidden.
   */
  onEditIncident(caseId: string): void
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
 * The map orchestrator (the demo's analog of the phone's MapHost). Presentational: data +
 * callbacks via props, no store. It owns every piece of ephemeral interaction state the phone's
 * host owns through its four hooks — filters (`useMapFilter`), proximity (`useProximity`), camera
 * visibility (`useCameraVisibility`) and sheet/selection (`useBottomSheet`) — none of which the
 * phone persists, so none of which belongs in the demo store either.
 *
 * The projection pipeline mirrors MapHost.tsx:248-268 exactly:
 *   mapData → applyMapFilters → (proximity) → display → markers / sheet / counts
 */
export function MapScreen({ viewerCaseId, mapData, onChangeCase, onGoToLocation, onEditIncident }: MapScreenProps) {
  const [snapIndex, setSnapIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<'list' | 'detail'>('list')
  const [pendingCall, setPendingCall] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const mapRef = useRef<MapCanvasHandle>(null)

  // ---- filters (phone useMapFilter) ---------------------------------------------------------
  const [filters, setFilters] = useState<MapFilterState>(EMPTY_MAP_FILTERS)

  // ---- proximity (phone useProximity) -------------------------------------------------------
  // Turf arrives with the module, which is fetched on the first activation so it never lands in
  // the demo's own chunk. `proximityModule` is state (not just a ref) so the first computed
  // result renders as soon as it resolves.
  const [proximityModule, setProximityModule] = useState<ProximityModule | null>(null)
  const proximityLoadRef = useRef<Promise<ProximityModule | null> | null>(null)
  const [proximityActive, setProximityActive] = useState(false)
  const [proximityCenter, setProximityCenter] = useState<[number, number] | null>(null)
  const [proximityRadius, setProximityRadius] = useState<RadiusPreset>(DEFAULT_PROXIMITY_RADIUS)

  /**
   * Fetch the Turf chunk once, and — on failure — leave NOTHING poisoned (review R-2).
   *
   * The memoised promise is the trap: a rejected promise parked in the ref makes the
   * `if (!proximityLoadRef.current)` guard short-circuit forever, so off→on never re-attempts and
   * the feature is dead for the session. The repo already learned this once —
   * `ocr-recognize.ts:76-80`: "a boot that failed must not poison every later attempt with the
   * same rejection". So the catch (a) nulls the ref, (b) reverts the toggle the caller optimistically
   * set, (c) says so out loud in the UI and in the console.
   */
  const loadProximity = useCallback((): Promise<ProximityModule | null> => {
    if (!proximityLoadRef.current) {
      proximityLoadRef.current = import('@/features/demo/ui/screens/map/mapProximity')
        .then((mod) => {
          setProximityModule(mod)
          return mod
        })
        .catch((err: unknown) => {
          proximityLoadRef.current = null
          console.warn('[demo/map] the proximity module failed to load — proximity stays off:', err)
          setProximityActive(false)
          setNotice(PROXIMITY_UNAVAILABLE)
          return null
        })
    }
    return proximityLoadRef.current
  }, [])

  // ---- camera visibility (phone useCameraVisibility) ----------------------------------------
  // Session-scoped, default off, per LOCATION id. Never persisted: camera visibility is an
  // ephemeral viewing preference, not case data.
  const [cameraShownIds, setCameraShownIds] = useState<ReadonlySet<string>>(() => new Set())

  // A case switch resets everything view-local: the phone REMOUNTS MapHost per viewed case
  // (app/(tabs)/map.tsx keys it), so its filters, proximity, camera toggles and selection are all
  // recreated. The demo's MapScreen stays mounted, so it clears them explicitly.
  const firstCaseRun = useRef(true)
  useEffect(() => {
    if (firstCaseRun.current) {
      firstCaseRun.current = false
      return
    }
    setFilters(EMPTY_MAP_FILTERS)
    setProximityActive(false)
    setProximityCenter(null)
    setProximityRadius(DEFAULT_PROXIMITY_RADIUS)
    setCameraShownIds(new Set())
    setSelectedId(null)
    setSheetMode('list')
    setSnapIndex(0)
  }, [viewerCaseId])

  // ---- projection ---------------------------------------------------------------------------
  const filtered = useMemo(() => applyMapFilters(mapData, filters), [mapData, filters])

  const proximityResult = useMemo<ProximityResult | null>(() => {
    if (!proximityActive || !proximityCenter || !proximityModule) return null
    return proximityModule.computeProximity(filtered, proximityCenter, proximityRadius)
  }, [proximityActive, proximityCenter, proximityModule, filtered, proximityRadius])

  const display = proximityResult?.data ?? filtered
  const markers = useMemo(() => buildMarkers(display), [display])
  // The camera frames the PRE-proximity set (review R-1a) — narrowing a radius re-plots without
  // re-framing, which is the split the phone makes between `cameraBounds` and `displayCollection`.
  const fitPoints = useMemo(() => buildFitPoints(filtered), [filtered])

  // Phone MapHost.tsx:250-258: the "of M" half is the POST-FILTER count and the "N" half is the
  // post-proximity one — so a status/text filter moves both together (badge reads "N locations")
  // and only proximity produces "N of M".
  const locationCount = useMemo(() => countLocations(filtered.items), [filtered.items])
  const filteredCount = proximityResult?.locationCount ?? locationCount
  // Pre-filter total — gates the count pill so a case with nothing plottable shows no badge at
  // all, while a zero-MATCH filter still gets one that says so (review R-6/R-7a).
  const totalCount = useMemo(() => countLocations(mapData.items), [mapData.items])

  /**
   * Which stage emptied the sheet (review R-6). Named in inner-to-outer order, because the
   * honest answer is the stage that actually did the emptying: if the status/text filter already
   * left nothing, proximity had nothing to remove.
   */
  const activeFilterCount = countActiveFilters(filters)
  const emptyReason: SheetEmptyReason =
    display.items.length > 0
      ? 'no-data'
      : activeFilterCount > 0 && filtered.items.length === 0
        ? 'filters'
        : proximityResult
          ? 'proximity'
          : 'no-data'

  // A stale selection (case switch, or a row the filter just removed) falls back to the list.
  const selectedItem = display.items.find((i) => i.id === selectedId) ?? null
  const contentMode = sheetMode === 'detail' && selectedItem ? 'detail' : 'list'

  const camerasShown = selectedItem?.kind === 'location' && cameraShownIds.has(selectedItem.id)
  const visibleCameras = useMemo(
    () => (camerasShown && selectedItem?.kind === 'location' ? selectedItem.cameras : NO_CAMERAS),
    [camerasShown, selectedItem],
  )

  // ---- handlers -----------------------------------------------------------------------------

  // Tap a pin or a row → fly the camera to it and open its detail (at least the partial detent).
  const selectItem = useCallback(
    (id: string) => {
      const item = display.items.find((i) => i.id === id)
      if (!item) return
      mapRef.current?.flyTo(item.coord[0], item.coord[1], FLY_ZOOM)
      setSelectedId(id)
      setSheetMode('detail')
      setSnapIndex((i) => Math.max(i, 1))
    },
    [display.items],
  )

  const back = useCallback(() => {
    setSheetMode('list')
    setSelectedId(null)
    setSnapIndex(1)
  }, [])

  const handleToggleStatus = useCallback((status: LocationMapStatus) => {
    setFilters((prev) => ({ ...prev, statuses: toggleStatus(prev.statuses, status) }))
  }, [])

  const handleSearchChange = useCallback((searchText: string) => {
    setFilters((prev) => ({ ...prev, searchText }))
  }, [])

  const handleClearFilters = useCallback(() => setFilters(EMPTY_MAP_FILTERS), [])

  const handleToggleCameras = useCallback(() => {
    if (selectedItem?.kind !== 'location') return
    const id = selectedItem.id
    setCameraShownIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [selectedItem])

  /**
   * Proximity toggle. Phone MapHost.tsx:370-431 tries, in order: a previously-set centre, the
   * first plottable location/incident, a best-effort GPS read, then a static globe centre.
   *
   * The demo drops the GPS step deliberately: a browser geolocation prompt fired by a toggle the
   * visitor pressed to filter a map would be a permission request the phone's own UX never
   * explains here — and the demo's honesty rule is that nothing asks for more than it needs. The
   * map's current centre stands in, which is strictly better information than the phone's static
   * North-America fallback.
   */
  const handleProximityToggle = useCallback(() => {
    if (proximityActive) {
      setProximityActive(false)
      return
    }
    void loadProximity()
    if (!proximityCenter) {
      const plotted = filtered.items[0]?.coord
      const anchor = plotted ?? mapRef.current?.getCenter() ?? DEFAULT_MAP_CENTER
      setProximityCenter([anchor[0], anchor[1]])
      // Only the derived-anchor arms are announced: an anchor taken from a row the visitor can
      // see in the sheet explains itself.
      if (!plotted) setNotice(PROXIMITY_CENTRED_ON_VIEW)
    }
    setProximityActive(true)
  }, [proximityActive, proximityCenter, filtered.items, loadProximity])

  /** Long-press: re-centre the ring when proximity is on, else activate it there
   *  (phone MapHost.tsx:359-368). */
  const handleLongPress = useCallback(
    (lng: number, lat: number) => {
      void loadProximity()
      setProximityCenter([lng, lat])
      setProximityActive(true)
    },
    [loadProximity],
  )

  const detail = selectedItem ? (
    <LocationDetailCard
      item={selectedItem}
      onBack={back}
      onCall={(number) => setPendingCall(number)}
      onEmail={() => setNotice(EMAIL_UNAVAILABLE)}
      onGoToLocation={(id) => onGoToLocation?.(id)}
      onEditIncident={onEditIncident}
      camerasShown={camerasShown}
      onToggleCameras={handleToggleCameras}
    />
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
          <MapCanvas
            ref={mapRef}
            markers={markers}
            fitPoints={fitPoints}
            cameras={visibleCameras}
            proximityRing={proximityResult?.ring ?? null}
            onMarkerPress={selectItem}
            onLongPress={handleLongPress}
          />
          {onChangeCase && (
            <button type="button" onClick={onChangeCase} style={changeCasePill}>
              Change Case
            </button>
          )}
          <MapControls
            filters={filters}
            onToggleStatus={handleToggleStatus}
            onSearchChange={handleSearchChange}
            onClearFilters={handleClearFilters}
            activeFilterCount={activeFilterCount}
            proximityActive={proximityActive}
            proximityRadius={proximityRadius}
            onProximityToggle={handleProximityToggle}
            onRadiusChange={setProximityRadius}
            locationCount={locationCount}
            filteredCount={filteredCount}
            totalCount={totalCount}
          />
          <MapBottomSheet
            items={display.items}
            statusCounts={display.statusCounts}
            snapIndex={snapIndex}
            onSnapChange={setSnapIndex}
            contentMode={contentMode}
            selectedId={selectedId}
            onSelect={selectItem}
            detail={detail}
            emptyReason={emptyReason}
            onClearFilters={handleClearFilters}
          />
          {pendingCall && (
            <CallConfirmSheet
              number={pendingCall}
              onConfirm={() => {
                setNotice(CALL_UNAVAILABLE)
                setPendingCall(null)
              }}
              onCancel={() => setPendingCall(null)}
            />
          )}
          {notice && <DemoNotification message={notice} onDismiss={() => setNotice(null)} />}
        </>
      )}
    </div>
  )
}
