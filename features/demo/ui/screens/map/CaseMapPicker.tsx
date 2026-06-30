'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'

export interface CaseMapPickerCase {
  id: string
  caseNumber: string
  displayName: string
  locationCountLabel: string
  status: 'draft' | 'complete' | 'archived'
}

export interface CaseMapPickerProps {
  cases: CaseMapPickerCase[]
  /** Mandatory (false) when no case is being viewed yet — no Cancel; the user leaves via the tab bar. */
  dismissible: boolean
  /** The currently-viewed case, highlighted as a courtesy. Pick is always explicit. */
  preselectedId?: string | null
  onPick(caseId: string): void
  onClose(): void
}

// The full-screen panel sits above the phone's tab bar so the tab bar stays the escape hatch for the
// mandatory picker (matching the phone's "leave via the tab bar" behaviour).
const TAB_BAR_H = 52

const accent = '#4ba3d4'

const header: CSSProperties = {
  padding: '54px 18px 14px',
  borderBottom: '1px solid #1e3a5f',
  background: 'linear-gradient(180deg,#13243a,#0e1d30)',
}
const title: CSSProperties = { fontSize: 22, fontWeight: 700, color: '#e7eef6' }
const subtitle: CSSProperties = { fontSize: 13, color: '#9fb6d0', marginTop: 4 }
const scroll: CSSProperties = { flex: 1, overflowY: 'auto', padding: 16 }
const baseRow: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
  width: '100%',
  textAlign: 'left',
  padding: '14px 16px',
  marginBottom: 10,
  borderRadius: 10,
  border: '1px solid #1e3a5f',
  background: 'rgba(19,34,54,0.6)',
  cursor: 'pointer',
}
const allCasesRow: CSSProperties = { ...baseRow, opacity: 0.5, cursor: 'default', marginBottom: 18 }
const rowTitle: CSSProperties = { fontSize: 15, fontWeight: 600, color: '#e7eef6' }
const rowSub: CSSProperties = { fontSize: 13, color: '#9fb6d0', marginTop: 2 }
const rowMeta: CSSProperties = { fontSize: 11, color: '#7a9fc4', marginTop: 4 }
const footer: CSSProperties = { padding: 16, borderTop: '1px solid #1e3a5f' }
const cancelBtn: CSSProperties = {
  width: '100%',
  padding: '13px 0',
  borderRadius: 12,
  border: '1px solid #2a4a6f',
  background: 'rgba(19,34,54,0.85)',
  color: '#cdd9e6',
  fontSize: 15,
  fontWeight: 600,
  cursor: 'pointer',
}

/** Dot for cases that are done (complete/archived); draft cases stay quiet — mirrors the phone. */
function statusColor(status: CaseMapPickerCase['status']): string | null {
  if (status === 'complete') return '#10d177'
  if (status === 'archived') return '#7a9fc4'
  return null
}

/**
 * Map case picker — a **full-screen** page that slides up, matching the phone's `CaseSelectionSheet`
 * (a `pageSheet` modal, not a bottom sheet). Picks the tab-local viewer case; never the form's case.
 * Mandatory (no Cancel) when no case is viewed; dismissible "Change Case" overlay otherwise.
 */
export function CaseMapPicker({ cases, dismissible, preselectedId = null, onPick, onClose }: CaseMapPickerProps) {
  const [entered, setEntered] = useState(false)
  useEffect(() => setEntered(true), [])

  const container: CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: TAB_BAR_H,
    zIndex: 30,
    background: '#0a1422',
    display: 'flex',
    flexDirection: 'column',
    transform: entered ? 'translateY(0)' : 'translateY(100%)',
    transition: 'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
  }

  return (
    <div data-testid="case-map-picker" style={container}>
      <div style={header}>
        <div style={title}>Pick a Case</div>
        <div style={subtitle}>Select which case you&apos;d like to view on the map.</div>
      </div>

      <div style={scroll}>
        {/* All Cases — disabled placeholder for the future aggregate view (parity with the phone). */}
        <div style={allCasesRow} aria-disabled="true">
          <div style={{ flex: 1 }}>
            <div style={{ ...rowTitle, color: '#9fb6d0' }}>All Cases</div>
            <div style={rowMeta}>Coming soon — view all your cases on one map</div>
          </div>
        </div>

        {cases.length === 0 ? (
          <div style={{ padding: '28px 16px', textAlign: 'center', color: '#9fb6d0' }}>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#e7eef6', marginBottom: 6 }}>No cases yet</div>
            <div style={{ fontSize: 13 }}>Create a case from the Cases tab to get started.</div>
          </div>
        ) : (
          cases.map((c) => {
            const selected = c.id === preselectedId
            const dot = statusColor(c.status)
            return (
              <button
                key={c.id}
                type="button"
                data-testid={`case-row-${c.id}`}
                data-selected={selected}
                onClick={() => onPick(c.id)}
                style={{
                  ...baseRow,
                  borderColor: selected ? accent : '#1e3a5f',
                  borderLeft: selected ? `4px solid ${accent}` : '1px solid #1e3a5f',
                }}
              >
                {dot && <span style={{ width: 10, height: 10, borderRadius: 5, background: dot, flex: '0 0 auto' }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ ...rowTitle, color: selected ? accent : '#e7eef6' }}>{c.caseNumber}</div>
                  {c.displayName && <div style={rowSub}>{c.displayName}</div>}
                  <div style={rowMeta}>{c.locationCountLabel}</div>
                </div>
              </button>
            )
          })
        )}
      </div>

      {dismissible && (
        <div style={footer}>
          <button type="button" onClick={onClose} style={cancelBtn}>
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
