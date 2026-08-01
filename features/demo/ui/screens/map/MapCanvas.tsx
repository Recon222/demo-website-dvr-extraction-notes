'use client'

import { forwardRef, useCallback, useEffect, useImperativeHandle, useMemo, useRef, useState } from 'react'
import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
// Side-effect CSS for marker/control positioning. Static (not dynamic) so it's processed at module
// load like the demo's own demo.css — the heavy GL *engine* still loads lazily in the effect below.
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'
import type { ClusterBbox, ClusterDescriptor, ClusterIndex, PlottedMarker } from '@/features/demo/ui/screens/map/mapCluster'
import type { MapCameraMarker } from '@/features/demo/ui/screens/map/mapData'
import type { ProximityRing } from '@/features/demo/ui/screens/map/mapProximity'
import { createCameraEl, createClusterEl, createMarkerEl } from '@/features/demo/ui/screens/map/markerElements'
import { DEFAULT_MAP_CENTER, MAP_SURFACE_COLORS, PROXIMITY_COLORS, SHEET_COLORS, type LngLat } from '@/features/demo/ui/screens/map/mapTokens'

/** Imperative handle the orchestrator uses to drive the camera. */
export interface MapCanvasHandle {
  flyTo(lng: number, lat: number, zoom?: number): void
  /** Current camera centre as [lng, lat], or null before the map exists. The proximity toggle's
   *  last resort when nothing is plotted (phone MapHost.tsx:389-413 falls back to a GPS read then
   *  a static globe centre; a demo must not prompt for the visitor's location). */
  getCenter(): [number, number] | null
}

export interface MapCanvasProps {
  /** Status-coloured location dots + the incident teardrop to plot. Locations cluster. */
  markers?: readonly MarkerDescriptor[]
  /**
   * The points the camera frames. Deliberately a SEPARATE input from `markers` (review R-1a):
   * the caller feeds the status/text-filtered set, NOT the post-proximity one, so narrowing a
   * proximity radius re-plots without re-framing — the split the phone makes between
   * `cameraBounds` and `displayCollection` (`MapHost.tsx:255-256`, `:492-493`).
   *
   * Omitted → the plotted markers' own coordinates, which is the right answer for any caller
   * that has no proximity stage.
   */
  fitPoints?: readonly LngLat[]
  /** The visible location's cameras. Never clustered, never selectable — a tap toggles the
   *  camera's own name callout (phone CameraMarker, ui-mapping 03:105). */
  cameras?: readonly MapCameraMarker[]
  /** Proximity radius polygon, drawn under the pins as a fill + border line. */
  proximityRing?: ProximityRing | null
  /** Fires with the marker's id when a pin is tapped. Clusters and cameras never reach it. */
  onMarkerPress?(id: string): void
  /** Long-press on the map surface — sets / re-centres the proximity ring (phone MapHost.tsx:359-368). */
  onLongPress?(lng: number, lat: number): void
  /** Optional ready callback. */
  onReady?(): void
}

type MapboxGl = typeof import('mapbox-gl')
type ClusterModule = typeof import('@/features/demo/ui/screens/map/mapCluster')

const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'
const DEFAULT_ZOOM = 10
const SINGLE_ZOOM = 15

/** Phone `CameraMarker`-free constants: the loading cover's cross-fade and its hard failsafe,
 *  lifted from `CaseMapView.tsx:189-199` (600 ms reveal, 4000 ms force-reveal). */
const COVER_FADE_DURATION_MS = 600
const COVER_FAILSAFE_MS = 4000

/** Long-press threshold. React Native's default `delayLongPress`, which is what the phone's
 *  `onLongPress` fires on. */
const LONG_PRESS_MS = 500
/** Pointer travel (px) that reclassifies a hold as a map drag and cancels the long press. */
const LONG_PRESS_SLOP = 10

