'use client'

import { Accordion, Field, ModalActions, ModalShell } from '@/features/demo/ui/screens/_shared'
import { AddressAutocomplete } from '@/features/demo/ui/inputs/AddressAutocomplete'

export interface NewCaseFields {
  caseNumber: string
  displayName: string
  unit: string
  oicName: string
  oicBadge: string
  vcName: string
  vcBadge: string
  incidentBusinessName: string
  incidentStreetAddress: string
  incidentCity: string
  notes: string
}

export interface NewCaseModalProps {
  form: NewCaseFields
  onChange(field: keyof NewCaseFields, value: string): void
  onSubmit(): void
  onCancel(): void
}

const sectionLabel = {
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: 0.4,
  textTransform: 'uppercase',
  color: '#7a9fc4',
  margin: '2px 0 10px',
} as const

export function NewCaseModal({ form, onChange, onSubmit, onCancel }: NewCaseModalProps) {
  return (
    <ModalShell title="New Case" onClose={onCancel}>
      <Field label="Case Number" required value={form.caseNumber} onChange={(v) => onChange('caseNumber', v)} placeholder="OCC2025-001" hint="Locked once the case is created — it names the evidence folder." />
      <Field label="Display Name" value={form.displayName} onChange={(v) => onChange('displayName', v)} placeholder="Friendly name" />
      <Field label="Unit" required value={form.unit} onChange={(v) => onChange('unit', v)} placeholder="Investigation unit" />

      <Accordion title="Officer in Charge">
        <Field label="OIC Name" value={form.oicName} onChange={(v) => onChange('oicName', v)} placeholder="Officer in charge" />
        <Field label="OIC Badge" value={form.oicBadge} onChange={(v) => onChange('oicBadge', v)} placeholder="Badge number" />
      </Accordion>

      <Accordion title="Video / Canvas Coordinator">
        <Field label="Coordinator Name" value={form.vcName} onChange={(v) => onChange('vcName', v)} placeholder="Video coordinator" />
        <Field label="Coordinator Badge" value={form.vcBadge} onChange={(v) => onChange('vcBadge', v)} placeholder="Badge number" />
      </Accordion>

      <div style={sectionLabel}>Incident Location</div>
      <Field label="Business / Scene Name" value={form.incidentBusinessName} onChange={(v) => onChange('incidentBusinessName', v)} placeholder="Where the occurrence happened" />
      <AddressAutocomplete
        label="Street Address"
        value={form.incidentStreetAddress}
        onChange={(v) => onChange('incidentStreetAddress', v)}
        onPick={(p) => {
          onChange('incidentStreetAddress', p.streetAddress)
          onChange('incidentCity', p.city)
        }}
        placeholder="Start typing an address…"
      />
      <Field label="City" value={form.incidentCity} onChange={(v) => onChange('incidentCity', v)} placeholder="City" />

      <Field label="Notes" multiline value={form.notes} onChange={(v) => onChange('notes', v)} placeholder="Case notes…" />

      <div style={{ marginTop: 4 }}>
        <ModalActions submitLabel="Create Case" onCancel={onCancel} onSubmit={onSubmit} />
      </div>
    </ModalShell>
  )
}
