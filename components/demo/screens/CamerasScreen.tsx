'use client'

import type { CameraEntry } from '@/lib/demo/types'
import { AddRowButton, Field, WizardHeader, WizardNext } from '@/components/demo/screens/_shared'

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
              <div style={{ flex: 1 }}>
                <Field label="Resolution" value={c.resolution} onChange={(v) => onChange(i, { resolution: v })} placeholder="1080p" />
              </div>
              <div style={{ flex: 1 }}>
                <Field label="FPS" value={c.recordingFps} onChange={(v) => onChange(i, { recordingFps: v })} placeholder="15" />
              </div>
            </div>
          </div>
        ))}
        <AddRowButton label="+ Add Camera" onClick={onAdd} />
        <WizardNext label="Continue →" onClick={onNext} />
      </div>
    </div>
  )
}