/**
 * Stable empty defaults. A `= []` default parameter mints a fresh array on EVERY render, which
 * would make `renderMarkers` a new function on every render and re-plot every marker on every
 * commit — including the ones this component's own `setState`s cause.
 */
const NO_MARKERS: readonly MarkerDescriptor[] = Object.freeze([])
const NO_CAMERAS: readonly MapCameraMarker[] = Object.freeze([])

const PROXIMITY_SOURCE_ID = 'demo-proximity-ring'
const PROXIMITY_FILL_ID = 'demo-proximity-ring-fill'
const PROXIMITY_LINE_ID = 'demo-proximity-ring-line'

const fallbackStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  textAlign: 'center',
  padding: 24,
  color: '#cdd9e6',
  fontSize: 14,
  background: 'linear-gradient(160deg,#0d1b2a,#0a1422)',
}

const coverStyle = (revealed: boolean): CSSProperties => ({
  position: 'absolute',
  inset: 0,
  zIndex: 5,
  pointerEvents: 'none',
  background: '#0d1b2a',
  opacity: revealed ? 0 : 1,
  transition: `opacity ${COVER_FADE_DURATION_MS}ms ease`,
})

const errorOverlayStyle: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 25,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 14,
  padding: 24,
  textAlign: 'center',
  background: MAP_SURFACE_COLORS.overlayMedium,
  color: '#f0f4f8',
  fontSize: 14,
}

const retryStyle: CSSProperties = {
  padding: '9px 22px',
  borderRadius: 10,
  border: 'none',
  background: SHEET_COLORS.accent,
  color: '#f0f4f8',
  fontSize: 14,
  fontWeight: 600,
  fontFamily: 'inherit',
  cursor: 'pointer',
}

/**
 * The demo's honest analog of the phone's error overlay. The phone's string is whatever the
 * SQLite fetch threw, falling back to `Failed to load map data` (ui-mapping 03:96) — the demo has
 * no data fetch at all, so the only thing that can fail is the Mapbox style/tile load, and the
 * copy says that instead of borrowing a sentence about a database that isn't there.
 */
export const MAP_LOAD_ERROR = 'Failed to load the map.'

/**
 * The other way this screen can fail, and a genuinely different sentence (review R-3): the
 * 1.8 MB `mapbox-gl` chunk — by far the largest thing on this screen — never arriving, or the
 * `Map` constructor throwing on a malformed token. Neither produces a `Map` instance, so
 * `map.on('error')` cannot fire and the style/tile copy would be a guess.
 */
export const MAP_ENGINE_ERROR = "The map engine couldn't load."

/** Which failure the overlay is reporting; `null` = none. */
type MapFailure = 'engine' | 'style'

/** HTTP statuses mapbox surfaces through `AJAXError` that are terminal for this session:
 *  401 revoked/invalid token · 403 URL-restricted token on a new origin · 429 rate limit. */
const TERMINAL_MAP_STATUSES: ReadonlySet<number> = new Set([401, 403, 429])

/**
 * Does a post-load `'error'` mean the map is DEAD, or just that one fetch missed? (review R-11)
 *
 * The tile rationale behind ignoring post-load errors is right and incomplete about the event:
 * mapbox-gl 3.25 routes terminal conditions through the same handler. `_revokeAuth()` clears the
 * GL buffers and then fires an access-token ErrorEvent, and because its session round-trip
 * resolves AFTER `'load'` it always lands in the ignored arm; `AJAXError` 401/403/429 and WebGL
 * context loss do the same. Two causes with opposite remedies were collapsing into one outcome
 * and one log line: pins floating over a void, no message, no Retry.
 *
 * Exported for direct unit coverage — the branch is otherwise only reachable through a mapbox
 * event this suite has to synthesise anyway.
 */
export function isTerminalMapError(cause: unknown): boolean {
  if (!cause || typeof cause !== 'object') return false
  const status = (cause as { status?: unknown }).status
  if (typeof status === 'number' && TERMINAL_MAP_STATUSES.has(status)) return true
  const message = (cause as { message?: unknown }).message
  if (typeof message !== 'string') return false
  return /access token|context lost|contextlost/i.test(message)
}

