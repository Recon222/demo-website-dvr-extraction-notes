'use client'

import { useEffect } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
import type { CSSProperties, ReactNode } from 'react'
import type { WizardScreenId } from '@/features/demo/engine/types'
import { PhoneOverlayPortal } from '@/features/demo/ui/phone-overlay'
import { drawerTransition, DRAWER_W } from '@/features/demo/ui/motion'

export interface DrawerItem {
  id: WizardScreenId
  label: string
  icon?: ReactNode
  active: boolean
}

export interface WizardDrawerProps {
  open: boolean
  items: DrawerItem[]
  onClose(): void
  onNavigate(id: WizardScreenId): void
  onBackToCases(): void
}

const itemButton: CSSProperties = {
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
}

/** The wizard navigation drawer — right-anchored, slides in from the right (the screen behind is
 *  pushed left by ScreenStage) with a backdrop fade; reverses on close via AnimatePresence. The
 *  backdrop and panel are separate stably-keyed children so rapid open/close can't strand one. */
export function WizardDrawer({ open, items, onClose, onNavigate, onBackToCases }: WizardDrawerProps) {
  const reduce = useReducedMotion()
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])
  const fade = reduce ? { duration: 0 } : drawerTransition
  return (
    <PhoneOverlayPortal>
      <AnimatePresence>
        {open && (
          <motion.div
            key="drawer-backdrop"
            data-drawer-backdrop
            onClick={onClose}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={fade}
            style={{ position: 'absolute', inset: 0, zIndex: 41, background: 'rgba(4,8,14,0.55)', pointerEvents: 'auto' }}
          />
        )}
        {open && (
          <motion.div
            key="drawer-panel"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            initial={reduce ? false : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={fade}
            style={{
              position: 'absolute',
              top: 0,
              bottom: 0,
              right: 0,
              zIndex: 42,
              width: DRAWER_W,
              background: '#0b1626',
              boxShadow: '-24px 0 60px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              pointerEvents: 'auto',
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

            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '10px 0 14px' }}>
              {items.map((it) => (
                <button key={it.id} type="button" onClick={() => onNavigate(it.id)} style={itemButton}>
                  {it.active && <div style={{ position: 'absolute', left: 0, top: 8, bottom: 8, width: 4, borderRadius: '0 2px 2px 0', background: '#2B8CC1' }} />}
                  <span style={{ fontSize: 15, fontWeight: 500, color: it.active ? '#f0f4f8' : '#cdd9e6', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {it.label}
                  </span>
                </button>
              ))}
            </div>

            <div style={{ padding: '14px 18px', borderTop: '1px solid #1e3a5f', textAlign: 'center', background: 'linear-gradient(0deg,rgba(26,45,68,0.6),rgba(13,27,42,0.2))' }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#5d7a9a' }}>DVR Extraction Notes</div>
              <div style={{ fontSize: 11, color: '#46607e', marginTop: 3 }}>v1.0.0</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </PhoneOverlayPortal>
  )
}
