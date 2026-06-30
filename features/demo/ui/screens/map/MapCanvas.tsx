'use client'

import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react'
import type { CSSProperties } from 'react'
import type { Map as MapboxMap } from 'mapbox-gl'
// Side-effect CSS for marker/control positioning. Static (not dynamic) so it's processed at module
// load like the demo's own demo.css — the heavy GL *engine* still loads lazily in the effect below.
import 'mapbox-gl/dist/mapbox-gl.css'

/** Imperative handle the orchestrator uses to drive the camera. */
export interface MapCanvasHandle {
  flyTo(lng: number, lat: number, zoom?: number): void
}

export interface MapCanvasProps {
  /** Optional ready callback (the orchestrator wires markers/fit on top in later slices). */
  onReady?(): void
}

const MAP_STYLE = 'mapbox://styles/mapbox/satellite-streets-v12'
// Neutral first-paint centre (≈ Mississauga) until the fit-to-case logic lands in a later slice.
const DEFAULT_CENTER: [number, number] = [-79.65, 43.61]
const DEFAULT_ZOOM = 10

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

/**
 * The Mapbox GL JS canvas — the web analog of the phone's native MapView.
 *
 * mapbox-gl is **lazy** (`await import` inside the effect) so it never enters the marketing bundle and
 * never evaluates under SSR (the `/demo` island is already `ssr:false`). The map instance is always
 * torn down via `map.remove()` on unmount (WebGL/event-listener leak guard). Without
 * `NEXT_PUBLIC_MAPBOX_TOKEN` the component degrades to a styled placeholder — never throws — exactly
 * like the address autocomplete.
 */
export const MapCanvas = forwardRef<MapCanvasHandle, MapCanvasProps>(function MapCanvas(
  { onReady },
  ref,
) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  const containerRef = useRef<HTMLDivElement | null>(null)
  const mapRef = useRef<MapboxMap | null>(null)

  useImperativeHandle(ref, () => ({
    flyTo(lng, lat, zoom) {
      mapRef.current?.flyTo({ center: [lng, lat], ...(zoom != null ? { zoom } : {}) })
    },
  }))

  useEffect(() => {
    if (!token || !containerRef.current) return
    let mounted = true
    let map: MapboxMap | null = null
    void (async () => {
      const mapboxgl = (await import('mapbox-gl')).default
      if (!mounted || !containerRef.current) return
      map = new mapboxgl.Map({
        accessToken: token,
        container: containerRef.current,
        style: MAP_STYLE,
        center: DEFAULT_CENTER,
        zoom: DEFAULT_ZOOM,
      })
      mapRef.current = map
      map.on('load', () => {
        if (mounted) onReady?.()
      })
    })()
    return () => {
      mounted = false
      map?.remove()
      mapRef.current = null
    }
    // onReady intentionally omitted — a fresh callback identity must not rebuild the map.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token])

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
