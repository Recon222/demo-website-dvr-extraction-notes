'use client'

import { useState } from 'react'
import type { DvrInformation, FormFieldId } from '@/features/demo/engine/types'
import { getRetentionStatus, type RetentionStatus, type RetentionView } from '@/features/demo/engine/logic/retention'
import { Field, SectionCard, SelectField, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import {
  RESOLUTION_OPTIONS,
  FPS_OPTIONS,
  RECORDING_SCHEDULE_OPTIONS,
  CUSTOM_VALUE,
  isCustomResolution,
  isCustomFps,
  parseRecordingSchedule,
  toggleRecordingSchedule,
} from '@/features/demo/ui/screens/field-options'
import { DateField } from '@/features/demo/ui/inputs/DateField'
import { GLASS } from '@/features/demo/ui/glass-tokens'

const danger = { color: '#ff7a85', bg: 'rgba(255,71,87,0.14)', border: 'rgba(255,71,87,0.35)' }
const STATUS: Record<RetentionStatus, { label: string; color: string; bg: string; border: string }> = {
  SAFE: { label: 'Safe', color: '#10d177', bg: 'rgba(16,209,119,0.12)', border: 'rgba(16,209,119,0.3)' },
  WARNING: { label: 'Warning', color: '#ffd93d', bg: 'rgba(255,217,61,0.12)', border: 'rgba(255,217,61,0.3)' },
  CRITICAL: { label: 'Critical', ...danger },
  OVERWRITTEN: { label: 'Overwritten', ...danger },
}

export interface DvrInfoScreenProps {
  dvr: DvrInformation
  /** Derived retention view (total window + per-scope countdown), computed by the bridge. */
  retention: RetentionView
  onChange(field: keyof DvrInformation, value: string): void
  /** Which of this screen's fields the visitor's form profile keeps (P7.3). */
  isFieldVisible(id: FormFieldId): boolean
  onNext(): void
  onBack(): void
  onMenu(): void
}

export function DvrInfoScreen({ dvr, retention, onChange, isFieldVisible, onNext, onBack, onMenu }: DvrInfoScreenProps) {
  // Custom Resolution/FPS mode — mirrors the phone's dvr-information.tsx:69-74,124-142:
  // local state seeded from the stored value (a saved free-text value reopens in custom
  // mode); selecting the `custom` sentinel reveals the free-text input and leaves the
  // stored value untouched; selecting a standard value clears the flag and writes through.
  const [customResolution, setCustomResolution] = useState(isCustomResolution(dvr.resolution))
  const [customFps, setCustomFps] = useState(isCustomFps(dvr.recordingFps))

  const handleResolutionSelect = (value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomResolution(true)
    } else {
      setCustomResolution(false)
      onChange('resolution', value)
    }
  }

  const handleFpsSelect = (value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomFps(true)
    } else {
      setCustomFps(false)
      onChange('recordingFps', value)
    }
  }

  // Three section cards, each hidden once it has nothing left to hold — a titled card with an
  // empty body reads as a bug. The store's cascade hides the whole SCREEN when the last field
  // anywhere on it goes off, so an all-empty render is unreachable.
  const show = {
    dvrLocation: isFieldVisible('dvr.dvrLocation'),
    dvrTypeBrand: isFieldVisible('dvr.dvrTypeBrand'),
    serialModelNumber: isFieldVisible('dvr.serialModelNumber'),
    dvrUsername: isFieldVisible('dvr.dvrUsername'),
    dvrPassword: isFieldVisible('dvr.dvrPassword'),
    numberOfChannels: isFieldVisible('dvr.numberOfChannels'),
    activeCameras: isFieldVisible('dvr.activeCameras'),
    resolution: isFieldVisible('dvr.resolution'),
    recordingFps: isFieldVisible('dvr.recordingFps'),
    recordingSchedule: isFieldVisible('dvr.recordingSchedule'),
    firstRecordedDate: isFieldVisible('dvr.firstRecordedDate'),
    totalDvrRetention: isFieldVisible('dvr.totalDvrRetention'),
    daysUntilOverwritten: isFieldVisible('dvr.daysUntilOverwritten'),
  }
  const showBasics = show.dvrLocation || show.dvrTypeBrand || show.serialModelNumber || show.dvrUsername || show.dvrPassword
  const showRecording = show.numberOfChannels || show.activeCameras || show.resolution || show.recordingFps || show.recordingSchedule
  const showRetention = show.firstRecordedDate || show.totalDvrRetention || show.daysUntilOverwritten

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="DVR Information" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {showBasics && (
        <SectionCard title="Basic DVR Details">
          {show.dvrLocation && <Field label="DVR Location" value={dvr.dvrLocation} onChange={(v) => onChange('dvrLocation', v)} placeholder="e.g., Manager's office" />}
          {show.dvrTypeBrand && <Field label="DVR Type / Brand" value={dvr.dvrTypeBrand} onChange={(v) => onChange('dvrTypeBrand', v)} placeholder="e.g., Hikvision, Dahua" />}
          {show.serialModelNumber && <Field label="Serial / Model Number" value={dvr.serialModelNumber} onChange={(v) => onChange('serialModelNumber', v)} placeholder="Serial or model" />}
          {show.dvrUsername && <Field label="DVR Username" value={dvr.dvrUsername} onChange={(v) => onChange('dvrUsername', v)} placeholder="e.g., admin" />}
          {show.dvrPassword && <Field label="DVR Password" value={dvr.dvrPassword} onChange={(v) => onChange('dvrPassword', v)} placeholder="Login password" />}
        </SectionCard>
        )}

        {showRecording && (
        <SectionCard title="Recording Configuration">
          {show.numberOfChannels && <Field label="Channels" value={dvr.numberOfChannels} onChange={(v) => onChange('numberOfChannels', v)} placeholder="e.g., 16" />}
          {show.activeCameras && <Field label="Active Cameras" value={dvr.activeCameras} onChange={(v) => onChange('activeCameras', v)} placeholder="e.g., 8" />}
          {show.resolution && (
            <>
              <SelectField label="Resolution" value={customResolution ? CUSTOM_VALUE : dvr.resolution} onChange={handleResolutionSelect} options={RESOLUTION_OPTIONS} />
              {customResolution && (
                <Field label="Custom Resolution" value={dvr.resolution} onChange={(v) => onChange('resolution', v)} placeholder="e.g., 1440x900" />
              )}
            </>
          )}
          {show.recordingFps && (
            <>
              <SelectField label="Recording FPS" value={customFps ? CUSTOM_VALUE : dvr.recordingFps} onChange={handleFpsSelect} options={FPS_OPTIONS} />
              {customFps && (
                <Field label="Custom FPS" value={dvr.recordingFps} onChange={(v) => onChange('recordingFps', v)} placeholder="e.g., 12" />
              )}
            </>
          )}
          {show.recordingSchedule && (
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>Recording Schedule</div>
            <div style={{ display: 'flex', gap: 10 }}>
              {RECORDING_SCHEDULE_OPTIONS.map((opt) => {
                const on = parseRecordingSchedule(dvr.recordingSchedule).includes(opt.toLowerCase())
                return (
                  <button
                    key={opt}
                    type="button"
                    role="checkbox"
                    aria-checked={on}
                    aria-label={opt}
                    onClick={() => onChange('recordingSchedule', toggleRecordingSchedule(dvr.recordingSchedule, opt))}
                    style={{
                      flex: 1,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      padding: '11px 12px',
                      borderRadius: 8,
                      border: `1px solid ${on ? '#2B8CC1' : '#1e3a5f'}`,
                      background: on ? 'rgba(43,140,193,0.14)' : '#0d1b2a',
                      color: on ? '#f0f4f8' : '#cdd9e6',
                      fontSize: 14,
                      fontWeight: 500,
                      cursor: 'pointer',
                      textAlign: 'left',
                    }}
                  >
                    <span style={{ width: 16, height: 16, borderRadius: 4, border: `1px solid ${on ? '#2B8CC1' : '#3a567a'}`, background: on ? '#2B8CC1' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      {on && <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>}
                    </span>
                    {opt}
                  </button>
                )
              })}
            </div>
          </div>
          )}
        </SectionCard>
        )}

        {showRetention && (
        <SectionCard title="Retention">
          {show.firstRecordedDate && (
            <>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#cdd9e6', marginBottom: 6 }}>First Recorded Date</div>
              <div style={{ marginBottom: 14 }}>
                <DateField value={dvr.firstRecordedDate} onChange={(v) => onChange('firstRecordedDate', v)} />
              </div>
            </>
          )}

          {retention.totalRetention != null ? (
            <>
              {show.totalDvrRetention && (
              <div style={{ marginBottom: 14, borderRadius: 10, border: GLASS.borderAccent, background: 'rgba(43,140,193,0.08)', padding: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', color: '#7a9fc4', letterSpacing: 0.3 }}>Total DVR Retention</div>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#f0f4f8', marginTop: 2, fontVariantNumeric: 'tabular-nums' }}>{retention.totalRetention} days</div>
                <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 2 }}>From the earliest recorded date to today.</div>
              </div>
              )}

              {show.daysUntilOverwritten && retention.scopes.length > 0 && (
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#cdd9e6', marginBottom: 8 }}>Retention status by scope</div>
                  {retention.scopes.map((s) => {
                    const st = STATUS[getRetentionStatus(s.daysUntilOverwritten)]
                    return (
                      <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, padding: '10px 12px', borderRadius: 10, border: GLASS.borderSoft, background: 'rgba(13,27,42,0.6)', marginBottom: 8 }}>
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
            // R-8: the placeholder names a control, so it may only appear while that control is
            // on the screen. With First Recorded Date switched off in the Form Fields grid and
            // either retention output left on, this card's whole body used to be an instruction
            // to use a picker three clicks away in Settings.
            <div style={{ fontSize: 12, color: '#7a9fc4', fontStyle: 'italic', padding: '4px 2px' }} data-testid="dvr-retention-empty">
              {show.firstRecordedDate
                ? 'Pick the first recorded date to calculate total retention and per-scope overwrite countdowns.'
                : 'Turn First Recorded Date back on in Settings → Form Fields to calculate retention.'}
            </div>
          )}
        </SectionCard>
        )}

        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
