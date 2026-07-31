'use client'

import { useEffect, useRef, useState } from 'react'

import type { GpsFix } from '@/features/demo/engine/logic/gps'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { CoordinateDisplay } from '@/features/demo/ui/inputs/CoordinateDisplay'
import { GpsCaptureControl } from '@/features/demo/ui/inputs/GpsCaptureControl'
import { reverseGeocode as defaultReverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import { Field } from '@/features/demo/ui/screens/_shared'
import type { UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'
import type { GpsCoordinates, GpsSource } from '@/features/demo/engine/types'

/**
 * The demo's port of the phone's `LocationForm`
 * (`src/features/location/components/LocationForm.tsx`) — the reusable address block shared by
 * every screen that captures a recovery location. Render order is the phone's, verbatim
 * (LocationForm.tsx:168-224, ui-mapping 05:35-40):
 *
 *   Business/Location Name → Street Address (autocomplete) → City → GPS capture + Geocode
 *   toggle → CoordinateDisplay (only once both coordinates exist)
 *
 * Ownership is the phone's too: the GPS control captures, THIS component reverse-geocodes when
 * the toggle is on, and the parent screen owns the values. `coordinateSource` is stamped here —
 * `'geocoded'` for an address pick (LocationForm.tsx:108), `'gps'` for a capture (:123) — which
 * is the reconciliation the parity matrix's row 29 asks for: one component decides provenance,
 * so the two paths can never disagree.
 *
 * WRITE GUARD (p2-review R-1). Every `onChange` here ends in the bridge's
 * `store.getState().updateField(...)`, which resolves its target at CALL time
 * (`create-store.ts` reads `get().currentLocationId`). The reverse-geocode write happens after
 * an unbounded `await`, so without a token a lookup started on location A can land A's address
 * on location B. `locationId` is the token: the generation ref below is invalidated whenever it
 * changes AND on unmount, and the post-await write is abandoned if the generation moved. The
 * capture half already had this via `useGpsCapture`'s `abortedRef`; the `key` on the control
 * extends that guard from "unmounted" to "different location" too.
 */

/** The address block's working values. The coordinate half is a deliberately FLATTENED,
 *  all-optional projection of `GpsCoordinates` (a half-filled form is a real state here, unlike
 *  a stored fix) — `CoordinateProjection` states that relationship so a field added to
 *  `GpsCoordinates` fails to compile until it is projected (R-24). */
type CoordinateProjection = { [K in keyof GpsCoordinates]?: GpsCoordinates[K] }

export interface LocationFieldValues extends CoordinateProjection {
  businessName: string
  streetAddress: string
  city: string
  coordinateSource?: GpsSource
}

export interface LocationFieldsProps {
  /** Identity of the location these values belong to — the write-guard token (see header).
   *  Optional so a caller without a selection still renders; an undefined id is its own
   *  generation, so a switch to or from "no location" invalidates in-flight lookups too. */
  locationId?: string
  values: LocationFieldValues
  /** Partial patch — mirrors the phone's `onChange(updates: Partial<LocationFormValues>)`. */
  onChange(updates: Partial<LocationFieldValues>): void
  /** Test seams. */
  deps?: UseGpsCaptureOptions['deps']
  reverseGeocode?: typeof defaultReverseGeocode
}

/** Phone copy, verbatim (ui-mapping 05:36-38 / LocationForm.tsx:172-201). */
export const LOCATION_FIELD_LABELS = {
  businessName: 'Business/Location Name',
  businessNamePlaceholder: 'Optional',
  streetAddress: 'Street Address',
  streetAddressPlaceholder: 'Start typing an address...',
  city: 'City',
  cityPlaceholder: 'City name',
} as const

/** Demo-only. The phone's Submission passes no `onReverseGeocodeError`, so a failed lookup is
 *  logged and never surfaced (ui-mapping 05:35). The demo says so instead of going quiet —
 *  and states the part that matters: the coordinates were kept. */
export const REVERSE_GEOCODE_UNAVAILABLE = 'Address lookup unavailable — the captured coordinates were kept.'

/** R-17. Mapbox routinely returns `context.address` without `context.place` (rural addresses,
 *  reduced-context tokens). Writing that through blanked an operator-typed City with a
 *  success-shaped outcome and no notice — and `formatAddress` drops empty components, so the
 *  loss propagated silently to the PDF header, the notes, the Cases row and the map sheet.
 *  Only the components the lookup actually resolved are written; this says the rest stands. */
export const REVERSE_GEOCODE_PARTIAL = 'Address lookup found only part of the address — the rest was left as you typed it.'

/** Which post-lookup notice the block is showing. A union, not two booleans: the outcomes are
 *  mutually exclusive and the "both true" state has no rendering. */
type LookupNotice = 'none' | 'failed' | 'partial'

export function LocationFields({ locationId, values, onChange, deps, reverseGeocode = defaultReverseGeocode }: LocationFieldsProps) {
  // Per-context "reverse-geocode on capture" preference. Default ON, matching the phone's
  // `locationReverseGeocode` setting default (ui-mapping 05:39). The phone persists it in the
  // settings store; the demo has no settings surface until P7, so it lives here for now.
  const [geocodeEnabled, setGeocodeEnabled] = useState(true)
  const [reverseGeocoding, setReverseGeocoding] = useState(false)
  const [lookupNotice, setLookupNotice] = useState<LookupNotice>('none')

  // R-1 write guard. Bumped by the cleanup, which React runs both when `locationId` changes and
  // on unmount — so a lookup in flight across either event is abandoned rather than written.
  const writeGen = useRef(0)
  useEffect(
    () => () => {
      writeGen.current += 1
    },
    [locationId],
  )

  const handleCapture = async (fix: GpsFix) => {
    // Coordinates land first and stand on their own (phone LocationForm.tsx:119-126).
    onChange({ lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, coordinateSource: 'gps' })
    setLookupNotice('none')
    if (!geocodeEnabled) return

    const gen = writeGen.current
    setReverseGeocoding(true)
    try {
      const address = await reverseGeocode(fix.lat, fix.lng)
      // The open location changed (or this unmounted) while the lookup was in flight — the
      // address belongs to a location nobody is editing any more. Drop it silently: writing it
      // would overwrite whoever is open NOW, and a notice about an abandoned lookup on a
      // location the visitor has left is noise.
      if (gen !== writeGen.current) return
      if (!address) {
        setLookupNotice('failed')
        return
      }
      // R-17: write ONLY what the lookup resolved. An empty component means "not found",
      // never "clear what the operator typed".
      const patch: Partial<LocationFieldValues> = {}
      if (address.streetAddress) patch.streetAddress = address.streetAddress
      if (address.city) patch.city = address.city
      if (Object.keys(patch).length > 0) onChange(patch)
      setLookupNotice(address.streetAddress && address.city ? 'none' : 'partial')
    } catch {
      if (gen !== writeGen.current) return
      // `reverseGeocode` soft-fails by contract, so this only fires for an injected seam or a
      // future implementation that throws. Treat it as "no address" — the notice below already
      // says the coordinates were kept — rather than letting it escape as an unhandled
      // rejection and strand the button in its "Looking up address…" state.
      setLookupNotice('failed')
    } finally {
      setReverseGeocoding(false)
    }
  }

  const hasCoordinates = values.lat !== undefined && values.lng !== undefined

  return (
    <>
      <Field
        label={LOCATION_FIELD_LABELS.businessName}
        value={values.businessName}
        onChange={(v) => onChange({ businessName: v })}
        placeholder={LOCATION_FIELD_LABELS.businessNamePlaceholder}
      />
      <AddressAutocomplete
        label={LOCATION_FIELD_LABELS.streetAddress}
        required
        value={values.streetAddress}
        onChange={(v) => onChange({ streetAddress: v })}
        onPick={(p) => {
          onChange({
            streetAddress: p.streetAddress,
            city: p.city,
            ...(p.coordinates
              ? { lat: p.coordinates.lat, lng: p.coordinates.lng, accuracyM: p.accuracyM, coordinateSource: 'geocoded' as const }
              : {}),
          })
          setLookupNotice('none')
        }}
        placeholder={LOCATION_FIELD_LABELS.streetAddressPlaceholder}
      />
      <Field
        label={LOCATION_FIELD_LABELS.city}
        required
        value={values.city}
        onChange={(v) => onChange({ city: v })}
        placeholder={LOCATION_FIELD_LABELS.cityPlaceholder}
      />
      <GpsCaptureControl
        key={locationId ?? '—'}
        // Remount on a location switch so `useGpsCapture`'s unmount abort fires for an
        // in-flight CAPTURE too (R-1's other half) — a 30-120s budget easily outlives a switch.
        onCapture={handleCapture}
        geocodeEnabled={geocodeEnabled}
        onToggleGeocode={setGeocodeEnabled}
        reverseGeocoding={reverseGeocoding}
        deps={deps}
      />
      {lookupNotice !== 'none' && (
        <div role="status" data-testid="reverse-geocode-notice" style={{ fontSize: 12, color: '#ffd93d', marginTop: -8, marginBottom: 14 }}>
          {lookupNotice === 'failed' ? REVERSE_GEOCODE_UNAVAILABLE : REVERSE_GEOCODE_PARTIAL}
        </div>
      )}
      {hasCoordinates && (
        <CoordinateDisplay
          lat={values.lat!}
          lng={values.lng!}
          accuracyM={values.accuracyM}
          source={values.coordinateSource}
        />
      )}
    </>
  )
}
