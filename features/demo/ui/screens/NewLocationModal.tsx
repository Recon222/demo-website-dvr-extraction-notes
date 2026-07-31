'use client'

import { Field, ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'
import { glassBtnSecondary } from '@/features/demo/ui/glass-tokens'
import { isLocationNameTaken } from '@/features/demo/engine/logic/location-name'
import type { GpsCoordinates } from '@/features/demo/engine/types'

/** Phone copy, verbatim (`DuplicateLocationModal.tsx:88` / `NewLocationModal`'s field error). */
export const LOCATION_NAME_TAKEN_ERROR = 'A location with this name already exists in this case'

export interface NewLocationFields {
  locationName: string
  businessName: string
  streetAddress: string
  city: string
  locationContact: string
  locationPhone: string
  /** Geocoded coordinates captured from an address pick (carried to submit; not rendered).
   *  `accuracyM` is present only for a rooftop match (see AddressAutocomplete). */
  coordinates?: GpsCoordinates
}

export interface NewLocationModalProps {
  form: NewLocationFields
  onChange(field: keyof NewLocationFields, value: string): void
  onSubmit(): void
  onCancel(): void
  onCaptureGps(): void
  /** Fires when an address pick yields geocoded coordinates (recovery locations are geocode-only —
   *  no manual lat/lng entry, since a DVR always has a real street address). */
  onPickCoords(coords: GpsCoordinates): void
  /** Line under the title. The copy flow sets the phone's
   *  "Submission info copied — enter the new address." (phone `cases.tsx:1111`). */
  subtitle?: string
  /**
   * P3.5 — the copy flow's variant (phone `requireAddress`): a new location that inherits the
   * request must have a NEW street address, so the field is starred and gates Create.
   */
  requireAddress?: boolean
  /** Sibling location names in this case, for the live duplicate-name check. */
  existingNames?: readonly string[]
}

export function NewLocationModal({
  form,
  onChange,
  onSubmit,
  onCancel,
  onCaptureGps,
  onPickCoords,
  subtitle,
  requireAddress,
  existingNames = [],
}: NewLocationModalProps) {
  const isNameEmpty = !form.locationName.trim()
  const isNameTaken = !isNameEmpty && isLocationNameTaken(form.locationName, existingNames)
  const isAddressMissing = !!requireAddress && !form.streetAddress.trim()
  const isSubmitDisabled = isNameEmpty || isNameTaken || isAddressMissing

  const submit = () => {
    if (isSubmitDisabled) return
    onSubmit()
  }

  return (
    <ModalShell title="New Location" onClose={onCancel}>
      {subtitle && <div style={{ fontSize: 13, color: '#99badd', marginTop: -4, marginBottom: 16 }}>{subtitle}</div>}
      <Field
        label="Location Name"
        required
        value={form.locationName}
        onChange={(v) => onChange('locationName', v)}
        placeholder="e.g., Front entrance"
        error={isNameTaken ? LOCATION_NAME_TAKEN_ERROR : undefined}
      />
      <Field label="Business Name" value={form.businessName} onChange={(v) => onChange('businessName', v)} placeholder="Business at this site" />
      <AddressAutocomplete
        label="Street Address"
        required={requireAddress}
        value={form.streetAddress}
        onChange={(v) => onChange('streetAddress', v)}
        onPick={(p) => {
          onChange('streetAddress', p.streetAddress)
          onChange('city', p.city)
          if (p.coordinates) onPickCoords({ lat: p.coordinates.lat, lng: p.coordinates.lng, accuracyM: p.accuracyM })
        }}
        placeholder="Start typing an address…"
      />
      <Field label="City" value={form.city} onChange={(v) => onChange('city', v)} placeholder="City" />
      <Field label="Contact Person" value={form.locationContact} onChange={(v) => onChange('locationContact', v)} placeholder="On-site contact" />
      <Field label="Contact Phone" value={form.locationPhone} onChange={(v) => onChange('locationPhone', v)} placeholder="Contact phone" />
      <button
        type="button"
        onClick={onCaptureGps}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, ...glassBtnSecondary, fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 18, width: '100%' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.4-7-11a7 7 0 1 1 14 0c0 4.6-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
        Capture GPS coordinates
      </button>
      <ModalActions submitLabel="Create Location" submitDisabled={isSubmitDisabled} onCancel={onCancel} onSubmit={submit} />
    </ModalShell>
  )
}
