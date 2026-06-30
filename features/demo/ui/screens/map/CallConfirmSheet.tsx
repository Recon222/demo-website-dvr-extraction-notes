'use client'

import type { CSSProperties } from 'react'

export interface CallConfirmSheetProps {
  number: string
  onConfirm(): void
  onCancel(): void
}

const scrim: CSSProperties = {
  position: 'absolute',
  inset: 0,
  zIndex: 48,
  background: 'rgba(4,8,14,0.55)',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'flex-end',
  padding: 12,
  gap: 8,
}
const sheet: CSSProperties = {
  background: 'rgba(28,32,40,0.96)',
  borderRadius: 14,
  overflow: 'hidden',
  textAlign: 'center',
}
const msg: CSSProperties = { padding: '16px 18px 14px', color: '#cdd9e6', fontSize: 13, borderBottom: '1px solid rgba(255,255,255,0.12)' }
const callBtn: CSSProperties = { width: '100%', padding: '15px 0', background: 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.12)', color: '#34c759', fontSize: 18, fontWeight: 600, cursor: 'pointer' }
const cancelSheet: CSSProperties = { background: 'rgba(28,32,40,0.96)', borderRadius: 14 }
const cancelBtn: CSSProperties = { width: '100%', padding: '15px 0', background: 'transparent', border: 'none', color: '#4ba3d4', fontSize: 18, fontWeight: 700, cursor: 'pointer' }

/** iOS-style call-confirm action sheet (mock — calling is unavailable in the demo). Call only. */
export function CallConfirmSheet({ number, onConfirm, onCancel }: CallConfirmSheetProps) {
  return (
    <div data-testid="call-confirm-scrim" style={scrim} onClick={onCancel}>
      <div style={sheet} onClick={(e) => e.stopPropagation()}>
        <div style={msg}>Call {number}?</div>
        <button type="button" onClick={onConfirm} style={callBtn}>
          Call
        </button>
      </div>
      <div style={cancelSheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" onClick={onCancel} style={cancelBtn}>
          Cancel
        </button>
      </div>
    </div>
  )
}
