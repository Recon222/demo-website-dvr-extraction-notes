/**
 * The canonical case FeatureCollection the Case Map reads.
 *
 * Ported from the phone's `src/features/case-management/services/geojson-service.ts`
 * (`caseToIncidentGeoJSONFeature` :170-242, `locationToGeoJSONFeature` :29-161,
 * `camerasToGeoJSONFeatures` :254-311, `generateGeoJSON` :313-346), retargeted from
 * `Case`/`Location` (SQLite rows) onto `DemoCase`/`DemoLocation` (the in-memory store).
 *
 * Emission order is the phone's and is load-bearing for the map: incident first, then
 * locations, then cameras — `case-map.app.js:132-134` partitions the collection by
 * `featureType`, and the incident is drawn on top.
 *
 * ONE projection, like the phone: the map is the only consumer today, but the phone's
 * GeoJSON export reads the same builder, so a demo GeoJSON export (matrix row: honest stub
 * for now) inherits this rather than growing a second, drifting copy.
 *
 * What the demo cannot carry, and why it is omitted rather than filled in:
 * - `createdAt` / `updatedAt` on a location feature (phone geojson-service.ts:61-62).
 *   `DemoLocation` has no timestamps at all (engine/types/index.ts:342-359) and the map
 *   never reads them. A fabricated "created" time on a forensic artifact is exactly the
 *   kind of invented fact this demo refuses.
 * - DVR credentials, OCR image URIs: the phone deliberately never emits them either
 *   (geojson-service.ts:124-127) — noted so a future field-add does not "restore" them.
 */

import type { DemoCase, DemoLocation } from '@/features/demo/engine/types'
import { formatAddress } from '@/features/demo/engine/logic/address-format'
import { hasCapturedCoordinates } from '@/features/demo/engine/logic/coordinates'
import { selectLocationMapStatus } from '@/features/demo/engine/store/selectors'
import type {
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GeoJSONPoint,
} from '@/features/demo/engine/logic/case-map/types'

/** Phone `GEOJSON_CONFIG.COORDINATE_PRECISION` (case-management/constants/index.ts:98-100). */
export const COORDINATE_PRECISION = 6

/** `[lng, lat]` at the canonical precision — the phone's `parseFloat(x.toFixed(6))` idiom. */
function point(lng: number, lat: number): GeoJSONPoint {
  return {
    type: 'Point',
    coordinates: [
      parseFloat(lng.toFixed(COORDINATE_PRECISION)),
      parseFloat(lat.toFixed(COORDINATE_PRECISION)),
    ],
  }
}

/** Truthy-only property write — the phone's dominant idiom, so the map's read side can rely
 *  on key PRESENCE to drive conditional UI (geojson-service.ts:89-113). */
function putIfTruthy(props: Record<string, unknown>, key: string, value: string | undefined): void {
  if (value) props[key] = value
}

/**
 * The case's incident scene as a `featureType: 'incident'` feature, or `null` when the case
 * has no captured incident coordinates.
 *
 * Gate is `hasCapturedCoordinates`, not presence — the phone's BUG-008 rule
 * (geojson-service.ts:175): a stored (0,0) would plot an authoritative incident pin at Null
 * Island in an exported forensic map.
 */
export function caseToIncidentFeature(c: DemoCase): GeoJSONFeature | null {
  const ic = c.incidentCoordinates
  if (!hasCapturedCoordinates(ic)) return null

  const properties: GeoJSONFeature['properties'] = {
    featureType: 'incident',
    // The incident pin's natural id is the case id (phone geojson-service.ts:191-194).
    id: c.id,
    caseId: c.id,
    caseNumber: c.caseNumber,
    businessName: c.incidentBusinessName || null,
    streetAddress: c.incidentStreetAddress || null,
    city: c.incidentCity || null,
    // Deliberately NOT street-type-abbreviated — the incident scene keeps whatever the case
    // creator typed. Same rule the map projection already applies (ui/screens/map/mapData.ts:69-72).
    address: [c.incidentStreetAddress, c.incidentCity].filter(Boolean).join(', ') || null,
  }

  const displayName = c.displayName.trim()
  if (displayName) properties.displayName = displayName

  // `source` is the only provenance the incident carries (no accuracy — an incident coordinate
  // is geocoded or typed, never measured; `DemoCase.incidentCoordinates` has no accuracy member).
  putIfTruthy(properties, 'coordinateSource', ic.source)

  // Case personnel, truthy-only — the incident popup reads these (case-map.app.js:p.oicName …).
  putIfTruthy(properties, 'oicName', c.oicName)
  putIfTruthy(properties, 'oicBadgeNumber', c.oicBadge)
  putIfTruthy(properties, 'videoCoordinatorName', c.vcName)
  putIfTruthy(properties, 'videoCoordinatorBadgeNumber', c.vcBadge)
  putIfTruthy(properties, 'unit', c.unit)

  return { type: 'Feature', geometry: point(ic.lng, ic.lat), properties }
}

