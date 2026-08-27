'use client'

import { useEffect, useRef, useState, useId } from 'react'

import { parseCoordinate, type CoordKind } from '@/features/demo/engine/logic/coordinates'
import type { IncidentLocationValues } from '@/features/demo/engine/logic/incident-location'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { CoordinateDisplay } from '@/features/demo/ui/inputs/CoordinateDisplay'
import { GPS_CONTROL_LABELS } from '@/features/demo/ui/inputs/GpsCaptureControl'
import {
  REVERSE_GEOCODE_PARTIAL,
  REVERSE_GEOCODE_UNAVAILABLE,
} from '@/features/demo/ui/inputs/LocationFields'
import { reverseGeocode as defaultReverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import { Field, FieldError } from '@/features/demo/ui/screens/_shared'
import { fieldLabelStyle, fieldInputStyle } from '@/features/demo/ui/tokens/field-input'

/**
 * The demo's port of the phone's `IncidentLocationForm`
 * (`src/features/location/components/IncidentLocationForm.tsx`) — the case-level INCIDENT SCENE
 * field set, as distinct from `LocationFields` (the recovery-site block). Render order is the
 * phone's (IncidentLocationForm.tsx:275-363, ui-mapping 03:286-294):
 *
 *   Business / Scene Name → Street Address (autocomplete) → City → Latitude / Longitude →
 *   CoordinateDisplay (only once both coordinates exist)
 *
 * Presentational: values in, patches out. It is the "one form, two modes" the parity matrix
 * (row 23) asks for — the New Case modal's Incident Location section and the map's
 * Edit Incident Location modal are the same fields with different chrome around them.
 *
 * ── Deliberate deviation: no GPS capture control ────────────────────────────────────────────
 * The phone mounts a `GpsCaptureControl` here, forced to 'precise', which is also where its
 * reverse-geocode toggle lives. The demo does NOT: `DemoCase.incidentCoordinates.source` is
 * typed to `COORD_SOURCES` (`'geocoded' | 'manual'`) with an explicit "never a live GPS fix"
 * invariant (`engine/types/index.ts`), and the parity plan's P3.6 row scopes this package to
 * "manual/geocoded source stamping". A capture button would have to widen that union across the
 * store, the create path and the provenance chip — a different package's change. See
 * `docs/code-reviews/deferred.md` §53 for the un-defer trigger; `GpsCaptureControl` is already
 * parameterised for it.
 *
 * The consequence for reverse-geocoding: the phone's TWO entry points (post-capture, and a
 * manual-coordinate blur — IncidentLocationForm.tsx:206 and :215-223) collapse to the one the
 * demo can reach. The blur path is ported faithfully, including both of the phone's guards:
 * `lastGeocoded` (re-blurring an unchanged pair must not re-fire the lookup, phone :219) and a
 * monotonic request id so an older in-flight lookup can never overwrite a newer pair's address
 * (phone :166/173/188).
 *
 * There is no toggle: the phone's `incidentReverseGeocode` preference defaults to ON
 * (`settings-store.ts:72`) and the demo has no settings surface until P7, so this behaves as the
 * phone does out of the box — the same call `LocationFields` made for its own preference.
 */

export interface IncidentLocationFieldsProps {
  values: IncidentLocationValues
  /** Partial patch — mirrors the phone's `onChange(updates: Partial<IncidentLocationFormValues>)`. */
  onChange(updates: Partial<IncidentLocationValues>): void
  /**
   * Reverse-geocode outcome, surfaced by the host as a banner (phone
   * `EditIncidentLocationModal`'s `onReverseGeocodeError` → `submitError`,
   * EditIncidentLocationModal.tsx:74-76/123-132).
   *
   * ONE deviation from the phone's signature: `null` is sent when a fresh lookup starts and
   * when one fully succeeds. The phone's callback is set-only, so a resolved failure keeps
   * accusing the user until they hit Save. Clearing on a new attempt is `LocationFields`' own
   * reviewed behaviour (`setLookupNotice('none')` at the top of each capture).
   */
  onReverseGeocodeError?(message: string | null): void
  /** Test seam, matching `LocationFields`. */
  reverseGeocode?: typeof defaultReverseGeocode
}

/** Phone copy, verbatim (IncidentLocationForm.tsx:279-347 / ui-mapping 03:286-292). */
export const INCIDENT_FIELD_LABELS = {
  businessName: 'Business / Scene Name',
  businessNamePlaceholder: 'Optional',
  streetAddress: 'Street Address',
  streetAddressPlaceholder: 'Start typing an address...',
  city: 'City',
  cityPlaceholder: 'City name',
  latitude: 'Latitude',
  latitudePlaceholder: 'e.g., 43.65',
  longitude: 'Longitude',
  longitudePlaceholder: 'e.g., -79.38',
} as const

/** A single manual coordinate input. Validation is the caller's (it needs BOTH axes to decide
 *  whether to look the address up), so this is presentation plus the raw blur signal. */
function CoordinateField({
  label,
  kind,
  value,
  error,
  onChange,
  onBlur,
}: {
  label: string
  kind: CoordKind
  value: string
  error?: string
  onChange(v: string): void
  onBlur(): void
}) {
  const errorId = `${useId()}-error`
  const [focused, setFocused] = useState(false)
  return (
    <div style={{ flex: 1 }}>
      <div style={fieldLabelStyle}>{label}</div>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false)
          onBlur()
        }}
        placeholder={kind === 'lat' ? INCIDENT_FIELD_LABELS.latitudePlaceholder : INCIDENT_FIELD_LABELS.longitudePlaceholder}
        aria-label={label}
        aria-invalid={error !== undefined}
        // The treatment the shared `Field` gained in this same phase (§56e), applied to the one
        // input that missed it (review R-16). Without the association an SR visitor heard
        // "invalid entry" and never why; `role="alert"` announces it, since this message is
        // raised by a deliberate action (blur), not by a live per-keystroke check.
        aria-describedby={error ? errorId : undefined}
        inputMode="text"
        autoComplete="off"
        style={fieldInputStyle({ error: Boolean(error), focused })}
      />
      {error && (
        <FieldError id={errorId} role="alert">
          {error}
        </FieldError>
      )}
    </div>
  )
}

