'use client'

import { useState } from 'react'
import type { CameraEntry } from '@/features/demo/engine/types'
import { AddRowButton, Field, SelectField, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { RESOLUTION_OPTIONS, FPS_OPTIONS, CUSTOM_VALUE } from '@/features/demo/ui/screens/field-options'

export interface CamerasScreenProps {
  cameras: CameraEntry[]
  onChange(index: number, patch: Partial<CameraEntry>): void
  onAdd(): void
  onRemove(index: number): void
  onNext(): void
  onBack(): void
  onMenu(): void
}

export function CamerasScreen({ cameras, onChange, onAdd, onRemove, onNext, onBack, onMenu }: CamerasScreenProps) {
  // Per-camera custom Resolution/FPS mode — mirrors the phone's cameras.tsx:36-61: maps
  // keyed by row index, and (unlike DVR Information) selecting the `custom` sentinel
  // immediately CLEARS that camera's stored value before the user types. This DVR-vs-Cameras
  // asymmetry is the phone's verified behavior (ui-mapping 07 fact-check), replicated as-is.
  const [customResolutions, setCustomResolutions] = useState<Record<number, boolean>>({})
  const [customFps, setCustomFps] = useState<Record<number, boolean>>({})

  const handleResolutionSelect = (index: number, value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomResolutions({ ...customResolutions, [index]: true })
      onChange(index, { resolution: '' })
    } else {
      setCustomResolutions({ ...customResolutions, [index]: false })
      onChange(index, { resolution: value })
    }
  }

  const handleFpsSelect = (index: number, value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomFps({ ...customFps, [index]: true })
      onChange(index, { recordingFps: '' })
    } else {
      setCustomFps({ ...customFps, [index]: false })
      onChange(index, { recordingFps: value })
    }
  }

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Cameras" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {cameras.length === 0 && <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic', textAlign: 'center', padding: '8px 0 14px' }}>No cameras yet — add the ones in the recovery.</div>}
        {cameras.map((c, i) => (
          <div key={c.id} style={{ borderRadius: 12, border: '1px solid rgba(30,58,95,0.5)', background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))', padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>Camera {i + 1}</div>
              <button type="button" onClick={() => onRemove(i)} style={{ cursor: 'pointer', color: '#ff7a85', fontSize: 13, background: 'transparent', border: 'none' }}>Remove</button>
            </div>
            <Field label="Camera Name / Location" value={c.cameraName} onChange={(v) => onChange(i, { cameraName: v })} placeholder="e.g., Rear entrance" />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SelectField label="Resolution" value={customResolutions[i] ? CUSTOM_VALUE : c.resolution} onChange={(v) => handleResolutionSelect(i, v)} options={RESOLUTION_OPTIONS} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SelectField label="FPS" value={customFps[i] ? CUSTOM_VALUE : c.recordingFps} onChange={(v) => handleFpsSelect(i, v)} options={FPS_OPTIONS} />
              </div>
            </div>
            {customResolutions[i] && (
              <Field label="Custom Resolution" value={c.resolution} onChange={(v) => onChange(i, { resolution: v })} placeholder="e.g., 1440x900" />
            )}
            {customFps[i] && (
              <Field label="Custom FPS" value={c.recordingFps} onChange={(v) => onChange(i, { recordingFps: v })} placeholder="e.g., 12" />
            )}
          </div>
        ))}
        <AddRowButton label="+ Add Camera" onClick={onAdd} />
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
