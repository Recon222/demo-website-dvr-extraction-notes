'use client'

import { useState } from 'react'
import type { CameraEntry } from '@/features/demo/engine/types'
import { AddRowButton, Field, SelectField, WizardHeader, WizardNext } from '@/features/demo/ui/screens/_shared'
import { RESOLUTION_OPTIONS, FPS_OPTIONS, CUSTOM_VALUE, isCustomResolution, isCustomFps } from '@/features/demo/ui/screens/field-options'
import { glassCard } from '@/features/demo/ui/glass-tokens'

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
  // Per-camera custom Resolution/FPS mode — the phone's cameras.tsx:43-61 behavior with two
  // deliberate divergences (review R-2): the maps are keyed by the stable CameraEntry.id, not
  // the row index (the phone's index keying silently reassigns custom mode between rows when a
  // removal re-indexes the id-keyed list — a latent phone bug, not a surface behavior; filed
  // for back-port per parity plan §8), and they seed from the stored values the way
  // DvrInfoScreen does, so a saved free-text value reopens editable after remount/refresh.
  // Kept from the phone: selecting the `custom` sentinel immediately CLEARS that camera's
  // stored value before the user types (the DVR-vs-Cameras asymmetry verified by the
  // ui-mapping 07 fact-check).
  const [customResolutions, setCustomResolutions] = useState<Record<string, boolean>>(
    () => Object.fromEntries(cameras.map((c) => [c.id, isCustomResolution(c.resolution)])),
  )
  const [customFps, setCustomFps] = useState<Record<string, boolean>>(
    () => Object.fromEntries(cameras.map((c) => [c.id, isCustomFps(c.recordingFps)])),
  )

  const handleResolutionSelect = (id: string, index: number, value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomResolutions((prev) => ({ ...prev, [id]: true }))
      onChange(index, { resolution: '' })
    } else {
      setCustomResolutions((prev) => ({ ...prev, [id]: false }))
      onChange(index, { resolution: value })
    }
  }

  const handleFpsSelect = (id: string, index: number, value: string) => {
    if (value === CUSTOM_VALUE) {
      setCustomFps((prev) => ({ ...prev, [id]: true }))
      onChange(index, { recordingFps: '' })
    } else {
      setCustomFps((prev) => ({ ...prev, [id]: false }))
      onChange(index, { recordingFps: value })
    }
  }

  return (
    <div style={{ minHeight: 786, paddingBottom: 40 }}>
      <WizardHeader title="Cameras" onBack={onBack} onMenu={onMenu} />
      <div style={{ padding: 16 }}>
        {cameras.length === 0 && <div style={{ fontSize: 13, color: '#7a9fc4', fontStyle: 'italic', textAlign: 'center', padding: '8px 0 14px' }}>No cameras yet — add the ones in the recovery.</div>}
        {cameras.map((c, i) => (
          <div key={c.id} style={{ ...glassCard, padding: 16, marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#f0f4f8' }}>Camera {i + 1}</div>
              <button type="button" onClick={() => onRemove(i)} style={{ cursor: 'pointer', color: '#ff7a85', fontSize: 13, background: 'transparent', border: 'none' }}>Remove</button>
            </div>
            <Field label="Camera Name / Location" value={c.cameraName} onChange={(v) => onChange(i, { cameraName: v })} placeholder="e.g., Rear entrance" />
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SelectField label="Resolution" value={customResolutions[c.id] ? CUSTOM_VALUE : c.resolution} onChange={(v) => handleResolutionSelect(c.id, i, v)} options={RESOLUTION_OPTIONS} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SelectField label="FPS" value={customFps[c.id] ? CUSTOM_VALUE : c.recordingFps} onChange={(v) => handleFpsSelect(c.id, i, v)} options={FPS_OPTIONS} />
              </div>
            </div>
            {customResolutions[c.id] && (
              <Field label="Custom Resolution" value={c.resolution} onChange={(v) => onChange(i, { resolution: v })} placeholder="e.g., 1440x900" />
            )}
            {customFps[c.id] && (
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
