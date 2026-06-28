'use client'

import type { ExportInformation } from '@/lib/demo/types'
import { Field, SectionCard, SelectField, Toggle, WizardHeader, WizardNext } from '@/components/demo/screens/_shared'

const MEDIA = ['USB Drive', 'External Hard Drive', 'DVD', 'SD Card', 'Cloud Link']
const FILETYPE = ['Proprietary', 'MP4', 'AVI', 'MKV', 'Mixed']
const VIA = ['Hand Delivered', 'Mailed', 'Secure Upload', 'Picked Up']

/** Only the string-valued keys — the boolean `mediaPlayerIncluded` is driven by `onToggleMediaPlayer`. */
type StringKeys<T> = { [K in keyof T]: T[K] extends string ? K : never }[keyof T]

export interface ExportInfoScreenProps {
  data: ExportInformation
  onChange(field: StringKeys<ExportInformation>, value: string): void
  onToggleMediaPlayer(): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

export function ExportInfoScreen({ data, onChange, onToggleMediaPlayer, onNext, onBack, onMenu }: ExportInfoScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Export Information" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="Export Details">
          <SelectField label="Export Media" value={data.exportMedia} onChange={(v) => onChange('exportMedia', v)} options={MEDIA} />
          <SelectField label="File Type" value={data.fileType} onChange={(v) => onChange('fileType', v)} options={FILETYPE} />
          <Field label="Total Size (GB)" value={data.sizeGb} onChange={(v) => onChange('sizeGb', v)} placeholder="e.g., 12" />
          <SelectField label="Provided Via" value={data.mediaProvidedVia} onChange={(v) => onChange('mediaProvidedVia', v)} options={VIA} />
          <Toggle label="Media player included" on={data.mediaPlayerIncluded} onClick={onToggleMediaPlayer} />
        </SectionCard>
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
