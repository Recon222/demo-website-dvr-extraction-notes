'use client'

import { useEffect } from 'react'
import type { ReactNode } from 'react'
import type { WizardScreenId } from '@/lib/demo/types'

export interface DrawerItem {
  id: WizardScreenId
  label: string
  icon?: ReactNode
  active: boolean
  status?: 'complete' | 'partial'
}

export interface WizardDrawerProps {
  open: boolean
  items: DrawerItem[]
  onClose(): void
  onNavigate(id: WizardScreenId): void
  onBackToCases(): void
}

/** The slide-in wizard navigation drawer (overlay + panel + screen list). Lifted from the
 *  prototype; the media accordion lands with the media screens in M4. */
export function WizardDrawer({ open, items, onClose, onNavigate, onBackToCases }: WizardDrawerProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  if (!open) return null
  return (
    <>
      <div data-drawer-backdrop onClick={onClose} style={{ position: 'absolute', inset: 0, zIndex: 41, background: 'rgba(4,8,14,0.55)' }} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: 0,
          zIndex: 42,
          width: 312,
          background: '#0b1626',
          boxShadow: '24px 0 60px rgba(0,0,0,0.5)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'screenIn 0.25s ease',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '54px 18px 14px',
            borderBottom: '1px solid #1e3a5f',
            background: 'linear-gradient(180deg,rgba(26,45,68,0.6),rgba(13,27,42,0.2))',
          }}
        >
          <div style={{ fontSize: 21, fontWeight: 700, color: '#f0f4f8' }}>Navigation</div>
          <button type="button" aria-label="Close" onClick={onClose} style={{ cursor: 'pointer', display: 'flex', padding: 2, background: 'transparent', border: 'none' }}>
            <svg width="27" height="27" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div style={{ padding: '12px 12px 14px', borderBottom: '1px solid #1e3a5f' }}>
          <button
            type="button"
            onClick={onBackToCases}
            style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 14px', borderRadius: 10, background: '#101f33', cursor: 'pointer', border: 'none', width: '100%' }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span style={{ fontSize: 15, fontWeight: 500, color: '#99badd' }}>Back to Cases</span>
          </button>
        </div>

        <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 0 14px' }}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onNavigate(it.id)}
              style={{
                position: 'relative',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                margin: '0 10px 8px',
                padding: '13px 15px',
                borderRadius: 10,
                border: '1px solid rgba(30,58,95,0.5)',
                background: 'linear-gradient(180deg,rgba(19,34,54,0.85),rgba(26,45,68,0.92))',
                cursor: 'pointer',
                width: 'calc(100% - 20px)',
                textAlign: 'left',
              }}
            >
              {it.active && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: '0 2px 2px 0', background: '#2B8CC1' }} />}
              <span style={{ fontSize: 15, fontWeight: 500, color: it.active ? '#f0f4f8' : '#cdd9e6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {it.label}
              </span>
              {it.status === 'complete' && <div style={{ flex: '0 0 auto', width: 11, height: 11, borderRadius: 6, background: '#10d177', boxShadow: '0 0 7px rgba(16,209,119,0.6)' }} />}
              {it.status === 'partial' && <div style={{ flex: '0 0 auto', width: 11, height: 11, borderRadius: 6, background: '#ffd93d', boxShadow: '0 0 7px rgba(255,217,61,0.55)' }} />}
            </button>
          ))}
        </div>

        <div style={{ padding: '14px 18px', borderTop: '1px solid #1e3a5f', textAlign: 'center', background: 'linear-gradient(0deg,rgba(26,45,68,0.6),rgba(13,27,42,0.2))' }}>
          <div style={{ fontSize: 13, fontWeight: 500, color: '#5d7a9a' }}>DVR Extraction Notes</div>
          <div style={{ fontSize: 11, color: '#46607e', marginTop: 3 }}>v1.0.0</div>
        </div>
      </div>
    </>
  )
}
