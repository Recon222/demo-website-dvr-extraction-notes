'use client'

import { useContext } from 'react'
import { createPortal } from 'react-dom'
import { PhoneOverlayContext } from '@/features/demo/ui/phone-overlay'

export interface PdfPreviewProps {
  title: string
  /** The real generated court-document HTML (generateCaseNotesDoc / generateTimeOffsetDoc). */
  html: string
  onClose(): void
  onSave(): void
}

/** Renders the real generated PDF HTML into an iframe preview (the demo's "export"). */
export function PdfPreview({ title, html, onClose, onSave }: PdfPreviewProps) {
  // Pin to the phone viewport via the overlay root (outside the screen scroller); see ModalShell.
  const overlay = useContext(PhoneOverlayContext)
  const content = (
    <div style={{ position: 'absolute', inset: 0, zIndex: 43, background: '#11151c', display: 'flex', flexDirection: 'column', animation: 'screenIn 0.3s ease', pointerEvents: 'auto' }}>
      <div style={{ padding: '50px 16px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #2a3340' }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#f0f4f8' }}>{title}</div>
        <button type="button" aria-label="Close preview" onClick={onClose} style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none' }}>
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>
      <div style={{ flex: 1, overflow: 'hidden', padding: 14, background: '#3a3f47' }}>
        {/* sandbox="" = maximally restrictive (no scripts/forms/popups); the generated PDF HTML is
            static and the Save button is a stub, so no iframe capability is needed. */}
        <iframe title={title} srcDoc={html} sandbox="" style={{ width: '100%', height: '100%', border: 'none', borderRadius: 3, background: '#fff', boxShadow: '0 8px 30px rgba(0,0,0,0.5)' }} />
      </div>
      <div style={{ padding: '14px 18px 24px', borderTop: '1px solid #2a3340', display: 'flex', gap: 10 }}>
        <button type="button" onClick={onClose} style={{ padding: '14px 20px', borderRadius: 10, border: '1px solid #2a4a6f', background: '#132236', color: '#99badd', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Close</button>
        <button type="button" onClick={onSave} style={{ flex: 1, textAlign: 'center', padding: 14, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }}>Save as PDF</button>
      </div>
    </div>
  )
  return overlay ? createPortal(content, overlay) : content
}