/**
 * A recovery location as a `featureType: 'location'` feature, or `null` when it has no
 * captured coordinates (the honest "typed an address, never picked a point" case — the
 * phone's same BUG-008 gate, geojson-service.ts:35).
 */
export function locationToFeature(location: DemoLocation): GeoJSONFeature | null {
  const gps = location.gps
  if (!hasCapturedCoordinates(gps)) return null

  const form = location.form
  const properties: GeoJSONFeature['properties'] = {
    featureType: 'location',
    id: location.id,
    caseId: location.caseId,
    locationName: location.locationName,
    businessName: location.businessName || null,
    streetAddress: location.streetAddress || null,
    city: location.city || null,
    // Street-type-abbreviated, business name omitted (it is its own property) — the exact
    // rule the in-app map already renders with (ui/screens/map/mapData.ts:125).
    address: formatAddress('', location.streetAddress, location.city),
    // The demo has no stored LocationStatus; the pin status is derived from per-screen
    // completion, the same value the live map colours its dots with.
    status: selectLocationMapStatus(location),
    // Always-present arrays (phone geojson-service.ts:68,84-85) — the map does
    // `(p.scopes || []).length`, and an absent key would read the same, but the phone's
    // read side treats presence as the contract.
    scopes: form.scopes,
    extractedScopes: form.extractedScopes,
    arrivalDepartures: form.arrivalDepartures,
    // Count of cameras that actually plot — the SAME gate `camerasToFeatures` applies, so the
    // popup's "N cameras" can never disagree with the number of pins (phone :75-80).
    cameraCount: form.cameras.filter((cam) => hasCapturedCoordinates(cam.gps)).length,
  }

  putIfTruthy(properties, 'locationContact', location.locationContact)
  putIfTruthy(properties, 'locationPhone', location.locationPhone)
  putIfTruthy(properties, 'requesterName', location.requesterName)
  putIfTruthy(properties, 'requesterBadgeNumber', location.requesterBadge)
  putIfTruthy(properties, 'requesterUnit', location.requesterUnit)
  putIfTruthy(properties, 'requesterPhone', location.requesterPhone)
  putIfTruthy(properties, 'requesterEmail', location.requesterEmail)
  // TRUTHY, not `!= null` — the phone's location gate (`if (location.coordinates.accuracy)`,
  // geojson-service.ts:114). Its camera gate below is `!= null` instead; the asymmetry is the
  // phone's and is preserved rather than "tidied", so a re-port is a diff and not an argument.
  if (gps.accuracyM) properties.coordinateAccuracy = gps.accuracyM
  putIfTruthy(properties, 'coordinateSource', gps.source)

  // DVR clock calibration — nested, and emitted only when ≥1 sub-field is present, carrying
  // ONLY present sub-fields (phone :128-139). `timeDifference` is the phone's key name; the
  // demo stores the same human-readable string as `formattedDifference`.
  const off = form.timeOffset
  if (off) {
    const timeCalibration: Record<string, string> = {}
    putIfTruthy(timeCalibration, 'dvrDateTime', off.dvrDateTime)
    putIfTruthy(timeCalibration, 'actualDateTime', off.actualDateTime)
    putIfTruthy(timeCalibration, 'timeDifference', off.formattedDifference)
    putIfTruthy(timeCalibration, 'direction', off.direction)
    if (Object.keys(timeCalibration).length > 0) properties.timeCalibration = timeCalibration
  }

  putIfTruthy(properties, 'fileType', form.export.fileType)
  putIfTruthy(properties, 'notesFreeText', form.notesFreeText)
  putIfTruthy(properties, 'dateTimeCompleted', form.dateTimeCompleted)
  putIfTruthy(properties, 'completedBy', form.completedBy)

  return { type: 'Feature', geometry: point(gps.lng, gps.lat), properties }
}

/**
 * A location's geolocated cameras as `featureType: 'camera'` features.
 *
 * The composite `${locationId}:${cameraId}` id is the phone's (geojson-service.ts:285):
 * `CameraEntry.id` is unique only within one location's array, and the map keys its markers
 * off `properties.id` across the whole collection.
 */
export function camerasToFeatures(location: DemoLocation): GeoJSONFeature[] {
  const features: GeoJSONFeature[] = []

  for (const camera of location.form.cameras) {
    const gps = camera.gps
    if (!hasCapturedCoordinates(gps)) continue

    const properties: GeoJSONFeature['properties'] = {
      featureType: 'camera',
      id: `${location.id}:${camera.id}`,
      cameraId: camera.id,
      locationId: location.id,
      caseId: location.caseId,
      cameraName: camera.cameraName,
    }
    putIfTruthy(properties, 'resolution', camera.resolution)
    putIfTruthy(properties, 'recordingFps', camera.recordingFps)
    // `!= null`, matching the phone's camera gate (geojson-service.ts:300) — see the location
    // builder's note on the asymmetry.
    if (gps.accuracyM != null) properties.coordinateAccuracy = gps.accuracyM
    properties.coordinateSource = gps.source

    features.push({ type: 'Feature', geometry: point(gps.lng, gps.lat), properties })
  }

  return features
}

