'use client'

import type { CSSProperties } from 'react'

export interface CaseMapPickerCase {
  id: string
  caseNumber: string
  displayName: string
  locationCountLabel: string
}

export interface CaseMapPickerProps {
  cases: CaseMapPickerCase[]
  /** Mandatory (false) when no case is being viewed yet — no close affordance, scrim won't dismiss. */
  dismissible: boolean
  onPick(caseId: string): void
  onClose(): void
}

const scrim: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 45,
  background: 'rgba(4,8,14,0.6)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
}
const sheet: CSSProperties = {
  background: 'linear-gradient(180deg,#11233a,#0c1a2c)',
  borderTopLeftRadius: 20,
  borderTopRightRadius: 20,
  borderTop: '1px solid #28456b',
  maxHeight: '78%',
  display: 'flex',
  flexDirection: 'column',
  boxShadow: '0 -10px 30px rgba(0,0,0,0.5)',
}
const headerRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 18px 10px',
  borderBottom: '1px solid #1e3a5f',
}
const rowBtn: CSSProperties = {
  display: 'block',
  width: '100%',
  textAlign: 'left',
  padding: '13px 18px',
  background: 'transparent',
  border: 'none',
  borderBottom: '1px solid rgba(30,58,95,0.4)',
  cursor: 'pointer',
}

/**
 * Map case picker — the demo's analog of the phone's `CaseSelectionSheet`. Sets the **tab-local**
 * viewer case (never the form's current case). Mandatory (no dismiss) when no case is viewed yet;
 * a dismissible overlay when invoked via "Change Case". Pure presentational.
 */
export function CaseMapPicker({ cases, dismissible, onPick, onClose }: CaseMapPickerProps) {
  return (
    <div
      data-testid="case-picker-scrim"
      style={scrim}
      onClick={dismissible ? onClose : undefined}
    >
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={headerRow}>
          <div style={{ fontSize: 16, fontWeight: 700, color: '#e7eef6' }}>Select a case</div>
          {dismissible && (
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              style={{ background: 'transparent', border: 'none', color: '#9fb6d0', fontSize: 22, lineHeight: 1, cursor: 'pointer', padding: 4 }}
            >
              {'×'}
            </button>
          )}
        </div>
        <div style={{ overflowY: 'auto' }}>
          {cases.length === 0 ? (
            <div style={{ padding: 22, textAlign: 'center', color: '#7a9fc4', fontSize: 13 }}>
              No cases yet — create one first.
            </div>
          ) : (
            cases.map((c) => (
              <button key={c.id} type="button" onClick={() => onPick(c.id)} style={rowBtn}>
                <div style={{ fontWeight: 700, color: '#e7eef6', fontSize: 15 }}>
                  {c.displayName || c.caseNumber}
                </div>
                <div style={{ fontSize: 12, color: '#7a9fc4', marginTop: 2 }}>
                  <span>{c.caseNumber}</span> {'·'} {c.locationCountLabel}
                </div>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
