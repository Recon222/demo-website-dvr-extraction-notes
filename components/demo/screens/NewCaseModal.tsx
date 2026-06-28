'use client'

import { Field, ModalActions, ModalShell } from '@/components/demo/screens/_shared'

export interface NewCaseFields {
  caseNumber: string
  displayName: string
  unit: string
  oicName: string
  oicBadge: string
}

export interface NewCaseModalProps {
  form: NewCaseFields
  onChange(field: keyof NewCaseFields, value: string): void
  onSubmit(): void
  onCancel(): void
}

export function NewCaseModal({ form, onChange, onSubmit, onCancel }: NewCaseModalProps) {
  return (
    <ModalShell title="New Case" onClose={onCancel}>
      <Field label="Case Number" required value={form.caseNumber} onChange={(v) => onChange('caseNumber', v)} placeholder="OCC2025-001" hint="Locked once the case is created — it names the evidence folder." />
      <Field label="Display Name" value={form.displayName} onChange={(v) => onChange('displayName', v)} placeholder="Friendly name" />
      <Field label="Unit" required value={form.unit} onChange={(v) => onChange('unit', v)} placeholder="Investigation unit" />
      <Field label="OIC Name" value={form.oicName} onChange={(v) => onChange('oicName', v)} placeholder="Officer in charge" />
      <Field label="OIC Badge" value={form.oicBadge} onChange={(v) => onChange('oicBadge', v)} placeholder="Badge number" />
      <div style={{ marginTop: 4 }}>
        <ModalActions submitLabel="Create Case" onCancel={onCancel} onSubmit={onSubmit} />
      </div>
    </ModalShell>
  )
}
