'use client'

import { useState } from 'react'

import type { GpsFix } from '@/features/demo/engine/logic/gps'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { CoordinateDisplay } from '@/features/demo/ui/inputs/CoordinateDisplay'
import { GpsCaptureControl } from '@/features/demo/ui/inputs/GpsCaptureControl'
import { reverseGeocode as defaultReverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import { Field } from '@/features/demo/ui/screens/_shared'
import type { UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'

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
 */

export interface LocationFieldValues {
  businessName: string
  streetAddress: string
  city: string
  lat?: number
  lng?: number
  accuracyM?: number
  coordinateSource?: 'gps' | 'geocoded' | 'manual'
}

export interface LocationFieldsProps {
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

export function LocationFields({ values, onChange, deps, reverseGeocode = defaultReverseGeocode }: LocationFieldsProps) {
  // Per-context "reverse-geocode on capture" preference. Default ON, matching the phone's
  // `locationReverseGeocode` setting default (ui-mapping 05:39). The phone persists it in the
  // settings store; the demo has no settings surface until P7, so it lives here for now.
  const [geocodeEnabled, setGeocodeEnabled] = useState(true)
  const [reverseGeocoding, setReverseGeocoding] = useState(false)
  const [lookupFailed, setLookupFailed] = useState(false)

  const handleCapture = async (fix: GpsFix) => {
    // Coordinates land first and stand on their own (phone LocationForm.tsx:119-126).
    onChange({ lat: fix.lat, lng: fix.lng, accuracyM: fix.accuracyM, coordinateSource: 'gps' })
    setLookupFailed(false)
    if (!geocodeEnabled) return

    setReverseGeocoding(true)
    try {
      const address = await reverseGeocode(fix.lat, fix.lng)
      if (address) onChange({ streetAddress: address.streetAddress, city: address.city })
      else setLookupFailed(true)
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
          setLookupFailed(false)
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
        onCapture={handleCapture}
        geocodeEnabled={geocodeEnabled}
        onToggleGeocode={setGeocodeEnabled}
        reverseGeocoding={reverseGeocoding}
        deps={deps}
      />
      {lookupFailed && (
        <div role="status" data-testid="reverse-geocode-notice" style={{ fontSize: 12, color: '#ffd93d', marginTop: -8, marginBottom: 14 }}>
          {REVERSE_GEOCODE_UNAVAILABLE}
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
