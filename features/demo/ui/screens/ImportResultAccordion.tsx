'use client'

import type { CSSProperties } from 'react'
import { ImportResultBody } from '@/features/demo/ui/screens/ImportResultBody'
import type { ImportedLocationView } from '@/features/demo/ui/screens/importResultData'

export interface ImportResultAccordionProps {
  view: ImportedLocationView
  open: boolean
  onToggle(): void
  onOpenLocation(locId: string | null): void
}

const wrap: CSSProperties = {
  border: '1px solid rgba(43,140,193,0.2)',
  borderRadius: 12,
  background: 'rgba(13,27,42,0.5)',
  marginBottom: 10,
  overflow: 'hidden',
}

/** One location in a batch result: collapsed summary header + expandable detail + Open location. */
export function ImportResultAccordion({ view, open, onToggle, onOpenLocation }: ImportResultAccordionProps) {
  return (
    <div style={wrap}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left' }}
      >
        <span style={{ width: 9, height: 9, borderRadius: 5, background: '#10d177', flexShrink: 0, boxShadow: '0 0 6px rgba(16,209,119,0.6)' }} />
        <span style={{ flex: 1, minWidth: 0 }}>
          <span style={{ display: 'block', fontSize: 14, fontWeight: 600, color: '#f0f4f8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{view.title}</span>
          <span style={{ display: 'block', fontSize: 12, color: '#7fa8cc', fontFamily: "'JetBrains Mono',monospace" }}>{view.caseNumber}</span>
        </span>
        <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#7fa8cc" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div style={{ padding: '0 14px 14px' }}>
          <ImportResultBody view={view} />
          <button
            type="button"
            onClick={() => onOpenLocation(view.locId)}
            style={{ width: '100%', padding: 12, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 4 }}
          >
            Open location
          </button>
        </div>
      )}
    </div>
  )
}
