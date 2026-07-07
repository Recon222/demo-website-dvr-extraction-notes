'use client'

import { Field, SectionCard, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'

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

export interface SubmissionScreenProps {
  occNumber: string
  fields: SubmissionFields
  onChange(field: keyof SubmissionFields, value: string): void
  onNext(): void
  onBack(): void
  onMenu(): void
  /** Fires when an address pick yields geocoded coordinates for this recovery location. */
  onPickCoords(coords: { lat: number; lng: number }): void
}

export function SubmissionScreen({ occNumber, fields, onChange, onNext, onBack, onMenu, onPickCoords }: SubmissionScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Submission Details" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="Case Information">
          <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>Case Number</div>
          <div style={{ width: '100%', borderRadius: 8, border: '1px solid #1e3a5f', background: '#0d1b2a', color: '#f0f4f8', fontSize: 15, padding: '11px 12px', opacity: 0.6 }}>{occNumber || '—'}</div>
        </SectionCard>
        <SectionCard title="Requester Information">
          <Field label="Requester Name" value={fields.requesterName} onChange={(v) => onChange('requesterName', v)} placeholder="Who requested video" />
          <Field label="Requester Badge" value={fields.requesterBadge} onChange={(v) => onChange('requesterBadge', v)} placeholder="Badge number" />
          <Field label="Requester Unit" value={fields.requesterUnit} onChange={(v) => onChange('requesterUnit', v)} placeholder="Section / unit" hint="Defaults to the case unit if left blank." />
          <Field label="Requester Phone" value={fields.requesterPhone} onChange={(v) => onChange('requesterPhone', v)} placeholder="e.g., 905-555-1234" />
          <Field label="Requester Email" value={fields.requesterEmail} onChange={(v) => onChange('requesterEmail', v)} placeholder="e.g., det@dept.ca" />
        </SectionCard>
        <SectionCard title="Location Information">
          <Field label="Business Name" value={fields.businessName} onChange={(v) => onChange('businessName', v)} placeholder="Business at this location" />
          <AddressAutocomplete
            label="Street Address"
            value={fields.streetAddress}
            onChange={(v) => onChange('streetAddress', v)}
            onPick={(p) => {
              onChange('streetAddress', p.streetAddress)
              onChange('city', p.city)
              if (p.coordinates) onPickCoords({ lat: p.coordinates.lat, lng: p.coordinates.lng })
            }}
            placeholder="Start typing an address…"
          />
          <Field label="City" value={fields.city} onChange={(v) => onChange('city', v)} placeholder="City" />
          <Field label="Contact Person" value={fields.locationContact} onChange={(v) => onChange('locationContact', v)} placeholder="On-site coordinator" />
          <Field label="Contact Phone" value={fields.locationPhone} onChange={(v) => onChange('locationPhone', v)} placeholder="Contact phone" />
        </SectionCard>
        <WizardNext label="Next: Requested Scope" onClick={onNext} />
      </div>
    </div>
  )
}
