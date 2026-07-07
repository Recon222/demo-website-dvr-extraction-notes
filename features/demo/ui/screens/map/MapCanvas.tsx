'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import type { Map as MapboxMap, Marker as MapboxMarker } from 'mapbox-gl'
// Side-effect CSS for marker/control positioning. Static (not dynamic) so it's processed at module
// load like the demo's own demo.css — the heavy GL *engine* still loads lazily in the effect below.
import 'mapbox-gl/dist/mapbox-gl.css'
import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'

/** Imperative handle the orchestrator uses to drive the camera. */
export interface MapCanvasHandle {
  flyTo(lng: number, lat: number, zoom?: number): void
}

export interface MapCanvasProps {
  /** Status-coloured location dots + the incident teardrop to plot. */
  markers?: MarkerDescriptor[]
  /** Fires with the marker's id when a pin is tapped. */
  onMarkerPress?(id: string): void
  /** Optional ready callback. */
  onReady?(): void
}

type MapboxGl = typeof import('mapbox-gl')

const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'
const DEFAULT_CENTER: [number, number] = [-79.65, 43.61]
const DEFAULT_ZOOM = 10
const SINGLE_ZOOM = 15

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

/** Build the DOM element for a marker: a status-coloured dot (location) or a red teardrop (incident).
 *  Carries `data-marker-id` so taps can be wired to selection. */
function createMarkerEl(d: MarkerDescriptor): HTMLElement {
  const el = document.createElement('div')
  el.setAttribute('data-marker-id', d.id)
  el.setAttribute('data-marker-kind', d.kind)
  el.style.cursor = 'pointer'
  if (d.kind === 'incident') {
    el.style.width = '22px'
    el.style.height = '30px'
    el.innerHTML =
      `<svg width="22" height="30" viewBox="0 0 22 30" fill="none">` +
      `<path d="M11 0C4.9 0 0 4.9 0 11c0 7.7 11 19 11 19s11-11.3 11-19C22 4.9 17.1 0 11 0z" fill="${d.color}" stroke="#fff" stroke-width="1.5"/>` +
      `<circle cx="11" cy="11" r="4" fill="#fff"/></svg>`
  } else {
    el.style.width = '16px'
    el.style.height = '16px'
    el.style.borderRadius = '50%'
    el.style.background = d.color
    el.style.border = '2px solid #fff'
    el.style.boxShadow = '0 0 0 1px rgba(0,0,0,0.35), 0 2px 5px rgba(0,0,0,0.45)'
  }
  return el
}

/** Fit the camera to the plotted points: 1 → centre+zoom, ≥2 → fit the bounding box (leaving room for
 *  the controls overlay and the bottom sheet). */
function fitToPoints(map: MapboxMap, points: Array<[number, number]>): void {
  if (points.length === 0) return
  if (points.length === 1) {
    map.setCenter(points[0])
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

/**
 * The Mapbox GL JS canvas — the web analog of the phone's native MapView. mapbox-gl loads lazily
 * (`await import` in the effect; SSR/bundle-safe), the map is always torn down with `map.remove()`,
 * and a missing token degrades to a styled placeholder (never throws).
 */
export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { markers = [], onMarkerPress, onReady },
  ref,
) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)
  const gqlRef = useRef<MapboxGl | null>(null)
  const markerObjsRef = useRef<MapboxMarker[]>([])
  // Live ref so a fresh onMarkerPress identity never forces the markers to rebuild.
  const onMarkerPressRef = useRef(onMarkerPress)
  onMarkerPressRef.current = onMarkerPress
  const [ready, setReady] = useState(false)

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom) {
      mapRef.current?.flyTo({ center: [lng, lat], ...(zoom != null ? { zoom } : {}) })
    },
  }))

  // Create the map once.
  useEffect(() => {
    if (!token || !containerRef.current) return
    let mounted = true
    let map: MapboxMap | null = null
    void (async () => {
      const mod = await import('mapbox-gl')
      const mapboxgl = mod.default
      if (!mounted || !containerRef.current) return
      gqlRef.current = mod
      map = new mapboxgl.Map({
        accessToken: token,
        container: containerRef.current,
        style: MAP_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      })
      mapRef.current = map
      map.on('load', () => {
        if (!mounted) return
        setReady(true)
        onReady?.()
      })
    })()
    return () => {
      mounted = false
      markerObjsRef.current.forEach((m) => m.remove())
      markerObjsRef.current = []
      map?.remove()
      mapRef.current = null
    }
    // onReady omitted on purpose — a fresh callback identity must not rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

  // Sync markers + fit whenever the map becomes ready or the markers change.
  useEffect(() => {
    const map = mapRef.current
    const mod = gqlRef.current
    if (!ready || !map || !mod) return
    markerObjsRef.current.forEach((m) => m.remove())
    markerObjsRef.current = markers.map((d) => {
      const el = createMarkerEl(d)
      el.addEventListener('click', () => onMarkerPressRef.current?.(d.id))
      return new mod.default.Marker({ element: el, anchor: d.kind === 'incident' ? 'bottom' : 'center' })
        .setLngLat([d.lng, d.lat])
        .addTo(map)
    })
    fitToPoints(map, markers.map((d) => [d.lng, d.lat] as [number, number]))
  }, [ready, markers])

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

  return <div data-map-canvas ref={containerRef} style={{ position: 'absolute', inset: 0 }} />
})
