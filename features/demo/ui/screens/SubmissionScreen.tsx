'use client'

import { Field, SectionCard, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { LocationFields, type LocationFieldValues } from '@/features/demo/ui/inputs/LocationFields'
import type { UseGpsCaptureOptions } from '@/features/demo/ui/inputs/useGpsCapture'
import type { reverseGeocode } from '@/features/demo/ui/inputs/reverse-geocode'
import type { DemoLocation, FormFieldId } from '@/features/demo/engine/types'
import { fieldInputStyle, fieldLabelStyle } from '@/features/demo/ui/tokens/field-input'

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

/** The stored fix, as the screen consumes it. Derived from the store's own shape (R-24) so a
 *  change to `DemoLocation.gps` is a compile error here rather than a silent divergence — the
 *  `accuracyM?` widening had to be hand-applied to seven copies, and one was missed. */
export type SubmissionCoordinates = NonNullable<DemoLocation['gps']>

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
  /** Which of this screen's fields the visitor's form profile keeps (P7.3). The three address
   *  components are always-on, so they carry no gate; everything else on the screen does. */
  isFieldVisible(id: FormFieldId): boolean
  onNext(): void
  /** Derived CTA copy — see `WizardNext` / `nextCtaLabel`. Never a literal. */
  nextLabel: string | null
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
  isFieldVisible,
  onChange,
  onCoordinates,
  onNext,
  nextLabel,
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

  // The `showRequester` hoist was here, and U6.1 (§8 item 1) handed its deletion to U6.4a:
  // "a section whose title has nothing under it reads as broken" is the phone's own rule
  // (`FormSection.tsx:114-120`) and `SectionCard` carries it INSIDE the recipe now, so this
  // call site was applying it twice. `Children.toArray` drops `false`, and every child below
  // is a `{isFieldVisible(...) && <Field/>}` — so an all-hidden Requester block resolves to
  // `[]` and the card returns null on its own. `field-visibility.test.tsx:286-295` is the
  // end-to-end proof, unchanged and still green. Mutate the RECIPE, never the consumer.

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Submission Details" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="Case Information">
          {/* A72's label half, from the seam — this line is a `Field` label in everything but
              the input under it, and it sat a step smaller and darker than the five real
              `Field`s in the card below. */}
          <div style={fieldLabelStyle}>{COPY.caseNumber}</div>
          {/* The GEOMETRY half of A72 only, per D10 as amended. The phone's PR #115 replaced
              a `containerStyle={{opacity:0.6}}` that faded its own LABEL; this is two SIBLING
              divs, so the label above is already at full contrast and there is nothing to fix.
              `disabledText` would measure 2.54/3.57 against this opacity's 4.60/5.22 on a box
              carrying the occurrence number — the "label that carries data" D10 forbids
              fading. So: the default branch, `opacity: 0.6`, and the house `aria-disabled`
              idiom (`map/CaseMapPicker.tsx:112` spells it on a plain div the same way). */}
          <div aria-disabled="true" style={{ ...fieldInputStyle(), opacity: 0.6 }}>{occNumber || '—'}</div>
        </SectionCard>
        <SectionCard title="Requester Information">
          {isFieldVisible('submission.requesterName') && <Field label={COPY.requesterName} value={fields.requesterName} onChange={(v) => onChange('requesterName', v)} placeholder={COPY.requesterNamePlaceholder} />}
          {isFieldVisible('submission.requesterBadgeNumber') && <Field label={COPY.requesterBadge} value={fields.requesterBadge} onChange={(v) => onChange('requesterBadge', v)} placeholder={COPY.requesterBadgePlaceholder} />}
          {isFieldVisible('submission.requesterUnit') && <Field label={COPY.requesterUnit} value={fields.requesterUnit} onChange={(v) => onChange('requesterUnit', v)} placeholder={COPY.requesterUnitPlaceholder} hint={COPY.requesterUnitHint} />}
          {isFieldVisible('submission.requesterPhone') && <Field label={COPY.requesterPhone} value={fields.requesterPhone} onChange={(v) => onChange('requesterPhone', v)} placeholder={COPY.requesterPhonePlaceholder} />}
          {isFieldVisible('submission.requesterEmail') && <Field label={COPY.requesterEmail} value={fields.requesterEmail} onChange={(v) => onChange('requesterEmail', v)} placeholder={COPY.requesterEmailPlaceholder} />}
        </SectionCard>
        <SectionCard title="Location Information">
          <LocationFields locationId={locationId} values={locationValues} onChange={handleLocationChange} showGps={isFieldVisible('submission.latitude')} deps={gpsDeps} reverseGeocode={reverseGeocode} />
          {isFieldVisible('submission.locationContact') && <Field label={COPY.contactPerson} value={fields.locationContact} onChange={(v) => onChange('locationContact', v)} placeholder={COPY.contactPlaceholder} />}
          {isFieldVisible('submission.locationPhone') && <Field label={COPY.contactPhone} value={fields.locationPhone} onChange={(v) => onChange('locationPhone', v)} placeholder={COPY.contactPlaceholder} />}
        </SectionCard>
        <WizardNext label={nextLabel} onClick={onNext} />
      </div>
    </div>
  )
}
