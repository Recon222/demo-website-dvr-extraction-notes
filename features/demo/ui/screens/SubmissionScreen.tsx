'use client'

import { Field, SectionCard, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { LocationFields, type LocationFieldValues } from '@/features/demo/ui/inputs/LocationFields'
import type { UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'
import type { reverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import { GLASS } from '@/features/demo/ui/glass-tokens'

/**
 * Submission Details — wizard step 1 (phone `app/(form)/submission.tsx`, ui-mapping 05).
 *
 * Render order and copy are the phone's, section for section (submission.tsx:108-208):
 *   Case Information (read-only OCC#)
 *   Requester Information ×5
 *   Location Information: LocationFields (business → street → city → GPS → coordinates)
 *                         then Contact Person + Contact Phone
 *
 * CONTACT-FIELD PLACEMENT (matrix row 29 asked this to be verified before building): the two
 * contact fields belong to the Location Information SECTION but sit OUTSIDE the shared
 * location form — the phone renders them after `<LocationForm/>`, i.e. after the GPS control
 * and the coordinate card (submission.tsx:189-207, ui-mapping 05:41-42). They already existed
 * in the demo directly under City; adding the GPS block above them is what puts them in the
 * phone's position.
 *
 * Presentational: values in, callbacks out (`onChange` for the flat text fields,
 * `onCoordinates` for the coordinate write) — the store lives in DemoExperience.
 */

export interface SubmissionFields {
  requesterName: string
  requesterBadge: string
  requesterUnit: string
  requesterPhone: string
  requesterEmail: string
  businessName: string
  streetAddress: string
  city: string
  locationContact: string
  locationPhone: string
}

export interface SubmissionCoordinates {
  lat: number
  lng: number
  accuracyM?: number
  source: 'gps' | 'geocoded' | 'manual'
}

export interface SubmissionScreenProps {
  occNumber: string
  /** Identity of the open recovery location — forwarded to `LocationFields` as its write-guard
   *  token so an in-flight reverse-geocode can never land on a location the visitor switched
   *  away from (p2-review R-1). */
  locationId?: string
  fields: SubmissionFields
  /** The recovery location's stored fix, if any — drives the coordinate card. */
  coordinates?: SubmissionCoordinates
  onChange(field: keyof SubmissionFields, value: string): void
  /** Fires whenever a coordinate lands — from a GPS capture (`gps`) or an address pick
   *  (`geocoded`). One write path, so the two sources can never stamp inconsistently. */
  onCoordinates(coords: SubmissionCoordinates): void
  onNext(): void
  onBack(): void
  onMenu(): void
  /** Test seams, forwarded to the GPS capture + reverse-geocode I/O. */
  gpsDeps?: UseGpsCaptureOptions['deps']
  reverseGeocode?: typeof reverseGeocode
}

/** Phone copy, verbatim (submission.tsx:109-206 / ui-mapping 05:26-42). */
const COPY = {
  caseNumber: 'Case Number',
  requesterName: 'Requester Name',
  requesterNamePlaceholder: 'Who requested video from this location',
  requesterBadge: 'Requester Badge',
  requesterBadgePlaceholder: 'Badge number',
  requesterUnit: 'Requester Unit',
  requesterUnitPlaceholder: 'Unit (defaults to case unit if empty)',
  requesterUnitHint: 'Leave empty to use case unit, or override for this location',
  requesterPhone: 'Requester Phone',
  requesterPhonePlaceholder: 'e.g., 905-555-1234',
  requesterEmail: 'Requester Email',
  requesterEmailPlaceholder: 'e.g., cop@dept.ca',
  contactPerson: 'Contact Person',
  contactPhone: 'Contact Phone',
  contactPlaceholder: 'Optional',
} as const

export function SubmissionScreen({
  occNumber,
  locationId,
  fields,
  coordinates,
  onChange,
  onCoordinates,
  onNext,
  onBack,
  onMenu,
  gpsDeps,
  reverseGeocode,
}: SubmissionScreenProps) {
  const locationValues: LocationFieldValues = {
    businessName: fields.businessName,
    streetAddress: fields.streetAddress,
    city: fields.city,
    lat: coordinates?.lat,
    lng: coordinates?.lng,
    accuracyM: coordinates?.accuracyM,
    coordinateSource: coordinates?.source,
  }

  // The phone's `handleLocationChange` (submission.tsx:63-86): a partial patch is split into
  // the flat field writes and the coordinate write.
  const handleLocationChange = (updates: Partial<LocationFieldValues>) => {
    if (updates.businessName !== undefined) onChange('businessName', updates.businessName)
    if (updates.streetAddress !== undefined) onChange('streetAddress', updates.streetAddress)
    if (updates.city !== undefined) onChange('city', updates.city)
    if (updates.lat !== undefined && updates.lng !== undefined) {
      onCoordinates({
        lat: updates.lat,
        lng: updates.lng,
        accuracyM: updates.accuracyM,
        source: updates.coordinateSource ?? 'geocoded',
      })
    }
  }

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Submission Details" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="Case Information">
          <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>{COPY.caseNumber}</div>
          <div style={{ width: '100%', borderRadius: 8, border: GLASS.border, background: '#0d1b2a', color: '#f0f4f8', fontSize: 15, padding: '11px 12px', opacity: 0.6 }}>{occNumber || '—'}</div>
        </SectionCard>
        <SectionCard title="Requester Information">
          <Field label={COPY.requesterName} value={fields.requesterName} onChange={(v) => onChange('requesterName', v)} placeholder={COPY.requesterNamePlaceholder} />
          <Field label={COPY.requesterBadge} value={fields.requesterBadge} onChange={(v) => onChange('requesterBadge', v)} placeholder={COPY.requesterBadgePlaceholder} />
          <Field label={COPY.requesterUnit} value={fields.requesterUnit} onChange={(v) => onChange('requesterUnit', v)} placeholder={COPY.requesterUnitPlaceholder} hint={COPY.requesterUnitHint} />
          <Field label={COPY.requesterPhone} value={fields.requesterPhone} onChange={(v) => onChange('requesterPhone', v)} placeholder={COPY.requesterPhonePlaceholder} />
          <Field label={COPY.requesterEmail} value={fields.requesterEmail} onChange={(v) => onChange('requesterEmail', v)} placeholder={COPY.requesterEmailPlaceholder} />
        </SectionCard>
        <SectionCard title="Location Information">
          <LocationFields locationId={locationId} values={locationValues} onChange={handleLocationChange} deps={gpsDeps} reverseGeocode={reverseGeocode} />
          <Field label={COPY.contactPerson} value={fields.locationContact} onChange={(v) => onChange('locationContact', v)} placeholder={COPY.contactPlaceholder} />
          <Field label={COPY.contactPhone} value={fields.locationPhone} onChange={(v) => onChange('locationPhone', v)} placeholder={COPY.contactPlaceholder} />
        </SectionCard>
        <WizardNext label="Next: Requested Scope" onClick={onNext} />
      </div>
    </div>
  )
}
