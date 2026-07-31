/**
 * Camera notes formatter (phone parity: `notes/formatters/camera-formatter.ts`).
 *
 * NOTE: like on the phone, this formatter is fully built and tested but NOT wired
 * into the section registry (product decision PR-86 — the PDF's camera table is the
 * canonical camera surface; the `cameras` section formatter returns ''). It stays so
 * the two-line re-enable recipe in `section-registry.ts` keeps working.
 *
 * Adapted to the demo's `CameraEntry` GPS shape (`gps?: { lat, lng, accuracyM }`
 * instead of the phone's flat `latitude`/`longitude`/`coordinateAccuracy`), keeping
 * the phone's captured-coordinates guard policy (BUG-008/BUG-024): the GPS line is
 * emitted only for finite, in-range fixes, and never for the exact (0,0) pair.
 */

import type { NotesCamera } from '@/features/demo/engine/logic/notes/types'

/** Number of decimal places for GPS coordinate display in notes. */
const COORDINATE_DECIMAL_PLACES = 6

/**
 * The phone's `hasCapturedCoordinates` policy, applied to the demo GPS shape:
 * rejects NaN/Infinity, out-of-range values, and the exact (0,0) null-island pair
 * (a failed fix reported as zeros must never print into a court document).
 */
function hasCapturedCoordinates(gps: { lat: number; lng: number }): boolean {
  const { lat, lng } = gps
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return false
  if (lat === 0 && lng === 0) return false
  return true
}

/**
 * Format camera entries into bullet-point notes: a header bullet with the name,
 * an indented resolution/FPS line, and a conditional GPS line when captured.
 * Cameras without a name are skipped entirely.
 */
export function formatCameras(cameras: NotesCamera[]): string {
  if (!cameras || cameras.length === 0) {
    return ''
  }

  const notes: string[] = []

  cameras.forEach((camera, index) => {
    if (!camera.cameraName) return

    // Camera header bullet
    notes.push(`• Camera ${index + 1}: ${camera.cameraName}`)

    // Resolution and FPS detail line
    const resolution = camera.resolution || 'N/A'
    const fps = camera.recordingFps || 'N/A'
    notes.push(`  Resolution: ${resolution} | FPS: ${fps}`)

    // Conditional GPS line — only when coordinates are CAPTURED, not merely present.
    if (camera.gps && hasCapturedCoordinates(camera.gps)) {
      const lat = camera.gps.lat.toFixed(COORDINATE_DECIMAL_PLACES)
      const lng = camera.gps.lng.toFixed(COORDINATE_DECIMAL_PLACES)
      const accuracyM = camera.gps.accuracyM
      const accuracy = accuracyM != null && Number.isFinite(accuracyM) && accuracyM > 0
        ? ` (±${Math.round(accuracyM)}m)`
        : ''
      notes.push(`  GPS Location: ${lat}, ${lng}${accuracy}`)
    }
  })

  return notes.join('\n')
}
