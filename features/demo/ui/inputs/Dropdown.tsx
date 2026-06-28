'use client'

import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import { T } from '@/features/demo/ui/inputs/input-theme'

export interface DropdownProps {
  label?: string
  value: string
  onChange(value: string): void
  /** Option list. The demo passes `string[]` (label === value). */
  options: string[]
  placeholder?: string
  required?: boolean
}

/**
 * Custom dropdown matching the phone app's `Picker`: a selector pill with a chevron in a
 * right "indicator zone", opening a centered glass modal list (accent-dot header, options
 * with a glowing dot + checkmark on the selected row). Replaces the native `<select>`.
 * Presentational — value in, onChange out.
 */
export function Dropdown({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select an option',
  required = false,
}: DropdownProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  const select = (v: string) => {
    onChange(v)
    setOpen(false)
  }

  const optionRow = (o: string): CSSProperties => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    padding: '11px 12px',
    borderRadius: 10,
    border: '1px solid transparent',
    background: o === value ? 'rgba(43,140,193,0.08)' : 'transparent',
    cursor: 'pointer',
    marginBottom: 2,
  })

  return (
    <div style={{ marginBottom: 14 }}>
      {label && (
        <div style={{ fontSize: 13, fontWeight: 500, color: T.textDim, marginBottom: 6 }}>
          {label}
          {required && <span style={{ color: T.error }}> *</span>}
        </div>
      )}

      {/* Selector */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={label || placeholder}
        aria-haspopup="listbox"
        style={{
          display: 'flex',
          alignItems: 'stretch',
          width: '100%',
          minHeight: 44,
          borderRadius: 8,
          border: `1px solid ${T.border}`,
          background: T.bg,
          overflow: 'hidden',
          cursor: 'pointer',
          padding: 0,
        }}
      >
        <span
          style={{
            flex: 1,
            textAlign: 'left',
            padding: '11px 12px',
            fontSize: 14,
            color: value ? T.text : T.textFaint,
          }}
        >
          {value || placeholder}
        </span>
        <span
          style={{
            width: 40,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            borderLeft: `1px solid rgba(255,255,255,0.04)`,
            background: 'rgba(43,140,193,0.06)',
          }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M6 9l6 6 6-6" />
          </svg>
        </span>
      </button>

      {/* Modal */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: 'absolute', inset: 0, zIndex: 31, background: T.scrim }} />
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 32,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 20,
              pointerEvents: 'none',
            }}
          >
            <div
              role="listbox"
              aria-label={label || 'Select an option'}
              style={{
                pointerEvents: 'auto',
                width: '85%',
                maxHeight: '70%',
                display: 'flex',
                flexDirection: 'column',
                borderRadius: 18,
                border: `1px solid ${T.primaryEdge}`,
                borderTop: `2px solid ${T.topHighlight}`,
                background: T.raised,
                overflow: 'hidden',
                boxShadow: '0 16px 32px rgba(0,0,0,0.5)',
                animation: 'screenIn 0.2s ease',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 18px',
                  background: 'linear-gradient(180deg,rgba(25,48,72,0.8),rgba(15,32,53,0.4))',
                  borderBottom: '1px solid rgba(0,0,0,0.3)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 6, height: 6, borderRadius: 3, background: T.primary }} />
                  <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: 0.3, textTransform: 'uppercase', color: T.text }}>
                    {label || 'Select an option'}
                  </div>
                </div>
                <button
                  type="button"
                  aria-label="Close picker"
                  onClick={() => setOpen(false)}
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderTop: '1px solid rgba(255,255,255,0.14)',
                    background: 'rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                  }}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.textMute} strokeWidth="2" strokeLinecap="round">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Accent strip */}
              <div
                style={{
                  height: 2,
                  background:
                    'linear-gradient(90deg,rgba(43,140,193,0),rgba(43,140,193,0.4),rgba(53,160,214,0.5),rgba(43,140,193,0.4),rgba(43,140,193,0))',
                }}
              />

              {/* Options */}
              <div style={{ overflowY: 'auto', padding: 10 }}>
                {options.map((o) => {
                  const selected = o === value
                  return (
                    <button key={o} type="button" role="option" aria-selected={selected} onClick={() => select(o)} style={optionRow(o)}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: 4,
                            background: selected ? T.primary : 'transparent',
                            border: selected ? 'none' : '1.5px solid rgba(153,186,221,0.2)',
                            boxShadow: selected ? `0 0 5px ${T.primary}` : 'none',
                          }}
                        />
                        <span
                          style={{
                            fontSize: 13,
                            color: selected ? T.text : 'rgba(153,186,221,0.7)',
                            fontWeight: selected ? 600 : 400,
                          }}
                        >
                          {o}
                        </span>
                      </span>
                      {selected && (
                        <span
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 6,
                            border: '1px solid rgba(43,140,193,0.2)',
                            background: 'rgba(43,140,193,0.15)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.primary} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        </span>
                      )}
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
