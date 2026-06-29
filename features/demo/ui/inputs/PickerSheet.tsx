'use client'

import { useEffect } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { T } from '@/features/demo/ui/inputs/input-theme'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'

export interface PickerSheetProps {
  title: string
  onClose(): void
  children: ReactNode
  /** Sticky action row at the foot of the sheet (e.g. Cancel / Confirm or Done). */
  footer?: ReactNode
}

const dot: CSSProperties = { width: 6, height: 6, borderRadius: 3, background: T.primary }

/**
 * Bottom-anchored, auto-height sheet for the pickers (calendar, time wheel, dropdown). It
 * portals into the phone-screen overlay (outside the scroll container) so it always anchors
 * to the visible screen bottom regardless of scroll, and falls back to inline render when no
 * overlay is present (e.g. isolated tests). Scrim click, the ✕ button, and Escape all dismiss.
 */
export function PickerSheet({ title, onClose, children, footer }: PickerSheetProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  const content = (
    <>
      <div
        data-sheet-scrim
        onClick={onClose}
        style={{ position: 'absolute', inset: 0, zIndex: 31, background: T.scrim, pointerEvents: 'auto' }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 32,
          pointerEvents: 'auto',
          maxHeight: '92%',
          display: 'flex',
          flexDirection: 'column',
          background: T.raised,
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          border: `1px solid ${T.primaryEdge}`,
          borderTop: `2px solid ${T.topHighlight}`,
          boxShadow: '0 -16px 40px -8px rgba(0,0,0,0.6)',
          overflow: 'hidden',
          animation: 'sheetUp 0.28s ease',
        }}
      >
        {/* Header — gradient fill + straight solid divider (shared by all three pickers). */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            background: 'linear-gradient(180deg,rgba(25,48,72,0.8),rgba(15,32,53,0.4))',
            borderBottom: `1px solid ${T.border}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={dot} />
            <div
              style={{
                fontSize: 14,
                fontWeight: 700,
                letterSpacing: 0.3,
                textTransform: 'uppercase',
                color: T.textDim,
              }}
            >
              {title}
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            onClick={onClose}
            style={{ cursor: 'pointer', display: 'flex', background: 'transparent', border: 'none', padding: 0 }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ overflowY: 'auto', padding: 16 }}>{children}</div>

        {/* Footer (optional) */}
        {footer && <div style={{ padding: 16, borderTop: `1px solid ${T.border}` }}>{footer}</div>}
      </div>
    </>
  )

  return <PhoneOverlayPortal>{content}</PhoneOverlayPortal>
}
