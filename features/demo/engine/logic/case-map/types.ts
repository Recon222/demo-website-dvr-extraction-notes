/**
 * The Case Map export's data contract — the GeoJSON shapes and the header metadata the
 * self-contained map reads out of its two `<script type="application/json">` tags.
 *
 * Ported from the phone's `src/features/case-management/types/index.ts:65-79`
 * (`GeoJSONPoint` / `GeoJSONFeature` / `GeoJSONFeatureCollection`) and
 * `case-map-export/services/case-map-export-service.ts:77-93` (`CaseMapMeta`), unchanged —
 * the exported HTML is the phone's file byte-for-byte, so its reader (`loadCase()`,
 * `prototype/assets/case-map.app.js:105-116`) dictates these shapes.
 */

export interface GeoJSONPoint {
  type: 'Point'
  coordinates: [number, number] // [longitude, latitude]
}

export interface GeoJSONFeature {
  type: 'Feature'
  geometry: GeoJSONPoint
  properties: Record<string, unknown>
}

export interface GeoJSONFeatureCollection {
  type: 'FeatureCollection'
  features: GeoJSONFeature[]
}

/**
 * Header metadata surfaced in the map's top bar + incident popup.
 *
 * `classification` and `incidentDateTime` are carried because the map's template already
 * handles them (a classification chip; the red incident line on the scope timeline) — the
 * phone leaves both unset because `Case` has no such fields, and so does the demo
 * (`DemoCase`, engine/types/index.ts:318-340, likewise has neither). Kept in the type so a
 * future field lights the map up with no template change, exactly as the phone's comment
 * says (case-map-export-service.ts:122-124).
 */
export interface CaseMapMeta {
  caseNumber: string
  displayName: string
  /** Free-text label e.g. "Armed Robbery / Video Canvass". Optional. */
  classification?: string
  /** ISO-ish "YYYY-MM-DD HH:mm:ss". Drives the red incident line on the timeline. Optional. */
  incidentDateTime?: string
  city?: string
  agency?: string
  unit?: string
  oicName?: string
  oicBadgeNumber?: string
  videoCoordinatorName?: string
  videoCoordinatorBadgeNumber?: string
  /** When the export ran (ISO). */
  generatedAt: string
}
