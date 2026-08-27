'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { MapCanvas, type MapCanvasHandle } from '@/features/demo/ui/screens/map/MapCanvas'
import { buildFitPoints, buildMarkers } from '@/features/demo/ui/screens/map/buildMarkers'
import { MapBottomSheet } from '@/features/demo/ui/screens/map/MapBottomSheet'
import { MapControls } from '@/features/demo/ui/screens/map/MapControls'
import { MapFiltersSheet } from '@/features/demo/ui/screens/map/MapFiltersSheet'
import { LocationDetailCard } from '@/features/demo/ui/screens/map/LocationDetailCard'
import { CallConfirmSheet } from '@/features/demo/ui/screens/map/CallConfirmSheet'
import { DemoNotification } from '@/features/demo/ui/screens/map/DemoNotification'
import { countLocations, type MapCameraMarker, type MapData } from '@/features/demo/ui/screens/map/mapData'
import type { SheetEmptyReason } from '@/features/demo/ui/screens/map/LocationList'
import {
  EMPTY_MAP_FILTERS,
  applyMapFilters,
  countActiveFilters,
  type MapFilterState,
} from '@/features/demo/ui/screens/map/mapFilters'
import type { LocationMapStatus } from '@/features/demo/engine/store/selectors'
import { DEFAULT_MAP_CENTER, DEFAULT_PROXIMITY_RADIUS, type RadiusPreset } from '@/features/demo/ui/screens/map/mapTokens'
import type { ProximityResult } from '@/features/demo/ui/screens/map/mapProximity'

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
const PROXIMITY_CENTRED_ON_VIEW = 'Proximity centred on the current view. Long-press the map to move it.'
/**
 * F58: the same event when there is no map to have a "current view" OF.
 *
 * `MapCanvas` returns `[data-map-fallback]` instead of `[data-map-canvas]` without
 * `NEXT_PUBLIC_MAPBOX_TOKEN` (`MapCanvas.tsx:620-626`), and its `getCenter()` then resolves to
 * `null` (`:304-307`) — so the anchor chain falls through to `DEFAULT_MAP_CENTER`, a frozen
 * literal. The sentence above claimed a view the visitor cannot see and a gesture they cannot
 * perform; this one claims neither. Three anchor provenances, three outcomes: a plotted row is
 * silent, a real map centre says "current view", and the constant says it is a constant.
 */
const PROXIMITY_CENTRED_ON_DEFAULT =
  'Nothing is plotted and the live map is unavailable, so proximity is centred on the demo default location.'

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
  /**
   * "Export Map" — the list-footer action that downloads the viewer case's self-contained
   * Case Map (P5.4). Optional, like its phone counterpart (`MapBottomSheet.tsx:66-70`,
   * ui-mapping 03:182 "Rendered only when `onExportMap` prop supplied"): a mount without a
   * handler simply has no button, rather than a button that swallows every press — the
   * gating shape §49a set and `onChangeCase`/`onGoToLocation` above already follow.
   *
   * SEAM(P6.1): the map screens are P6.1's territory. P5.4's footprint on them is three
   * forwarded props and one footer button in `LocationList`; the export itself lives in
   * `engine/logic/case-map/` and `ui/inputs/download-file.ts`.
   */
  onExportMap?(): void
  /** The Case Map builder is still being fetched — the footer disables itself rather than
   *  accepting a press it cannot serve synchronously (review R-8). */
  exportMapPending?: boolean
  /** A blocking dialog owns the screen — the footer is not live (review R-8). */
  exportMapBlocked?: boolean
}

