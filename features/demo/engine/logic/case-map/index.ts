/**
 * Case Map export — the demo's port of the phone's `case-map-export` sub-feature
 * (`DVR-Extraction-Notes-ReactNative/src/features/case-management/case-map-export/`).
 *
 * One self-contained HTML file: the phone's map, byte-for-byte, with the case's own
 * FeatureCollection and header metadata injected into it. Per parity decision D4 this is the
 * ONE export that is fully real in the browser — a genuine Blob the visitor downloads and
 * keeps — because the artifact was already a web page.
 *
 * DELIBERATELY NOT re-exported from `engine/index.ts`: this barrel reaches the ~85 KB
 * template string, and /demo's First Load budget is pinned at 107 kB. The single consumer
 * (`DemoExperience`'s Export Map handler) reaches it through a dynamic `import()`, which
 * puts the whole thing in its own lazy chunk. Same precedent as `engine/logic/import-log`,
 * which is likewise kept off the barrel for a stated reason.
 */

export {
  buildCaseMapGeoJson,
  caseToIncidentFeature,
  locationToFeature,
  camerasToFeatures,
  hasPlottableFeatures,
  COORDINATE_PRECISION,
} from '@/features/demo/engine/logic/case-map/geojson'

export {
  buildCaseMapHtml,
  buildCaseMapMeta,
  caseMapFileName,
  caseMapTitle,
  encodeJsonForScriptTag,
  CASE_MAP_FILENAME,
  CASE_MAP_MIME_TYPE,
} from '@/features/demo/engine/logic/case-map/build'

export { FEATURE_TYPES } from '@/features/demo/engine/logic/case-map/types'

export type {
  CaseMapMeta,
  FeatureType,
  GeoJSONFeature,
  GeoJSONFeatureCollection,
  GeoJSONPoint,
} from '@/features/demo/engine/logic/case-map/types'