/** Fit the camera to the plotted points: 1 → centre+zoom, ≥2 → fit the bounding box (leaving room for
 *  the controls overlay and the bottom sheet). */
function fitToPoints(map: MapboxMap, points: readonly LngLat[]): void {
  if (points.length === 0) return
  if (points.length === 1) {
    map.setCenter([points[0][0], points[0][1]])
    map.setZoom(SINGLE_ZOOM)
    return
  }
  let w = Infinity, s = Infinity, e = -Infinity, n = -Infinity
  for (const [lng, lat] of points) {
    w = Math.min(w, lng)
    e = Math.max(e, lng)
    s = Math.min(s, lat)
    n = Math.max(n, lat)
  }
  const bounds: [[number, number], [number, number]] = [[w, s], [e, n]]
  map.fitBounds(bounds, { padding: { top: 90, bottom: 300, left: 40, right: 40 }, maxZoom: 16, duration: 0 })
}

/** The map's current viewport as a supercluster bbox. Falls back to the whole world whenever the
 *  bounds can't be read (pre-first-frame, or a stubbed map under test) so clustering degrades to
 *  "cluster everything" rather than "plot nothing". */
function viewportBbox(map: MapboxMap, worldBbox: ClusterBbox): ClusterBbox {
  try {
    const bounds = map.getBounds?.()
    if (!bounds) return worldBbox
    return [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()]
  } catch {
    return worldBbox
  }
}

/**
 * Client coordinates → mapbox container pixels.
 *
 * `getBoundingClientRect()` reports the CSS-TRANSFORMED box, but `map.unproject` expects
 * untransformed container pixels — and `PhoneFrame` wraps this whole screen in
 * `transform: scale(usePhoneScale())`, which is below 1 on any viewport that cannot fit the
 * 404x812 device at 1:1. Without dividing the scale out, a long press lands progressively
 * further from the finger the further it is from the container's top-left corner.
 *
 * This is exactly the conversion mapbox-gl does for its own pointer handling
 * (`getScaledPoint`, mapbox-gl-dev.js:57053-57059) — same formula, so a long-press ring and a
 * mapbox click resolve to the same coordinate.
 */
export function toContainerPoint(
  container: { getBoundingClientRect(): { left: number; top: number; width: number }; offsetWidth: number },
  clientX: number,
  clientY: number,
): [number, number] {
  const rect = container.getBoundingClientRect()
  const scaling = rect.width > 0 && container.offsetWidth > 0 ? container.offsetWidth / rect.width : 1
  return [(clientX - rect.left) * scaling, (clientY - rect.top) * scaling]
}

function currentZoom(map: MapboxMap): number {
  try {
    const zoom = map.getZoom?.()
    return typeof zoom === 'number' && Number.isFinite(zoom) ? zoom : DEFAULT_ZOOM
  } catch {
    return DEFAULT_ZOOM
  }
}

/**
 * The Mapbox GL JS canvas — the web analog of the phone's native MapView. mapbox-gl AND the
 * supercluster wrapper both load lazily (`await import` in the effect; SSR/bundle-safe), the map
 * is always torn down with `map.remove()`, and a missing token degrades to a styled placeholder
 * (never throws).
 *
 * Location pins cluster (phone `CaseMapView.tsx:835-875`); the incident teardrop, the camera
 * markers and the proximity ring are separate, never-clustered layers, exactly as on the phone.
 */
