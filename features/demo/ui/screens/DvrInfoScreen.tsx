'use client'

import type { DvrInformation } from '@/features/demo/engine/types'
import { Field, SectionCard, SelectField, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'

const RES = ['720p (1280×720)', '1080p (1920×1080)', '2K (2560×1440)', '4K (3840×2160)', 'Other']
const FPS = ['10fps', '12fps', '15fps', '25fps', '30fps']

export interface DvrInfoScreenProps {
  dvr: DvrInformation
  onChange(field: keyof DvrInformation, value: string): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

export function DvrInfoScreen({ dvr, onChange, onNext, onBack, onMenu }: DvrInfoScreenProps) {
  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="DVR Information" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        <SectionCard title="Basic DVR Details">
          <Field label="DVR Location" value={dvr.dvrLocation} onChange={(v) => onChange('dvrLocation', v)} placeholder="e.g., Manager's office" />
          <Field label="DVR Type / Brand" value={dvr.dvrTypeBrand} onChange={(v) => onChange('dvrTypeBrand', v)} placeholder="e.g., Hikvision, Dahua" />
          <Field label="Serial / Model Number" value={dvr.serialModelNumber} onChange={(v) => onChange('serialModelNumber', v)} placeholder="Serial or model" />
          <Field label="DVR Username" value={dvr.dvrUsername} onChange={(v) => onChange('dvrUsername', v)} placeholder="e.g., admin" />
          <Field label="DVR Password" value={dvr.dvrPassword} onChange={(v) => onChange('dvrPassword', v)} placeholder="Login password" />
        </SectionCard>
        <SectionCard title="Recording Configuration">
          <Field label="Channels" value={dvr.numberOfChannels} onChange={(v) => onChange('numberOfChannels', v)} placeholder="e.g., 16" />
          <Field label="Active Cameras" value={dvr.activeCameras} onChange={(v) => onChange('activeCameras', v)} placeholder="e.g., 8" />
          <SelectField label="Resolution" value={dvr.resolution} onChange={(v) => onChange('resolution', v)} options={RES} />
          <SelectField label="Recording FPS" value={dvr.recordingFps} onChange={(v) => onChange('recordingFps', v)} options={FPS} />
          <Field label="Total DVR Retention" value={dvr.totalDvrRetention} onChange={(v) => onChange('totalDvrRetention', v)} placeholder="e.g., 30 days" />
        </SectionCard>
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
