'use client'

import { Field, ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'

export interface NewLocationFields {
  locationName: string
  businessName: string
  streetAddress: string
  city: string
}

export interface NewLocationModalProps {
  form: NewLocationFields
  onChange(field: keyof NewLocationFields, value: string): void
  onSubmit(): void
  onCancel(): void
  onCaptureGps(): void
}

export function NewLocationModal({ form, onChange, onSubmit, onCancel, onCaptureGps }: NewLocationModalProps) {
  return (
    <ModalShell title="New Location" onClose={onCancel}>
      <Field label="Location Name" required value={form.locationName} onChange={(v) => onChange('locationName', v)} placeholder="e.g., Front entrance" />
      <Field label="Business Name" value={form.businessName} onChange={(v) => onChange('businessName', v)} placeholder="Business at this site" />
      <Field label="Street Address" value={form.streetAddress} onChange={(v) => onChange('streetAddress', v)} placeholder="Street address" />
      <Field label="City" value={form.city} onChange={(v) => onChange('city', v)} placeholder="City" />
      <button
        type="button"
        onClick={onCaptureGps}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: 11, borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 13, fontWeight: 600, cursor: 'pointer', marginBottom: 18, width: '100%' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 21s-7-6.4-7-11a7 7 0 1 1 14 0c0 4.6-7 11-7 11z" />
          <circle cx="12" cy="10" r="2.4" />
        </svg>
        Capture GPS coordinates
      </button>
      <ModalActions submitLabel="Create Location" onCancel={onCancel} onSubmit={onSubmit} />
    </ModalShell>
  )
}
