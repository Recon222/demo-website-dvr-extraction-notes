'use client'

import type { DvrInformation } from '@/features/demo/engine/types'
import type { RetentionStatus, RetentionView } from '@/features/demo/engine/logic/retention'
import { Field, SectionCard, SelectField, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { RESOLUTION_OPTIONS, FPS_OPTIONS } from '@/features/demo/ui/screens/field-options'
import { DateField } from '@/features/demo/ui/inputs/DateField'

const STATUS: Record<RetentionStatus, { label: string; color: string; bg: string; border: string }> = {
  SAFE: { label: 'Safe', color: '#10d177', bg: 'rgba(16,209,119,0.12)', border: 'rgba(16,209,119,0.3)' },
  WARNING: { label: 'Warning', color: '#ffd93d', bg: 'rgba(255,217,61,0.12)', border: 'rgba(255,217,61,0.3)' },
  CRITICAL: { label: 'Critical', color: '#ff7a85', bg: 'rgba(255,71,87,0.14)', border: 'rgba(255,71,87,0.35)' },
  OVERWRITTEN: { label: 'Overwritten', color: '#ff7a85', bg: 'rgba(255,71,87,0.14)', border: 'rgba(255,71,87,0.35)' },
}

export interface DvrInfoScreenProps {
  dvr: DvrInformation
  /** Derived retention view (total window + per-scope countdown), computed by the bridge. */
  retention: RetentionView
  onChange(field: keyof DvrInformation, value: string): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

export function DvrInfoScreen({ dvr, retention, onChange, onNext, onBack, onMenu }: DvrInfoScreenProps) {
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
          <SelectField label="Resolution" value={dvr.resolution} onChange={(v) => onChange('resolution', v)} options={RESOLUTION_OPTIONS} />
          <SelectField label="Recording FPS" value={dvr.recordingFps} onChange={(v) => onChange('recordingFps', v)} options={FPS_OPTIONS} />
        </SectionCard>

        <SectionCard title="Retention">
          <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>First Recorded Date</div>
          <div style={{ marginBottom: 14 }}>
            <DateField value={dvr.firstRecordedDate} onChange={(v) => onChange('firstRecordedDate', v)} />
          </div>

          {retention.totalRetention != null ? (
            <>
              <div style={{ marginBottom: 14, borderRadius: 10, border: '1px solid rgba(43,140,193,0.3)', background: 'rgba(43,140,193,0.08)', padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#7a9fc4', letterSpacing: 0.3 }}>Total DVR Retention</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f4f8', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{retention.totalRetention} days</div>
                <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 2 }}>From the earliest recorded date to today.</div>
              </div>

              {retention.scopes.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#cdd9e6', marginBottom: 8 }}>Retention status by scope</div>
                  {retention.scopes.map((s) => {
                    const st = STATUS[s.status]
                    return (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(30,58,95,0.5)', background: 'rgba(13,27,42,0.6)', marginBottom: 8 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: '#f0f4f8' }}>{s.label}</div>
                          <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 2 }}>
                            {s.daysUntilOverwritten === 0 ? 'Already overwritten' : `${s.daysUntilOverwritten} days until overwritten · ${s.overwrittenDate}`}
                          </div>
                        </div>
                        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: st.color, background: st.bg, border: `1px solid ${st.border}`, borderRadius: 6, padding: '3px 8px', whiteSpace: 'nowrap' }}>{st.label}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </>
          ) : (
            <div style={{ fontSize: 12, color: '#7a9fc4', fontStyle: 'italic', padding: '4px 2px' }}>
              Pick the first recorded date to calculate total retention and per-scope overwrite countdowns.
            </div>
          )}
        </SectionCard>

        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
