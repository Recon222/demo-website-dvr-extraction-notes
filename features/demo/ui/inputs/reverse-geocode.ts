'use client'

import { GeocodingCore } from '@mapbox/search-js-core'

/**
 * Reverse geocoding — coordinates → street + city, for the GPS control's "Geocode" toggle
 * (phone `LocationForm.handleGpsCapture`, LocationForm.tsx:128-161).
 *
 * Sibling of `ui/import/geocode.ts` (forward geocoding for imported addresses) and, like it,
 * NON-BLOCKING by contract: `null` on a missing token, no match, or any error. The captured
 * coordinates are already saved by then — the phone makes the same guarantee
 * ("Coordinates are already saved even if reverse geocoding fails", LocationForm.tsx:158).
 */

export interface ReverseGeocodeResult {
  streetAddress: string
  city: string
}

/** Field extraction ported from phone `transformReverseResult` (mapbox-service.ts:272-286):
 *  street from `context.address.name`, city from `context.place.name`. */
export function pickFromReverseFeature(feature: unknown): ReverseGeocodeResult | null {
  const properties = (feature as { properties?: Record<string, unknown> } | null)?.properties
  if (!properties) return null
  const context = (properties.context ?? {}) as { address?: { name?: string }; place?: { name?: string } }
  const streetAddress = context.address?.name ?? ''
  const city = context.place?.name ?? ''
  // Nothing usable — treat as no match rather than blanking the operator's typed address.
  if (!streetAddress && !city) return null
  return { streetAddress, city }
}

/** Look up the address at a coordinate. Never throws; `null` means "no address to fill in". */
export async function reverseGeocode(lat: number, lng: number): Promise<ReverseGeocodeResult | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null
  try {
    const core = new GeocodingCore({ accessToken: token })
    const res = await core.reverse({ lat, lng }, { limit: 1 })
    return pickFromReverseFeature((res.features ?? [])[0])
  } catch (e) {
    // Soft-fail (the coordinates stand on their own) — but not silent: an expired or
    // rate-limited token would otherwise be indistinguishable from "no address here",
    // forever, with no signal. Same treatment as ui/import/geocode.ts (P1 review L2).
    console.warn('[demo/reverse-geocode] lookup failed — coordinates kept, address not filled:', e)
    return null
  }
}
