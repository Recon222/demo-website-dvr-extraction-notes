/**
 * Incident-location mapping — the single definition of how a case's stored incident fields
 * become the incident form's working values and back again.
 *
 * Port of the phone's `src/features/case-management/utils/incident-location-mapping.ts`, and it
 * exists for the phone's stated reason: two surfaces edit the same field set (the New Case
 * modal's Incident Location section and the map's Edit Incident Location modal), so the seed and
 * submit logic has to live in one tested place or the two drift.
 *
 * Two deliberate differences from the phone's version, both forced by the demo's own shapes:
 *
 * 1. **Coordinates are strings in the form, numbers in the store.** The phone's
 *    `IncidentLocationFormValues` carries `latitude?: number`; the demo's incident inputs are
 *    plain text fields whose raw string is the editable state (a half-typed `-79.` is a real
 *    state), so parsing happens HERE, on the way out, via the existing `parseCoordinate` — the
 *    same strict parse + range check the phone applies field-side.
 * 2. **No `incidentAddress`.** The phone stores a pre-formatted "street, city" string on the
 *    case; `DemoCase` has no such column because the demo derives it at the point of display
 *    (`ui/screens/map/mapData.ts` `joinAddress`). Emitting one would create a second source of
 *    truth for the same string.
 */

import { parseCoordinate } from '@/features/demo/engine/logic/coordinates'
import type { DemoCase, IncidentCoordSource } from '@/features/demo/engine/types'

/** The incident form's working values. Coordinates are the raw input strings (see header);
 *  `coordinateSource` is `''` until something stamps a provenance. */
export interface IncidentLocationValues {
  businessName: string
  streetAddress: string
  city: string
  latitude: string
  longitude: string
  coordinateSource: IncidentCoordSource | ''
}

/**
 * The incident-only slice of a case. DERIVED from `DemoCase` rather than declared, so the write
 * surface is machine-checked (the phone derives its equivalent from `UpdateCaseInput` for the
 * same reason): widening what an incident edit may touch has to be an explicit, reviewable edit
 * to this key list, never a silent interface drift.
 */
export type IncidentLocationPatch = Pick<
  DemoCase,
  'incidentBusinessName' | 'incidentStreetAddress' | 'incidentCity' | 'incidentCoordinates'
>

/** Seed the incident form from a case. */
export function caseToIncidentValues(c: DemoCase): IncidentLocationValues {
  const coords = c.incidentCoordinates
  return {
    businessName: c.incidentBusinessName,
    streetAddress: c.incidentStreetAddress,
    city: c.incidentCity,
    latitude: coords ? String(coords.lat) : '',
    longitude: coords ? String(coords.lng) : '',
    coordinateSource: coords?.source ?? '',
  }
}

/**
 * Map the incident form's values back to the case's incident fields. Text fields are trimmed
 * (phone `incidentValuesToFields`); `incidentCoordinates` is built ONLY when both coordinates
 * strict-parse and sit in range — a half-pair, or a half-typed number, is meaningless, so the
 * result is `undefined` and the save CLEARS the stored pair rather than keeping a stale one.
 */
export function incidentValuesToPatch(values: IncidentLocationValues): IncidentLocationPatch {
  const lat = parseCoordinate(values.latitude, 'lat')
  const lng = parseCoordinate(values.longitude, 'lng')
  return {
    incidentBusinessName: values.businessName.trim(),
    incidentStreetAddress: values.streetAddress.trim(),
    incidentCity: values.city.trim(),
    incidentCoordinates:
      lat.ok && lng.ok
        ? {
            lat: lat.value,
            lng: lng.value,
            // A pick stamps 'geocoded'; anything else that produced a coordinate pair was typed.
            // Same coercion the bridge's `submitCase` already applies on the create path.
            source: values.coordinateSource === 'geocoded' ? 'geocoded' : 'manual',
          }
        : undefined,
  }
}