export function IncidentLocationFields({
  values,
  onChange,
  onReverseGeocodeError,
  reverseGeocode = defaultReverseGeocode,
}: IncidentLocationFieldsProps) {
  const [latError, setLatError] = useState<string | undefined>(undefined)
  const [lngError, setLngError] = useState<string | undefined>(undefined)
  const [lookingUp, setLookingUp] = useState(false)

  // Write guard. This component is mounted per-edit (the host modal is conditionally rendered),
  // so "still mounted" is the whole identity check — unlike `LocationFields`, which survives a
  // location switch and therefore needs the R-32 id token as well. A lookup that settles after
  // the modal closed must not write into the form state a LATER edit has already re-seeded.
  const mounted = useRef(true)
  useEffect(
    () => () => {
      mounted.current = false
    },
    [],
  )
  // Phone :108 — the last "lat,lng" looked up, so re-blurring an unchanged pair is a no-op.
  const lastGeocoded = useRef<string | null>(null)
  // Phone :113 — only the newest request's result may be applied.
  const requestSeq = useRef(0)

  /** Retire every in-flight lookup and take the spinner with it. Used when something NEWER and
   *  authoritative supersedes them (an address pick), so the retired request's `finally` can't
   *  leave the spinner up for a lookup that no longer owns the fields. */
  const abandonLookups = () => {
    requestSeq.current += 1
    setLookingUp(false)
  }

  const runReverseGeocode = async (lat: number, lng: number, key: string) => {
    const mine = ++requestSeq.current
    lastGeocoded.current = key
    setLookingUp(true)
    onReverseGeocodeError?.(null)
    try {
      const address = await reverseGeocode(lat, lng)
      if (!mounted.current || requestSeq.current !== mine) return
      if (!address) {
        onReverseGeocodeError?.(REVERSE_GEOCODE_UNAVAILABLE)
        return
      }
      // R-17 discipline (LocationFields): write ONLY what the lookup resolved. An empty
      // component means "not found", never "clear the address the operator typed".
      const patch: Partial<IncidentLocationValues> = {}
      if (address.streetAddress) patch.streetAddress = address.streetAddress
      if (address.city) patch.city = address.city
      if (Object.keys(patch).length > 0) onChange(patch)
      onReverseGeocodeError?.(address.streetAddress && address.city ? null : REVERSE_GEOCODE_PARTIAL)
    } catch {
      // `reverseGeocode` soft-fails by contract, so this only fires for an injected seam or a
      // future implementation that throws. Same treatment as no address — never a stranded
      // spinner or an unhandled rejection.
      if (!mounted.current || requestSeq.current !== mine) return
      onReverseGeocodeError?.(REVERSE_GEOCODE_UNAVAILABLE)
    } finally {
      if (mounted.current && requestSeq.current === mine) setLookingUp(false)
    }
  }

  /** Blur on either coordinate: validate that axis, then look the address up if the PAIR is now
   *  valid and different from the last one looked up (phone `maybeGeocodeManual`, :215-223). */
  const handleCoordinateBlur = (kind: CoordKind) => {
    const raw = kind === 'lat' ? values.latitude : values.longitude
    const setError = kind === 'lat' ? setLatError : setLngError
    if (raw.trim() === '') setError(undefined)
    else {
      const r = parseCoordinate(raw, kind)
      setError(r.ok ? undefined : r.error)
    }

    const lat = parseCoordinate(values.latitude, 'lat')
    const lng = parseCoordinate(values.longitude, 'lng')
    if (!lat.ok || !lng.ok) return
    const key = `${lat.value},${lng.value}`
    if (lastGeocoded.current === key) return
    void runReverseGeocode(lat.value, lng.value, key)
  }

  const lat = parseCoordinate(values.latitude, 'lat')
  const lng = parseCoordinate(values.longitude, 'lng')

  return (
    <div data-testid="incident-location-fields">
      <Field
        label={INCIDENT_FIELD_LABELS.businessName}
        value={values.businessName}
        onChange={(v) => onChange({ businessName: v })}
        placeholder={INCIDENT_FIELD_LABELS.businessNamePlaceholder}
      />
      <AddressAutocomplete
        label={INCIDENT_FIELD_LABELS.streetAddress}
        value={values.streetAddress}
        onChange={(v) => onChange({ streetAddress: v })}
        onPick={(p) => {
          if (!mounted.current) return
          // A pick is newer and authoritative: it brings street, city AND the coordinates they
          // belong to. Any reverse-geocode still in flight was started from the PREVIOUS
          // coordinates, so letting it settle would write that address over this one — the
          // mirror image of the guard `runReverseGeocode` already applies to itself. (The phone
          // has this gap: `handleAddressSelect` never touches `geocodeRequestRef`, :145-158.)
          abandonLookups()
          onChange({
            streetAddress: p.streetAddress,
            city: p.city,
            // A pick carries the authoritative coordinates for that address; stamping
            // 'geocoded' is what the phone's `handleAddressSelect` does (:145-158).
            ...(p.coordinates
              ? { latitude: String(p.coordinates.lat), longitude: String(p.coordinates.lng), coordinateSource: 'geocoded' as const }
              : {}),
          })
          if (p.coordinates) {
            // The address came WITH these coordinates — a reverse lookup on them would only
            // re-derive what we were just handed.
            lastGeocoded.current = `${p.coordinates.lat},${p.coordinates.lng}`
            setLatError(undefined)
            setLngError(undefined)
          }
          onReverseGeocodeError?.(null)
        }}
        placeholder={INCIDENT_FIELD_LABELS.streetAddressPlaceholder}
      />
      <Field
        label={INCIDENT_FIELD_LABELS.city}
        value={values.city}
        onChange={(v) => onChange({ city: v })}
        placeholder={INCIDENT_FIELD_LABELS.cityPlaceholder}
      />

      <div style={{ display: 'flex', gap: 12, marginBottom: 4 }}>
        <CoordinateField
          label={INCIDENT_FIELD_LABELS.latitude}
          kind="lat"
          value={values.latitude}
          error={latError}
          onChange={(v) => onChange({ latitude: v, coordinateSource: 'manual' })}
          onBlur={() => handleCoordinateBlur('lat')}
        />
        <CoordinateField
          label={INCIDENT_FIELD_LABELS.longitude}
          kind="lng"
          value={values.longitude}
          error={lngError}
          onChange={(v) => onChange({ longitude: v, coordinateSource: 'manual' })}
          onBlur={() => handleCoordinateBlur('lng')}
        />
      </div>

      {lookingUp && (
        <div role="status" data-testid="incident-lookup-status" style={{ fontSize: 12, color: '#7a9fc4', margin: '8px 0 4px' }}>
          {GPS_CONTROL_LABELS.lookingUp}
        </div>
      )}

      {/* Coordinate summary — rendered only once both axes are valid, as the phone gates it
          (:354). The incident scene carries no measured accuracy, so the card shows the pair
          and its provenance and omits the accuracy/rating chips by its own rules. */}
      {lat.ok && lng.ok && (
        <div style={{ marginTop: 10 }}>
          <CoordinateDisplay lat={lat.value} lng={lng.value} source={values.coordinateSource === '' ? undefined : values.coordinateSource} />
        </div>
      )}
    </div>
  )
}