/**
 * The absolutely-positioned "Change Case" pill is GONE (U5.2, matrix row 17 / A81).
 *
 * PR #127 retired it into the search bar's `[← close]` button — the phone's own words
 * (`MapControls.tsx:10-13`): *"The close button replaces MapHost's absolutely-positioned
 * 'Change Case' pill (which used a different colour system and could overlap the count
 * badge). Rendered only when `onClose` is provided — the same gating the pill had."* The demo's
 * copy carried both faults: a bare `rgba(13,27,42,0.82)` off the retired navy ramp, and a
 * `zIndex: 16` that sat above the floating chrome purely to avoid it.
 *
 * The 378px stacking adaptation the old chrome documented goes with it: #127 deleted the pills
 * that collided, so the premise is gone. Recorded here, not deleted in passing.
 */

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
export function MapScreen({ viewerCaseId, mapData, onChangeCase, onGoToLocation, onEditIncident, onExportMap, exportMapPending, exportMapBlocked }: MapScreenProps) {
  const [snapIndex, setSnapIndex] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [sheetMode, setSheetMode] = useState<'list' | 'detail'>('list')
  const [pendingCall, setPendingCall] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const mapRef = useRef<MapCanvasHandle>(null)

  // ---- filters (phone useMapFilter) ---------------------------------------------------------
  const [filters, setFilters] = useState<MapFilterState>(EMPTY_MAP_FILTERS)

  /**
   * Filters-sheet visibility — the NEW component-local UI state D20 names this package for
   * (plan §2, §5's U5.3 row). Phone `MapHost.tsx:163-167`, which owns exactly the same boolean
   * and calls it exactly this.
   *
   * It is UI state and nothing more: it touches no filter VALUE, and — deliberately — neither
   * `selectedId` nor `sheetMode`. U5.4's §11 defect 2 records why that matters. `LocationRow`
   * indicates selection not at all now, which is only safe while a row that is IN `display.items`
   * cannot render inside the LIST: `contentMode` is `detail` whenever `selectedItem` resolves
   * (`:259` below), so the list is unmounted exactly when a selected row would be visible in it.
   * Opening or closing this sheet must never write either of those two, or that stops holding and
   * the demo silently grows a selection cue nothing paints.
   */
  const [filtersVisible, setFiltersVisible] = useState(false)
  /**
   * Stable, not inline arrows, and `onClose` is the one that needs to be: `GlassBottomSheet`
   * lists it as a dependency of the effect that installs the Escape listener
   * (`GlassBottomSheet.tsx:248-255`), so a fresh identity per render would tear down and re-add a
   * document-level `keydown` handler on every commit of this screen. Phone `MapHost.tsx:166-167`
   * spells both the same way.
   */
  /**
   * F58 — is there a live map surface at all? Read HERE, not at module scope, and read from the
   * same expression `MapCanvas` decides its own render from (`MapCanvas.tsx:273`): Next inlines
   * this at build time, but the demo's suites drive the token-less path with `vi.stubEnv`, so a
   * module-level capture would freeze whichever value was present at import and the honest branch
   * would be untestable.
   *
   * Two consumers, deliberately the same fact: the sheet's hint (which names a long-press gesture)
   * and the anchor notice (which names a "current view"). Both sentences are true exactly when a
   * map exists, so they must not be allowed to disagree.
   */
  const canPlaceRing = Boolean(process.env.NEXT_PUBLIC_MAPBOX_TOKEN)

  const openFilters = useCallback(() => setFiltersVisible(true), [])
  const closeFilters = useCallback(() => setFiltersVisible(false), [])

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
    // The phone remounts `MapHost` per viewed case, so its `filtersVisible` is recreated false
    // with everything else. Leaving a filters sheet open over a case whose filters just reset
    // would be a sheet describing state that no longer exists.
    setFiltersVisible(false)
  }, [viewerCaseId])

  // ---- projection ---------------------------------------------------------------------------
  const filtered = useMemo(() => applyMapFilters(mapData, filters), [mapData, filters])

  const proximityResult = useMemo<ProximityResult | null>(() => {
    if (!proximityActive || !proximityCenter || !proximityModule) return null
    return proximityModule.computeProximity(filtered, proximityCenter, proximityRadius)
  }, [proximityActive, proximityCenter, proximityModule, filtered, proximityRadius])

  /**
   * Is the ring actually FILTERING right now? (F62.)
   *
   * `proximityActive` is the REQUEST — `setProximityActive(true)` commits synchronously, while
   * the Turf chunk it needs is still in flight. Between those two moments proximity is "on" and
   * filtering nothing: `proximityResult` is null, `display` is the unfiltered set, and there is
   * no ring on the map. The failure path was already honest (`PROXIMITY_UNAVAILABLE` reverts the
   * toggle); the LOADING path was not, and the chip printed "2 km · 9 of 9" over a map with no
   * ring — an on-map indicator asserting a filter that is not running, which is exactly what
   * `PROXIMITY_UNAVAILABLE`'s own docblock forbids for the sibling path.
   *
   * One condition rather than a three-state union: the two booleans answer different questions
   * and both already exist, so the union would re-encode a derivation rather than remove one.
   * The SWITCH keeps reading `proximityActive`, because a toggle must reflect the tap that set
   * it; only the claim about filtering is withheld.
   */
  const proximityFiltering = proximityResult !== null

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
   *
   * `totalCount > 0` is the precondition for blaming a filter AT ALL (MR-3). A case with nothing
   * plottable is empty before any filter runs, so typing into the search box flipped honest
   * no-data copy — the sentence that names the real remedy, "add an address to a location" — to
   * "No locations match your filters", which offers a Clear button that cannot bring back rows
   * that never existed. Same honesty class R-6 just closed, one stage further out.
   */
  const activeFilterCount = countActiveFilters(filters)
  /**
   * The filters button's badge — phone `MapHost.tsx:268`, verbatim:
   * `(filters.statuses?.length ?? 0) + (proximityIsActive ? 1 : 0)`.
   *
   * **Per active STATUS, and NOT `activeFilterCount`.** The two diverge, and the phone's own test
   * builds a three-status fixture specifically to separate them (`MapHost.test.tsx:490-521`:
   * *"correct statuses.length (3) + proximity (1) = 4; regressed activeFilterCount (2) +
   * proximity (1) = 3. With two statuses both arms land on 3 and the test pins nothing."*).
   * Search text is excluded from both: it is visible in the field itself.
   *
   * `activeFilterCount` keeps its own job below — deciding whether a filter is what emptied the
   * sheet (MR-3). One number cannot serve both questions.
   */
  const filterBadgeCount = filters.statuses.length + (proximityActive ? 1 : 0)
  const emptyReason: SheetEmptyReason =
    display.items.length > 0
      ? 'no-data'
      : totalCount > 0 && activeFilterCount > 0 && filtered.items.length === 0
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

  const handleSearchChange = useCallback((searchText: string) => {
    setFilters((prev) => ({ ...prev, searchText }))
  }, [])

  const handleClearFilters = useCallback(() => setFilters(EMPTY_MAP_FILTERS), [])

  /**
   * The sheet's status chips emit the FULL updated set (A82), so this is a straight write — the
   * add/remove decision and the registry re-ordering both happen in the sheet, where the tap is.
   */
  const handleStatusToggle = useCallback((statuses: readonly LocationMapStatus[]) => {
    setFilters((prev) => ({ ...prev, statuses }))
  }, [])

  /**
   * The footer's "Clear All" — filters AND proximity, in one press. Phone
   * `MapHost.tsx:418-423`, whose own comment is *"resets status + search filters AND deactivates
   * an active proximity ring in one tap — everything the badge counts plus the visible search
   * text"*.
   *
   * DISTINCT from `handleClearFilters` above, which the sheet's EMPTY state offers and which
   * must stay filters-only: that button appears when a status/text filter emptied the list
   * (`emptyReason === 'filters'`), and turning proximity off from it would undo something the
   * visitor did not ask about. The phone keeps the same split — `clearFilters` and
   * `handleClearAllFilters` are two functions there too.
   *
   * `setProximityActive(false)` unconditionally rather than behind the phone's
   * `if (proximityIsActive)`: an identical `useState` write is an `Object.is` bail-out, so the
   * guard would buy nothing and cost this callback a dependency (and with it a fresh identity on
   * every proximity flip).
   */
  const handleClearAllFilters = useCallback(() => {
    setFilters(EMPTY_MAP_FILTERS)
    setProximityActive(false)
  }, [])

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
      /**
       * Only the derived-anchor arms are announced: an anchor taken from a row the visitor can
       * see in the sheet explains itself. Of the other two, F58 asked which sentence is true.
       *
       * The discriminator is `canPlaceRing`, NOT whether `getCenter()` returned. Those differ,
       * and the difference matters: `mapRef.current` is assigned inside an async IIFE after two
       * dynamic imports (`MapCanvas.tsx:315-338`), so `getCenter()` is null for the first few ms
       * of EVERY mount, token or not. Discriminating on it would have told a visitor with a
       * perfectly good map that the map was unavailable, for the window in which they are most
       * likely to be pressing things.
       *
       * And in that window `DEFAULT_MAP_CENTER` genuinely IS the current view: `MapCanvas` opens
       * the map centred on that same frozen constant, read from this same module
       * (`MapCanvas.tsx:335`). So the sentence is true whenever a map exists at all — which is
       * exactly what `canPlaceRing` says, and is the same fact the sheet's hint reads.
       */
      if (!plotted) setNotice(canPlaceRing ? PROXIMITY_CENTRED_ON_VIEW : PROXIMITY_CENTRED_ON_DEFAULT)
    }
    setProximityActive(true)
  }, [proximityActive, proximityCenter, filtered.items, loadProximity, canPlaceRing])

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
      cameras={{ shown: camerasShown, onToggle: handleToggleCameras }}
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
          <MapControls
            filters={filters}
            onSearchChange={handleSearchChange}
            filterBadgeCount={filterBadgeCount}
            /* The search chrome's back button IS the change-case affordance now, with the same
               gating the deleted pill had (phone `MapHost.tsx:511-514`). */
            onClose={onChangeCase}
            /* F62 — the FILTERING fact, not the request. `MapControls`'s own prop docblock reads
               "True while the proximity ring is active — renders the summary chip", and during
               the chunk-load window `proximityActive` is not that. The chip is the map's only
               claim that a filter is running, so it may not appear before one is. */
            proximityActive={proximityFiltering}
            proximityRadius={proximityRadius}
            /**
             * The chip ✕. `handleProximityToggle` is passed whole rather than split, and the
             * chip can only ever reach its OFF branch: the chip renders under
             * `proximityActive &&`, so by the time this fires `proximityActive` is true and the
             * function's first arm returns after `setProximityActive(false)`. Splitting it would
             * leave the anchor chain (and its R-18a notice) with no caller for one package and
             * then re-add it — churn over a function nothing is asking to change.
             *
             * SEAM(U5.3): the filters sheet's "Filter by radius" Toggle takes this SAME function
             * as `onProximityToggle`, which is where the ON branch comes back into reach.
             */
            onProximityDeactivate={handleProximityToggle}
            locationCount={locationCount}
            filteredCount={filteredCount}
            /* U5.3 closed the SEAM(U5.3) that stood here: the divider, the filters button and its
               badge now render, and the proximity chip's body becomes pressable. `onOpenFilters`
               stays OPTIONAL on `MapControls` — U5.2's §49a gating is the reason the intervening
               package shipped no button that swallowed a press, and `onChangeCase` /
               `onGoToLocation` / `onExportMap` follow the same rule. */
            onOpenFilters={openFilters}
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
            onExportMap={onExportMap}
            exportMapPending={exportMapPending}
            exportMapBlocked={exportMapBlocked}
          />
          {/**
            * The filters sheet. Always MOUNTED, `visible`-gated — `GlassBottomSheet` needs
            * `visible` to go false while it stays mounted or the exit never plays (U4.1 §8.2).
            *
            * It paints on the shell's own `PICKER_SHEET_Z` 31/32, which is not a choice this
            * package makes: D14 froze that number and three pins read it. It lands coherently in
            * the demo's map scheme all the same — above the bottom sheet (20), the map error
            * overlay (25) and the case picker (30), below the call sheet (48) and below
            * `DemoNotification` (60), which is the one that must stay readable over it because it
            * is what reports a proximity failure the sheet's own toggle caused.
            */}
          <MapFiltersSheet
            visible={filtersVisible}
            onClose={closeFilters}
            activeStatuses={filters.statuses}
            onStatusToggle={handleStatusToggle}
            /* The REQUEST, deliberately not `proximityFiltering` (F62): a switch must reflect the
               tap that set it, or a visitor who turns proximity on watches it spring back while
               the chunk loads and taps again. The radius chips ride the same flag for the same
               reason — they are what the request is configuring. */
            proximityActive={proximityActive}
            proximityRadius={proximityRadius}
            /* The SAME function the chip's ✕ receives. This is the caller that brings its ON
               branch — and `PROXIMITY_CENTRED_ON_VIEW` with it — back into reach after U5.2
               deleted the toggle pill, including on a token-less mount where there is no canvas
               to long-press. */
            onProximityToggle={handleProximityToggle}
            onRadiusChange={setProximityRadius}
            onClearAll={handleClearAllFilters}
            locationCount={locationCount}
            filteredCount={filteredCount}
            canPlaceRing={canPlaceRing}
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
