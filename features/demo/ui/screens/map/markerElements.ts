import type { MarkerDescriptor } from '@/features/demo/ui/screens/map/buildMarkers'
import type { ClusterDescriptor } from '@/features/demo/ui/screens/map/mapCluster'
import { clusterFontSizeFor, clusterRadiusFor } from '@/features/demo/ui/screens/map/mapCluster'
import type { MapCameraMarker } from '@/features/demo/ui/screens/map/mapData'
import { CAMERA_MARKER, CLUSTER_COLORS } from '@/features/demo/ui/screens/map/mapTokens'
import { formatCoordinate } from '@/features/demo/engine/logic/coordinates'

/**
 * DOM factories for every map marker. Split out of `MapCanvas` so the marker chrome — the part
 * that carries the phone's pin/cluster/camera visuals and their labels — is unit-testable without
 * WebGL, a map instance, or a Mapbox token.
 *
 * Every element carries `data-marker-id` + `data-marker-kind` so taps and assertions can address
 * it, mirroring the seam the original `createMarkerEl` established.
 */

/** Status dot (location) or red teardrop (incident) — unchanged from the original inline factory. */
export function createMarkerEl(d: MarkerDescriptor): HTMLElement {
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

/**
 * A cluster bubble: dark translucent navy disc, borderless, with a white halo'd count on top —
 * the phone's `CLUSTER_CIRCLE_STYLE` + `ClusterBadge` (constants/index.ts:179-195,
 * ClusterBadge.tsx:36-60), sized by the same step expressions.
 *
 * `aria-label` has no phone counterpart (the phone's count is a Mapbox SymbolLayer, which has no
 * accessibility surface at all); on the web the bubble IS a focusable control, so it gets one.
 */
export function createClusterEl(d: ClusterDescriptor): HTMLElement {
  const size = clusterRadiusFor(d.count) * 2
  const el = document.createElement('div')
  el.setAttribute('data-marker-id', d.id)
  el.setAttribute('data-marker-kind', 'cluster')
  el.setAttribute('data-cluster-count', String(d.count))
  el.setAttribute('role', 'button')
  el.setAttribute('aria-label', `Cluster of ${d.count} locations`)
  el.style.cssText = [
    `width:${size}px`,
    `height:${size}px`,
    'border-radius:50%',
    `background:${CLUSTER_COLORS.circle}`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'cursor:pointer',
    `color:${CLUSTER_COLORS.text}`,
    `font-size:${clusterFontSizeFor(d.count)}px`,
    'font-weight:600',
    `text-shadow:0 0 1px ${CLUSTER_COLORS.halo}, 0 0 2px ${CLUSTER_COLORS.halo}`,
  ].join(';')
  el.textContent = d.label
  return el
}

/**
 * A per-camera marker: white circular base + near-black CCTV glyph, centre-anchored, with a
 * tap-toggled name callout above it — the phone's `CameraMarker.tsx`. Tapping toggles the bubble
 * and never selects or flies (ui-mapping 03:105).
 *
 * The glyph is a hand-drawn SVG approximation of MaterialCommunityIcons' `cctv`: the demo has no
 * icon font, and the phone's own comment (CameraMarker.tsx:14-17) rejects a Mapbox sprite for
 * this marker because a silently-missing marker is unacceptable — an inline path can't go
 * missing.
 *
 * Callout content mirrors the phone line for line (CameraMarker.tsx:70-88): name (falling back to
 * the literal `Camera` when blank), then resolution, the 6-dp `lat, lng`, and `±{n}m` — each only
 * when its datum is present.
 */
export function createCameraEl(camera: MapCameraMarker): HTMLElement {
  const displayName = camera.cameraName.trim() || 'Camera'

  const el = document.createElement('div')
  el.setAttribute('data-marker-id', camera.id)
  el.setAttribute('data-marker-kind', 'camera')
  el.style.cssText = 'display:flex;flex-direction:column;align-items:center;position:relative'

  const callout = document.createElement('div')
  callout.setAttribute('data-camera-callout', '')
  callout.style.cssText = [
    'display:none',
    'position:absolute',
    `bottom:${CAMERA_MARKER.glyphSize + 4}px`,
    'min-width:120px',
    'max-width:220px',
    'padding:8px 12px',
    'border-radius:8px',
    'border:1px solid ' + CAMERA_MARKER.calloutBorder,
    `background:${CAMERA_MARKER.calloutBg}`,
    'text-align:center',
    'pointer-events:none',
  ].join(';')

  const lines: string[] = [
    `<div style="color:${CAMERA_MARKER.calloutText};font-size:13px;font-weight:600">${escapeHtml(displayName)}</div>`,
  ]
  if (camera.resolution) {
    lines.push(`<div style="color:${CAMERA_MARKER.calloutTextDim};font-size:11px;margin-top:1px">${escapeHtml(camera.resolution)}</div>`)
  }
  lines.push(
    `<div style="color:${CAMERA_MARKER.calloutText};font-size:11px;font-family:monospace;margin-top:2px">${formatCoordinate(camera.lat, camera.lng)}</div>`,
  )
  if (camera.accuracyM != null && Number.isFinite(camera.accuracyM)) {
    lines.push(`<div style="color:${CAMERA_MARKER.calloutTextDim};font-size:11px;margin-top:1px">±${camera.accuracyM.toFixed(1)}m</div>`)
  }
  callout.innerHTML = lines.join('')

  const button = document.createElement('button')
  button.type = 'button'
  button.setAttribute('data-camera-button', '')
  button.setAttribute('aria-label', `Camera ${displayName}`)
  button.setAttribute('aria-expanded', 'false')
  button.style.cssText = [
    `width:${CAMERA_MARKER.glyphSize}px`,
    `height:${CAMERA_MARKER.glyphSize}px`,
    'border-radius:50%',
    `background:${CAMERA_MARKER.baseColor}`,
    `border:1.5px solid ${CAMERA_MARKER.baseBorder}`,
    'display:flex',
    'align-items:center',
    'justify-content:center',
    'cursor:pointer',
    'padding:0',
    'box-shadow:0 1px 2px rgba(0,0,0,0.3)',
  ].join(';')
  button.innerHTML =
    `<svg width="${CAMERA_MARKER.iconSize}" height="${CAMERA_MARKER.iconSize}" viewBox="0 0 24 24" fill="${CAMERA_MARKER.glyphColor}" aria-hidden="true">` +
    `<path d="M3.6 7.6 15.9 4.3a1.6 1.6 0 0 1 2 1.13l.73 2.72a1.6 1.6 0 0 1-1.13 1.96L5.2 13.4a1.6 1.6 0 0 1-1.96-1.13L2.5 9.55A1.6 1.6 0 0 1 3.6 7.6Z"/>` +
    `<path d="M9.4 13.1v3.5a1.2 1.2 0 0 1-1.2 1.2H5.1v1.8h3.1a3 3 0 0 0 3-3v-4Z"/>` +
    `<circle cx="20.2" cy="8.6" r="1.7"/></svg>`

  button.addEventListener('click', (event) => {
    // Never bubble to the map: a camera tap toggles its bubble and must not select or fly.
    event.stopPropagation()
    const open = callout.style.display !== 'none'
    callout.style.display = open ? 'none' : 'block'
    button.setAttribute('aria-expanded', String(!open))
  })

  el.appendChild(callout)
  el.appendChild(button)
  return el
}

/** Minimal escaping for the values interpolated into the callout's markup. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}
