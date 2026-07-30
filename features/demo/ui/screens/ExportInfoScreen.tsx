'use client'

import type { ExportInformation } from '@/features/demo/engine/types'
import { Field, SectionCard, SelectField, Toggle, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { EXPORT_MEDIA_OPTIONS, FILE_TYPE_OPTIONS, MEDIA_PROVIDED_OPTIONS } from '@/features/demo/ui/screens/field-options'

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
          {/* Phone parity: "Other" is a stored value on all three selects — the phone's Export
              Info screen has no custom free-text path (unlike Resolution/FPS on DVR/Cameras). */}
          <SelectField label="Export Media" value={data.exportMedia} onChange={(v) => onChange('exportMedia', v)} options={EXPORT_MEDIA_OPTIONS} />
          <SelectField label="File Type" value={data.fileType} onChange={(v) => onChange('fileType', v)} options={FILE_TYPE_OPTIONS} />
          <Field label="Total Size (GB)" value={data.sizeGb} onChange={(v) => onChange('sizeGb', v)} placeholder="e.g., 12" />
          <SelectField label="Provided Via" value={data.mediaProvidedVia} onChange={(v) => onChange('mediaProvidedVia', v)} options={MEDIA_PROVIDED_OPTIONS} />
          <Toggle label="Media player included" on={data.mediaPlayerIncluded} onClick={onToggleMediaPlayer} />
        </SectionCard>
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
