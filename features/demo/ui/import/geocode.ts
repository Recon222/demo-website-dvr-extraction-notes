'use client'

import { GeocodingCore } from '@mapbox/search-js-core'

/**
 * Forward-geocoding for imported addresses — the demo analog of the phone's
 * `persistMappedImport` geocode step. An imported recovery request carries a street address but no
 * coordinate, so (exactly like the phone) we forward-geocode it before creating the location, which
 * is what puts imported locations on the map.
 *
 * Non-blocking by contract: returns `null` without a token, on no match, or on any error — the
 * location is still created, just without a pin.
 */

/**
 * Build a geocode query from import address fields. Ported verbatim from the phone's
 * `buildGeocodeQuery`: street+city is most precise; city-only is skipped because it resolves to a
 * city centroid, not the premises.
 */
export function buildGeocodeQuery(streetAddress: string, city: string, businessName: string): string | null {
  if (streetAddress && city) return `${streetAddress}, ${city}`
  if (businessName && city) return `${businessName}, ${city}`
  if (streetAddress) return streetAddress
  return null
}

/** Forward-geocode an address to `{ lng, lat }`, or `null` (no token / no match / error). */
export async function forwardGeocode(query: string): Promise<{ lng: number; lat: number } | null> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
  if (!token) return null
  try {
    const core = new GeocodingCore({ accessToken: token })
    const res = await core.forward(query, { limit: 1 })
    const coords = (res.features ?? [])[0]?.geometry?.coordinates
    if (Array.isArray(coords) && coords.length >= 2 && Number.isFinite(coords[0]) && Number.isFinite(coords[1])) {
      return { lng: coords[0] as number, lat: coords[1] as number }
    }
    return null
  } catch (e) {
    // Deliberate soft-fail (the location is still created, just without a pin) — but an
    // expired/rate-limited token would otherwise fail identically to "no match", forever,
    // with no signal (review L2).
    console.warn('[demo/geocode] forward geocode failed — location will have no map pin:', e)
    return null
  }
}
