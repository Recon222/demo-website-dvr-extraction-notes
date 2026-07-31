'use client'

import { useId } from 'react'

import { Field, ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'
import { LocationFields, type LocationFieldValues } from '@/features/demo/ui/inputs/LocationFields'
import { NEW_LOCATION_BLOCK_MESSAGES, newLocationBlock } from '@/features/demo/engine/logic/new-location-gate'
import type { UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'
import type { reverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import type { DemoLocation } from '@/features/demo/engine/types'

/**
 * New Location — the phone's `NewLocationModal`
 * (`src/features/case-management/components/NewLocationModal.tsx`, ui-mapping 11:64-112).
 *
 * Render order is the phone's, verbatim (ui-mapping 11:79-85):
 *
 *   Location Name → LocationFields (Business/Location Name → Street Address → City →
 *   GPS capture + Geocode toggle → CoordinateDisplay) → Location Contact → Location Phone →
 *   Cancel / Create Location
 *
 * The address block is `LocationFields` mounted WHOLE — the same component the Submission
 * screen uses (P2.3 built it for exactly this). That is what retires deferred §24's
 * location-modal half: "Capture GPS coordinates" was a hard no-op here (the bridge passed
 * `onCaptureGps={() => undefined}`), and it is now the real multi-sample capture, with the
 * reverse-geocode toggle and the coordinate card that come with it. The two contact fields move
 * BELOW the GPS block as a consequence — that is the phone's position for them, not a demo
 * rearrangement (the old demo order put a lone GPS button after them).
 *
 * WRITE GUARD. `LocationFields` has two writes that land after an unbounded await (the
 * reverse-geocode result and the address-pick result) and refuses both unless it is still
 * mounted AND the identity it was issued for is still open — see its header, and deferred §45f,
 * which requires each caller to pass its OWN identity. This modal's identity is `draftId`: the
 * location does not exist yet, so the thing an in-flight lookup belongs to is the DRAFT. Closing
 * the modal mid-capture unmounts this subtree, which (a) trips `useGpsCapture`'s abort so the
 * fix is never emitted and (b) fails `LocationFields`' mounted check so neither post-await write
 * lands. That matters more here than on Submission: this form's values live in `DemoExperience`
 * state that OUTLIVES the modal, so an escaped late write would silently seed the NEXT location
 * the visitor creates.
 *
 * TWO CALLERS, as on the phone (ui-mapping 11:69-72). "Add Location" on a case card mounts it
 * plain; the duplicate flow's "New Location w/ Sub Info [+ Scopes]" actions mount it with
 * `requireAddress` + `subtitle` + a pre-filled `form`. Only the plain caller exists in the demo
 * today — the second is P3.5's to wire, and the props it needs are built and tested here so
 * that wiring is a call-site change, not a component change.
 *
 * Presentational: values in, callbacks out. The store lives in `DemoExperience`.
 */

/** The fix a not-yet-created location carries. Derived from the store's own shape (R-24) so a
 *  change to `DemoLocation.gps` is a compile error here rather than a silent divergence. */
export type NewLocationCoordinates = NonNullable<DemoLocation['gps']>

export interface NewLocationFields {
  locationName: string
  businessName: string
  streetAddress: string
  city: string
  locationContact: string
  locationPhone: string
  /** Coordinates captured before the location exists — from a GPS capture (`gps`) or an address
   *  pick (`geocoded`). Carried to submit and rendered by the coordinate card meanwhile. */
  coordinates?: NewLocationCoordinates
}

export interface NewLocationModalProps {
  form: NewLocationFields
  /** Write-guard token: the DRAFT these values belong to, not a location id (see header +
   *  deferred §45f). Optional so the modal still renders without one; an undefined draft is its
   *  own identity, so it does not silently pass for a real one. */
  draftId?: string
  /** Location names already on the TARGET case — the live duplicate check's comparison set
   *  (phone `existingNames`, NewLocationModal.tsx:36-41). Uniqueness is per-case: the caller
   *  passes one case's siblings, never every name in the demo. */
  existingNames?: readonly string[]
  /**
   * The new-address-copy variant (phone `requireAddress`, NewLocationModal.tsx:54-59): a blank
   * Street Address blocks Create Location, because the whole point of that flow is a NEW
   * address. Off for the ordinary "Add Location" flow, where the phone shows the red asterisk
   * on Street Address but never enforces it (ui-mapping 11:385) — a documented phone asymmetry
   * the demo reproduces rather than "corrects".
   *
   * P3.5's DuplicateLocationModal is the caller (its "New Location w/ Sub Info [+ Scopes]"
   * actions); it passes this together with `subtitle` and a pre-filled `form`.
   */
  requireAddress?: boolean
  /** Optional header caption. The phone's only caller passes
   *  "Submission info copied — enter the new address." (ui-mapping 11:76). */
  subtitle?: string
  /** Partial patch — mirrors the phone's `handleLocationChange` (NewLocationModal.tsx:129-157)
   *  and `LocationFields`' own `onChange` shape, so a capture that writes coordinates and an
   *  address in one gesture is one write per gesture rather than one per field. */
  onChange(patch: Partial<NewLocationFields>): void
  onSubmit(): void
  onCancel(): void
  /** Test seams, forwarded to the GPS capture + reverse-geocode I/O. */
  gpsDeps?: UseGpsCaptureOptions['deps']
  reverseGeocode?: typeof reverseGeocode
}

/** Phone copy, verbatim (NewLocationModal.tsx:211/236-286/305, ui-mapping 11:87-89). */
const COPY = {
  title: 'New Location',
  locationName: 'Location Name',
  locationNamePlaceholder: 'e.g., Main Store, Building A',
  locationContact: 'Location Contact',
  locationContactPlaceholder: 'Contact person name',
  locationPhone: 'Location Phone',
  locationPhonePlaceholder: '(555) 123-4567',
  submit: 'Create Location',
} as const

export function NewLocationModal({
  form,
  draftId,
  existingNames = [],
  requireAddress = false,
  subtitle,
  onChange,
  onSubmit,
  onCancel,
  gpsDeps,
  reverseGeocode,
}: NewLocationModalProps) {
  const blockedId = `${useId()}-blocked`
  // One derivation drives the greyed-out button, the inline field error and the reason line —
  // the phone keeps `validateForm` and the `disabled` condition as two separate lists of the
  // same rules (see `new-location-gate.ts`).
  const block = newLocationBlock({
    locationName: form.locationName,
    streetAddress: form.streetAddress,
    existingNames,
    requireAddress,
  })

  const locationValues: LocationFieldValues = {
    businessName: form.businessName,
    streetAddress: form.streetAddress,
    city: form.city,
    lat: form.coordinates?.lat,
    lng: form.coordinates?.lng,
    accuracyM: form.coordinates?.accuracyM,
    coordinateSource: form.coordinates?.source,
  }

  /** The phone's `handleLocationChange` (NewLocationModal.tsx:129-157): one partial patch split
   *  into the flat text writes and the coordinate write. `lat`/`lng` only ever arrive together
   *  (both writers in `LocationFields` set the pair), so a half-pair never becomes a fix. */
  const handleLocationChange = (updates: Partial<LocationFieldValues>) => {
    const patch: Partial<NewLocationFields> = {}
    if (updates.businessName !== undefined) patch.businessName = updates.businessName
    if (updates.streetAddress !== undefined) patch.streetAddress = updates.streetAddress
    if (updates.city !== undefined) patch.city = updates.city
    if (updates.lat !== undefined && updates.lng !== undefined) {
      patch.coordinates = {
        lat: updates.lat,
        lng: updates.lng,
        // Omitted, never 0, when the source measured nothing — a "±0m · Excellent" chip would
        // be fabricated precision on a coordinate no one measured.
        ...(updates.accuracyM === undefined ? {} : { accuracyM: updates.accuracyM }),
        // One component decides provenance for both paths, so they can never disagree
        // (`LocationFields` stamps `gps` for a capture, `geocoded` for a pick).
        source: updates.coordinateSource ?? 'geocoded',
      }
    }
    if (Object.keys(patch).length > 0) onChange(patch)
  }

  return (
    <ModalShell title={COPY.title} subtitle={subtitle} onClose={onCancel}>
      <Field
        label={COPY.locationName}
        required
        value={form.locationName}
        onChange={(v) => onChange({ locationName: v })}
        placeholder={COPY.locationNamePlaceholder}
        // Live, exactly as on the phone (NewLocationModal.tsx:100-105/:243): the collision is
        // reported at the field the moment it exists, not held back until a submit attempt.
        error={block === 'duplicateName' ? NEW_LOCATION_BLOCK_MESSAGES.duplicateName : undefined}
      />
      <LocationFields
        locationId={draftId}
        values={locationValues}
        onChange={handleLocationChange}
        deps={gpsDeps}
        reverseGeocode={reverseGeocode}
      />
      <Field
        label={COPY.locationContact}
        value={form.locationContact}
        onChange={(v) => onChange({ locationContact: v })}
        placeholder={COPY.locationContactPlaceholder}
      />
      <Field
        label={COPY.locationPhone}
        value={form.locationPhone}
        onChange={(v) => onChange({ locationPhone: v })}
        placeholder={COPY.locationPhonePlaceholder}
      />
      {/* Why the primary action won't fire, as a live region the button points at
          (OcrCaptureScreen's R-15 shape). The wrapper renders unconditionally so the region
          exists before it has content — a region created together with its text is not
          reliably announced. */}
      <div role="status" data-testid="new-location-blocked" style={{ fontSize: 12, color: '#ff6b78' }}>
        {block !== null && (
          <div id={blockedId} style={{ marginBottom: 10 }}>
            {NEW_LOCATION_BLOCK_MESSAGES[block]}
          </div>
        )}
      </div>
      <ModalActions
        submitLabel={COPY.submit}
        onCancel={onCancel}
        // ENFORCEMENT LIVES HERE. `submitBlocked` dims the button and marks it `aria-disabled`
        // but does not swallow the click — see its doc in `_shared.tsx`. Unlike New Case, a
        // blocked click needs no further feedback: the reason is already on screen in the
        // `role="status"` region above, which the button also points at.
        onSubmit={() => {
          if (block !== null) return
          onSubmit()
        }}
        submitBlocked={block !== null}
        submitDescribedBy={blockedId}
      />
    </ModalShell>
  )
}
