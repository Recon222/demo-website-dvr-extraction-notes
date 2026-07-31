/**
 * The Case Map builders — header metadata, token injection, output filename.
 *
 * Ported from the phone's `case-map-export/services/case-map-export-service.ts`
 * (`buildCaseMapMeta` :107-126, `buildCaseMapHtml` :137-146, the share filename rule
 * :227-229). The phone's writer/share halves are deliberately absent: they are
 * `expo-file-system` + `expo-sharing`, and the browser's equivalent is the download seam in
 * `ui/inputs/download-file.ts`. Everything here is pure.
 *
 * BUNDLE: this module reaches `template.ts` (~85 KB), so it must never be imported from
 * anything the /demo First Load graph pulls in. `DemoExperience` reaches it through a
 * dynamic `import()` inside the export handler, and it is deliberately NOT re-exported
 * from `engine/index.ts` for the same reason.
 */

import type { DemoCase } from '@/features/demo/engine/types'
import { escapeHtml } from '@/features/demo/engine/logic/pdf/shared'
import { sanitizeFilename } from '@/features/demo/engine/logic/media/captured'
import { CASE_MAP_TEMPLATE_HTML } from '@/features/demo/engine/logic/case-map/template'
import type { CaseMapMeta, GeoJSONFeatureCollection } from '@/features/demo/engine/logic/case-map/types'

/**
 * Derive the map's header metadata from a case.
 *
 * `generatedAt` is a PARAMETER, not an ambient `new Date().toISOString()` (which is what the
 * phone does, case-map-export-service.ts:112). The demo's clock is a seam
 * (`ui/inputs/clock.ts`) and the engine holds no ambient time reads, so the caller supplies
 * the stamp — which also makes the injected JSON assertable byte-for-byte in tests.
 *
 * Only fields the demo's schema actually carries are populated. `classification` and
 * `incidentDateTime` stay unset on both sides (see `CaseMapMeta`); the map degrades by
 * design — no classification chip, no incident line on the timeline.
 */
export function buildCaseMapMeta(caseData: DemoCase | null | undefined, generatedAt: string): CaseMapMeta {
  const meta: CaseMapMeta = {
    caseNumber: caseData?.caseNumber ?? '',
    displayName: caseData?.displayName?.trim() || caseData?.caseNumber || 'Case Map',
    generatedAt,
  }
  if (caseData?.incidentCity) meta.city = caseData.incidentCity
  if (caseData?.oicName) meta.oicName = caseData.oicName
  if (caseData?.oicBadge) meta.oicBadgeNumber = caseData.oicBadge
  if (caseData?.vcName) meta.videoCoordinatorName = caseData.vcName
  if (caseData?.vcBadge) meta.videoCoordinatorBadgeNumber = caseData.vcBadge
  if (caseData?.unit) meta.unit = caseData.unit
  return meta
}

/**
 * JSON for a `<script type="application/json">` body.
 *
 * `JSON.stringify` does not escape `<`, so a location name containing `</script>` would
 * close the tag early: the map's reader (`case-map.app.js:109`) would hit a `JSON.parse`
 * failure inside a bare `catch {}` and render an EMPTY map with no error anywhere. `<`
 * is valid JSON and parses back to `<`, so this is lossless.
 *
 * A hardening the phone does not have (its builder passes `JSON.stringify` straight in,
 * case-map-export-service.ts:143-144) — logged as a back-port candidate in
 * docs/code-reviews/deferred.md §71. It matters more here: on the phone the operator types
 * the data and opens their own export; in the demo the same file is handed to a visitor as
 * a download, and a silently blank map is the failure mode the honesty rule exists to stop.
 */
export function encodeJsonForScriptTag(value: unknown): string {
  return JSON.stringify(value).replace(/</g, '\\u003c')
}

/** The exported page's `<title>` — "Case Map — <case number>", falling back to the display
 *  name and then to the bare label. (The phone ships the prototype's hard-coded sample OCC
 *  in every export; see the `__CASE_TITLE__` delta in tools/port-case-map-template.mjs.) */
export function caseMapTitle(meta: CaseMapMeta): string {
  const label = meta.caseNumber.trim() || meta.displayName.trim()
  return label ? `Case Map — ${label}` : 'Case Map'
}

/**
 * Inject the case data, header metadata, page title and Mapbox token into the template.
 *
 * Function replacers throughout (the phone's `.replace(tok, () => value)` idiom,
 * case-map-export-service.ts:142-145) so a `$`, `$&` or `$1` inside the JSON can never be
 * read as a `String.replace` special pattern. Each token appears exactly once — the port
 * script asserts that at generation time.
 *
 * `mapboxToken` may be empty: the case DATA is fully embedded and renders offline, and only
 * the basemap tiles need the token. That is the phone's behaviour too — its service logs a
 * `case-map-token-absent` warning and exports anyway (:56-67). The demo's caller says so out
 * loud instead, because the visitor is the one who ends up holding the file.
 */
export function buildCaseMapHtml(
  geojson: GeoJSONFeatureCollection,
  meta: CaseMapMeta,
  mapboxToken: string,
): string {
  return CASE_MAP_TEMPLATE_HTML.replace('__CASE_GEOJSON__', () => encodeJsonForScriptTag(geojson))
    .replace('__CASE_META__', () => encodeJsonForScriptTag(meta))
    .replace('__CASE_TITLE__', () => escapeHtml(caseMapTitle(meta)))
    .replace('__MAPBOX_TOKEN__', () => mapboxToken)
}

/**
 * The downloaded file's name. The phone's standalone-share rule verbatim
 * (case-map-export-service.ts:227-229, 238/251): display name, else case number, else
 * "Case", suffixed `-Case-Map`, through `sanitizeFilename`.
 *
 * The demo reuses the engine's existing `sanitizeFilename` (media/captured.ts:56) rather
 * than porting the phone's second copy in `lib/utils/filename-utils.ts` — same character
 * class, and one filename rule per repo.
 */
export function caseMapFileName(caseData: DemoCase | null | undefined): string {
  const base = sanitizeFilename(
    `${caseData?.displayName?.trim() || caseData?.caseNumber || 'Case'}-Case-Map`,
  )
  return `${base}.html`
}

/** The file the phone writes into the case ZIP's `/map` dir (case-map-export-service.ts:70).
 *  Not the download name — kept so a future ZIP export names it identically. */
export const CASE_MAP_FILENAME = 'Case Map.html'

/** `text/html` — what the Blob is minted with. */
export const CASE_MAP_MIME_TYPE = 'text/html'