export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { markers = NO_MARKERS, cameras = NO_CAMERAS, fitPoints, proximityRing = null, onMarkerPress, onLongPress, onReady },
  ref,
) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const gqlRef = useRef<MapboxGl | null>(null)
  const clusterModRef = useRef<ClusterModule | null>(null)
  const indexRef = useRef<ClusterIndex | null>(null)
  // Pins and cameras are plotted by SEPARATE effects into SEPARATE refs (review R-4): pin
  // membership is a function of the viewport (clustering), camera membership is not, and a
  // camera's open callout lives in its DOM element — re-creating it on every `moveend` wiped the
  // bubble and silently flipped its `aria-expanded` back to false.
  const pinObjsRef = useRef<MapboxMarker[]>([])
  const cameraObjsRef = useRef<MapboxMarker[]>([])
  // Live refs so fresh callback identities never force the map or the markers to rebuild.
  const onMarkerPressRef = useRef(onMarkerPress)
  onMarkerPressRef.current = onMarkerPress
  const onLongPressRef = useRef(onLongPress)
  onLongPressRef.current = onLongPress
  // The map's 'moveend' handler is attached once, at creation, and re-reads the latest renderer.
  const renderRef = useRef<() => void>(() => undefined)
  // Read by the 'error' listener, which must not run a side effect inside a setState updater.
  const readyRef = useRef(false)

  const [ready, setReady] = useState(false)
  const [failure, setFailure] = useState<MapFailure | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [revealed, setRevealed] = useState(false)
  const [coverMounted, setCoverMounted] = useState(true)

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom) {
      mapRef.current?.flyTo({ center: [lng, lat], ...(zoom != null ? { zoom } : {}) })
    },
    getCenter() {
      const center = mapRef.current?.getCenter?.()
      return center ? [center.lng, center.lat] : null
    },
  }))

  // Create the map once per attempt (Retry bumps `attempt`, tearing the old one down first).
  useEffect(() => {
    if (!token || !containerRef.current) return
    let mounted = true
    let map: MapboxMap | null = null
    void (async () => {
      // Everything up to a live `Map` is inside the try (review R-3). Before this, a rejected
      // chunk or a throwing constructor left the IIFE rejecting unhandled: `'load'` never fired,
      // the 4 s failsafe revealed the cover onto an EMPTY container, and the visitor got a dark
      // rectangle with the controls and sheet floating on it — indistinguishable from very dark
      // tiles. The overlay + Retry this feature added to make map failure honest never rendered.
      try {
      const [mod, clusterMod] = await Promise.all([
        import('mapbox-gl'),
        import('@/features/demo/ui/screens/map/mapCluster'),
      ])
      const mapboxgl = mod.default
      if (!mounted || !containerRef.current) return
      gqlRef.current = mod
      clusterModRef.current = clusterMod
      map = new mapboxgl.Map({
        accessToken: token,
        container: containerRef.current,
        style: MAP_STYLE,
        center: [DEFAULT_MAP_CENTER[0], DEFAULT_MAP_CENTER[1]],
        zoom: DEFAULT_ZOOM,
      })
      mapRef.current = map
      map.on('load', () => {
        if (!mounted) return
        readyRef.current = true
        setReady(true)
        onReady?.()
      })
      // Only a failure BEFORE the first successful load is fatal — a style or token problem that
      // leaves nothing on screen. After that, mapbox emits 'error' for ordinary transient tile
      // fetches; covering a working map with a full-screen error over one dropped tile would be
      // the opposite of honest. Never silent either way: the breadcrumb is the repo's
      // console.warn convention for soft-failed I/O.
      map.on('error', (event) => {
        if (!mounted) return
        const cause = (event as { error?: unknown })?.error
        if (readyRef.current) {
          if (isTerminalMapError(cause)) {
            // Terminal: the map is not coming back on its own, so say so and offer Retry.
            console.error('[demo/map] mapbox reported a terminal error after load:', cause)
            setFailure('style')
            return
          }
          console.warn('[demo/map] mapbox error ignored after load:', cause)
          return
        }
        console.warn('[demo/map] mapbox failed before first load — showing the retry overlay:', cause)
        setFailure('style')
      })
      map.on('moveend', () => {
        if (mounted) renderRef.current()
      })
      } catch (err) {
        const error = err instanceof Error ? err : new Error(String(err))
        console.warn('[demo/map] the map engine failed to load — showing the retry overlay:', error)
        // Retry bumps `attempt`, which re-runs this whole effect; webpack re-attempts a failed
        // chunk on the next `import()`, so Retry is a genuine recovery rather than a gesture.
        if (mounted) setFailure('engine')
      }
    })()
    return () => {
      mounted = false
      readyRef.current = false
      pinObjsRef.current.forEach((m) => m.remove())
      pinObjsRef.current = []
      cameraObjsRef.current.forEach((m) => m.remove())
      cameraObjsRef.current = []
      indexRef.current = null
      map?.remove()
      mapRef.current = null
    }
    // onReady omitted on purpose — a fresh callback identity must not rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, attempt])

  // Re-plot the PINS for the current viewport. Called on data change AND on every 'moveend',
  // because which pins are clustered is a function of the camera. Cameras are not here.
  const renderPins = useCallback(() => {
    const map = mapRef.current
    const mod = gqlRef.current
    const clusterMod = clusterModRef.current
    if (!map || !mod || !clusterMod) return

    pinObjsRef.current.forEach((m) => m.remove())

    const index = indexRef.current
    const plotted: readonly PlottedMarker[] = index
      ? index.markersFor(viewportBbox(map, clusterMod.WORLD_BBOX), currentZoom(map))
      : markers

    const pinObjs = plotted.map((d) => {
      if (d.kind === 'cluster') {
        const el = createClusterEl(d)
        el.addEventListener('click', () => expandCluster(d))
        // Keyboard operation for the focusable bubble (review R-7b) — the `switchKeyDown` idiom
        // from `ui/screens/_shared.tsx`, applied to an imperatively-built element.
        el.addEventListener('keydown', (event) => {
          if (event.key !== 'Enter' && event.key !== ' ') return
          event.preventDefault()
          expandCluster(d)
        })
        return new mod.default.Marker({ element: el, anchor: 'center' }).setLngLat([d.lng, d.lat]).addTo(map)
      }
      const el = createMarkerEl(d)
      el.addEventListener('click', () => onMarkerPressRef.current?.(d.id))
      return new mod.default.Marker({ element: el, anchor: d.kind === 'incident' ? 'bottom' : 'center' })
        .setLngLat([d.lng, d.lat])
        .addTo(map)
    })

    pinObjsRef.current = pinObjs

    function expandCluster(cluster: ClusterDescriptor): void {
      const currentIndex = indexRef.current
      if (!currentIndex || !clusterMod) return
      clusterMod.expandCluster(cluster, {
        expansionZoom: (clusterId) => currentIndex.expansionZoom(clusterId),
        flyToCluster: ({ center, zoom }) => map?.flyTo({ center: [center[0], center[1]], zoom }),
        onError: (error) => console.warn('[demo/map] cluster expansion failed:', error),
      })
    }
  }, [markers])

  /**
   * Re-plot the CAMERA markers. Runs only when the camera list itself changes — never on a map
   * move — so an open callout survives a pan, a `flyTo` settling, or any pin re-cluster. The
   * phone holds the same state in React and memoises its camera markers on toggle/selection,
   * explicitly not on camera moves (`CaseMapView.tsx:386-393`).
   */
  const renderCameras = useCallback(() => {
    const map = mapRef.current
    const mod = gqlRef.current
    if (!map || !mod) return
    cameraObjsRef.current.forEach((m) => m.remove())
    cameraObjsRef.current = cameras.map((camera) =>
      new mod.default.Marker({ element: createCameraEl(camera), anchor: 'center' })
        .setLngLat([camera.lng, camera.lat])
        .addTo(map),
    )
  }, [cameras])

  renderRef.current = renderPins

  // Rebuild the cluster index whenever the plotted pin set changes — clustering must always
  // reflect what is on the map, so this one DOES key on identity and runs eagerly.
  useEffect(() => {
    const clusterMod = clusterModRef.current
    if (!ready || !clusterMod) return
    indexRef.current = clusterMod.buildClusterIndex(markers)
  }, [ready, markers])

  // ---- camera fit (review R-1) ---------------------------------------------------------------
  //
  // Two things this effect must NOT do, each a sub-defect of the same finding:
  //
  //  (a) frame the post-proximity set. `fitPoints` is supplied by the caller from the
  //      status/text-filtered projection, so activating proximity or tapping a radius preset
  //      re-plots without re-framing. Framing the narrowed set would pull the camera away from
  //      the point the visitor just long-pressed, and a lone survivor would teleport them to
  //      SINGLE_ZOOM.
  //  (b) key on array IDENTITY. Every search keystroke mints a fresh `filters` → fresh
  //      projection → fresh array, so an identity-keyed effect snapped the camera back to the
  //      overview fit mid-typing EVEN WHEN THE SURVIVING SET WAS UNCHANGED, discarding the
  //      visitor's own pan/flyTo. The phone's declarative `Camera bounds` only moves on a VALUE
  //      change; `fitKey` is that value.
  const effectiveFitPoints = useMemo<readonly LngLat[]>(
    () => fitPoints ?? markers.map((d) => [d.lng, d.lat] as LngLat),
    [fitPoints, markers],
  )
  const fitKey = useMemo(
    () => effectiveFitPoints.map(([lng, lat]) => `${lng},${lat}`).sort().join('|'),
    [effectiveFitPoints],
  )
  // Read through a ref so the point ARRAY's identity never re-triggers the fit — only `fitKey` may.
  const fitPointsRef = useRef(effectiveFitPoints)
  fitPointsRef.current = effectiveFitPoints

  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return
    fitToPoints(map, fitPointsRef.current)
  }, [ready, fitKey])

  // Re-plot the pins after any index rebuild. Declared AFTER the index effect so it runs second
  // within the same commit and always reads the fresh index.
  useEffect(() => {
    if (!ready) return
    renderPins()
  }, [ready, markers, renderPins])

  useEffect(() => {
    if (!ready) return
    renderCameras()
  }, [ready, cameras, renderCameras])

  // The proximity ring — a fill + border line under every marker, matching the phone's
  // ProximityRing layers (fill rgba(0,191,255,0.15), line #00BFFF width 2 opacity 0.85).
  useEffect(() => {
    const map = mapRef.current
    if (!ready || !map) return

    if (!proximityRing) {
      removeRingLayers(map)
      return
    }

    const source = map.getSource?.(PROXIMITY_SOURCE_ID)
    if (source && 'setData' in source) {
      // The `in` check already narrows the source union to GeoJSONSource — no cast (R-27c).
      source.setData(proximityRing)
      return
    }
    map.addSource(PROXIMITY_SOURCE_ID, { type: 'geojson', data: proximityRing })
    map.addLayer({
      id: PROXIMITY_FILL_ID,
      type: 'fill',
      source: PROXIMITY_SOURCE_ID,
      paint: { 'fill-color': PROXIMITY_COLORS.fillLight, 'fill-opacity': 1 },
    })
    map.addLayer({
      id: PROXIMITY_LINE_ID,
      type: 'line',
      source: PROXIMITY_SOURCE_ID,
      paint: { 'line-color': PROXIMITY_COLORS.accent, 'line-width': 2, 'line-opacity': 0.85 },
    })
  }, [ready, proximityRing])

  // ---- loading cover ------------------------------------------------------------------------
  useEffect(() => {
    if (ready || failure) setRevealed(true)
  }, [ready, failure])

  useEffect(() => {
    const failsafe = setTimeout(() => setRevealed(true), COVER_FAILSAFE_MS)
    return () => clearTimeout(failsafe)
  }, [attempt])

  useEffect(() => {
    if (!revealed) return
    const done = setTimeout(() => setCoverMounted(false), COVER_FADE_DURATION_MS)
    return () => clearTimeout(done)
  }, [revealed])

  // ---- long press ---------------------------------------------------------------------------
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const pressOrigin = useRef<{ x: number; y: number } | null>(null)

  const cancelLongPress = useCallback(() => {
    if (pressTimer.current) clearTimeout(pressTimer.current)
    pressTimer.current = null
    pressOrigin.current = null
  }, [])

  useEffect(() => cancelLongPress, [cancelLongPress])

  const onPointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!onLongPressRef.current) return
    const container = containerRef.current
    const map = mapRef.current
    if (!container || !map) return
    cancelLongPress()
    // Secondary contacts never arm a long press (review R-5). Belt-and-braces with the origin
    // ref's cancel-then-re-arm, which already makes a pinch cancel itself.
    if (!event.isPrimary) return
    // `Marker.addTo` appends into `map.getCanvasContainer()`, and mapbox's own controls
    // (attribution, logo) are descendants too — so a press on a pin, a cluster bubble, a camera
    // glyph or "Improve this map" reaches this handler. Holding any of those must not ACTIVATE
    // proximity: at the 1 km default that drops every other location off the map and out of the
    // sheet, centred on a point the visitor never chose. Not a touch-only edge — a press-and-hold
    // left button while reading a pin does it on the desktop path the demo is mostly viewed on.
    const target = event.target as Element | null
    if (target?.closest?.('[data-marker-id], .mapboxgl-ctrl')) return
    const point = toContainerPoint(container, event.clientX, event.clientY)
    pressOrigin.current = { x: event.clientX, y: event.clientY }
    pressTimer.current = setTimeout(() => {
      pressTimer.current = null
      pressOrigin.current = null
      const coord = map.unproject?.(point)
      if (coord) onLongPressRef.current?.(coord.lng, coord.lat)
    }, LONG_PRESS_MS)
  }

  const onPointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const origin = pressOrigin.current
    if (!origin) return
    // A hold that travels is a map drag, not a long press.
    if (Math.abs(event.clientX - origin.x) > LONG_PRESS_SLOP || Math.abs(event.clientY - origin.y) > LONG_PRESS_SLOP) {
      cancelLongPress()
    }
  }

  if (!token) {
    return (
      <div data-map-fallback style={fallbackStyle}>
        <div style={{ fontWeight: 600 }}>Map preview unavailable</div>
        <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 6 }}>
          Add a Mapbox token (NEXT_PUBLIC_MAPBOX_TOKEN) to see the live map.
        </div>
      </div>
    )
  }

  return (
    <>
      <div
        data-map-canvas
        ref={containerRef}
        style={{ position: 'absolute', inset: 0 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={cancelLongPress}
        onPointerCancel={cancelLongPress}
        onPointerLeave={cancelLongPress}
      />
      {coverMounted && <div data-testid="map-loading-cover" style={coverStyle(revealed)} />}
      {failure && (
        <div data-testid="map-error-overlay" role="alert" style={errorOverlayStyle}>
          <div>{failure === 'engine' ? MAP_ENGINE_ERROR : MAP_LOAD_ERROR}</div>
          <button
            type="button"
            data-testid="map-retry-button"
            style={retryStyle}
            onClick={() => {
              setFailure(null)
              setReady(false)
              setRevealed(false)
              setCoverMounted(true)
              setAttempt((n) => n + 1)
            }}
          >
            Retry
          </button>
        </div>
      )}
    </>
  )
})

/** Tear the ring's layers + source down, tolerating any subset already being gone. */
function removeRingLayers(map: MapboxMap): void {
  for (const layerId of [PROXIMITY_FILL_ID, PROXIMITY_LINE_ID]) {
    if (map.getLayer?.(layerId)) map.removeLayer(layerId)
  }
  if (map.getSource?.(PROXIMITY_SOURCE_ID)) map.removeSource(PROXIMITY_SOURCE_ID)
}
