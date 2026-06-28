'use client'

import { Field, SectionCard, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'

export interface SubmissionFields {
  requesterName: string
  requesterBadge: string
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
}

export function SubmissionScreen({ occNumber, fields, onChange, onNext, onBack, onMenu }: SubmissionScreenProps) {
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
          <Field label="Requester Phone" value={fields.requesterPhone} onChange={(v) => onChange('requesterPhone', v)} placeholder="e.g., 905-555-1234" />
          <Field label="Requester Email" value={fields.requesterEmail} onChange={(v) => onChange('requesterEmail', v)} placeholder="e.g., det@dept.ca" />
        </SectionCard>
        <SectionCard title="Location Information">
          <Field label="Business Name" value={fields.businessName} onChange={(v) => onChange('businessName', v)} placeholder="Business at this location" />
          <Field label="Street Address" value={fields.streetAddress} onChange={(v) => onChange('streetAddress', v)} placeholder="Street address" />
          <Field label="City" value={fields.city} onChange={(v) => onChange('city', v)} placeholder="City" />
          <Field label="Contact Person" value={fields.locationContact} onChange={(v) => onChange('locationContact', v)} placeholder="On-site coordinator" />
          <Field label="Contact Phone" value={fields.locationPhone} onChange={(v) => onChange('locationPhone', v)} placeholder="Contact phone" />
        </SectionCard>
        <WizardNext label="Next: Requested Scope" onClick={onNext} />
      </div>
    </div>
  )
}
