'use client'

import { useEffect } from 'react'

const mono = "'JetBrains Mono',monospace"

export interface ExitDialogProps {
  open: boolean
  /** The unlit manifest rows — what the visitor hasn't seen yet. */
  unseen: ReadonlyArray<{ number: string; label: string }>
  /** Where "Leave anyway" goes (the marketing site). */
  leaveHref: string
  onStay(): void
}

/**
 * The before-you-go dialog: opened by the rail's Back-to-site link when unlit manifest
 * rows remain. Lists what the visitor hasn't seen (same numbered-row language as the
 * checklist), with "Keep exploring" primary and "Leave anyway" as a plain link. Escape
 * and backdrop click both stay. Page-level overlay — NOT inside the phone. Presentational.
 */
export function ExitDialog({ open, unseen, leaveHref, onStay }: ExitDialogProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onStay()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onStay])

  if (!open) return null
  return (
    <div
      data-exit-backdrop
      onClick={onStay}
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(4,8,14,0.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Before you go"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 460, maxWidth: '100%', borderRadius: 16, border: '1px solid rgba(30,58,95,0.6)', background: '#0b1626', boxShadow: '0 40px 90px rgba(0,0,0,0.6)', padding: '26px 26px 22px' }}
      >
        <div style={{ fontFamily: mono, fontSize: 11, letterSpacing: 2, color: '#4ecdc4', textTransform: 'uppercase', marginBottom: 10 }}>
          Exploration manifest
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#f0f4f8', marginBottom: 8 }}>Before you go —</div>
        <div style={{ fontSize: 14, lineHeight: 1.55, color: '#bcccde', marginBottom: 16 }}>
          You haven&apos;t explored everything yet:
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 20, maxHeight: 264, overflowY: 'auto' }}>
          {unseen.map((u) => (
            <div
              key={u.number}
              style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(30,58,95,0.45)', background: 'rgba(10,20,34,0.5)' }}
            >
              <span style={{ fontFamily: mono, fontSize: 10, color: '#46607e' }}>{u.number}</span>
              <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, color: '#7a9fc4' }}>{u.label}</span>
              <span aria-hidden="true" style={{ width: 8, height: 8, borderRadius: 4, border: '1px solid #2a4a6f', flexShrink: 0 }} />
            </div>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'stretch' }}>
          {/* eslint-disable-next-line jsx-a11y/no-autofocus -- focus lands on the safe default action when the modal opens */}
          <button
            type="button"
            autoFocus
            onClick={onStay}
            style={{ flex: 1, padding: 13, borderRadius: 10, border: 'none', background: 'linear-gradient(180deg,#35A0D6,#2580AD)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
          >
            Keep exploring
          </button>
          <a
            href={leaveHref}
            style={{ display: 'flex', alignItems: 'center', padding: '0 18px', borderRadius: 10, border: '1px solid #2a4a6f', color: '#99badd', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}
          >
            Leave anyway
          </a>
        </div>
      </div>
    </div>
  )
}