/**
 * What the export is about to leave OUT, and how much of the case it actually covers
 * (review R-1).
 *
 * A location with no captured fix cannot be plotted, so `locationToFeature` drops it. That
 * drop is correct — a fabricated pin on a forensic artifact is the worse outcome — but it was
 * previously uncounted, unflagged and unmentioned: the visitor was handed a map missing
 * two-thirds of their case under the word "Success". This is the repo's own bar for a lossy
 * transform (`generateExtractedScopes`: skip, COUNT, FLAG, dev-warn).
 *
 * `droppedLocationNames` carries the names rather than just a number so the caller can name
 * them if it ever has room to; today the banner uses the counts.
 */
export interface CaseMapCoverage {
  /** Locations offered to the builder. */
  totalLocations: number
  /** Of those, the ones that will appear as a pin. */
  plottedLocations: number
  /** The rest, in input order — dropped for want of a captured coordinate. */
  droppedLocationNames: readonly string[]
  // NO `hasPlottedLocations` (delta D-12). It was `plottedLocations > 0` under another name:
  // a derived field with no production reader, whose only effect was hand-maintained fixture
  // pairs that could contradict the count they were derived from. Callers write
  // `coverage.plottedLocations > 0`.
}

/**
 * Summarise what `buildCaseMapGeoJson` will and will not include.
 *
 * The gate is `locationToFeature` ITSELF, not a re-implementation of its predicate (delta
 * D-5). The two used to test `hasCapturedCoordinates` independently — they agreed, but one
 * added term in the builder's gate would have re-created r0 R-1's exact shape structurally:
 * a banner over-reporting coverage against a file that dropped more than it admitted. Asking
 * the builder makes divergence impossible rather than merely unlikely.
 *
 * The cost is building the features twice per export (once here, once in the collection) over
 * a list of tens. That is the right trade against a silent miscount on a forensic artifact.
 */
export function summariseCaseMapCoverage(locations: readonly DemoLocation[]): CaseMapCoverage {
  const dropped: string[] = []
  let plotted = 0
  for (const location of locations) {
    if (locationToFeature(location) !== null) plotted += 1
    else dropped.push(location.locationName)
  }
  return {
    totalLocations: locations.length,
    plottedLocations: plotted,
    droppedLocationNames: dropped,
  }
}

/**
 * The whole-case collection: incident → locations → cameras (phone `generateGeoJSON`,
 * geojson-service.ts:313-346). `locations` is expected to be the case's own locations; the
 * caller filters, exactly as the phone's `getLocationsByCase(caseId)` does.
 *
 * Callers that report an outcome to the visitor must pair this with
 * `summariseCaseMapCoverage` — see R-1. The dev-warn below is the developer-facing half of
 * the same rule (`generateExtractedScopes`'s shape, create-store.ts:826-828); it is not a
 * substitute for saying so on screen.
 */
export function buildCaseMapGeoJson(
  caseData: DemoCase | null,
  locations: readonly DemoLocation[],
): GeoJSONFeatureCollection {
  const features: GeoJSONFeature[] = []

  if (caseData) {
    const incident = caseToIncidentFeature(caseData)
    if (incident) features.push(incident)
  }

  let dropped = 0
  for (const location of locations) {
    const feature = locationToFeature(location)
    if (feature) features.push(feature)
    else dropped += 1
  }

  for (const location of locations) {
    features.push(...camerasToFeatures(location))
  }

  if (dropped > 0 && process.env.NODE_ENV !== 'production') {
    console.warn(
      `[demo] buildCaseMapGeoJson omitted ${dropped} location(s) with no captured coordinates`,
    )
  }

  return { type: 'FeatureCollection', features }
}

/**
 * Whether the collection has anything worth exporting — non-camera features only.
 *
 * The phone's guard (`exportAndShareCaseGeoJSON`, geojson-service.ts:553-562, and
 * `MapHost.isCollectionEmpty`): a case whose only fix is a per-camera GPS produces a
 * non-empty collection but has no location/incident framing, and the map would open on a
 * camera pin with no site around it.
 *
 * It answers exactly one question — "does this collection have site framing" — and is NOT the
 * predicate for either of its lookalikes:
 *
 * - "does this map have any sites on it" → `coverage.plottedLocations > 0`. Counting the
 *   incident pin here is why the empty-map caveat used to go silent on a case with zero
 *   plotted locations (r0 R-1).
 * - "is this map empty" → `collection.features.length === 0`. A camera-only collection has no
 *   site framing but renders every camera pin, so reading this as "empty" told a visitor their
 *   file was blank when it was not (delta D-1).
 *
 * NO PRODUCTION READER TODAY, deliberately: it is kept for its §71g purpose, the whole-case
 * GeoJSON refusal P5.2's Export tab will need (`exportAndShareCaseGeoJSON`,
 * geojson-service.ts:553-562). Distinct from a derived duplicate like the deleted
 * `hasPlottedLocations` (delta D-12) — this is a predicate nothing else computes.
 */
export function hasPlottableFeatures(collection: GeoJSONFeatureCollection): boolean {
  return collection.features.some((f) => f.properties.featureType !== 'camera')
}
