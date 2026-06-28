'use client'

import type { CSSProperties } from 'react'

export type TabId = 'dashboard' | 'cases' | 'map'

const tab: CSSProperties = {
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 3,
  cursor: 'pointer',
  padding: '2px 0',
  background: 'transparent',
  border: 'none',
}

/** The phone's bottom tab bar (Dashboard / Cases / Map) — shown on the app-chapter screens. */
export function TabBar({ active, onSelect }: { active: TabId; onSelect(tab: TabId): void }) {
  const stroke = (id: TabId) => (active === id ? '#4BA3D4' : '#5d7a9a')
  const sw = (id: TabId) => (active === id ? 1.9 : 1.8)
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 18,
        background: 'linear-gradient(180deg,#1e3450,#16283c)',
        borderTop: '1px solid #28456b',
        padding: '8px 0 12px',
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 -6px 18px rgba(0,0,0,0.28)',
      }}
    >
      <button type="button" aria-label="Dashboard" onClick={() => onSelect('dashboard')} style={tab}>
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={stroke('dashboard')} strokeWidth={sw('dashboard')} strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="4" width="18" height="12" rx="2" />
          <path d="M8 20h8M12 16v4" />
        </svg>
      </button>
      <button type="button" aria-label="Cases" onClick={() => onSelect('cases')} style={tab}>
        <svg width="25" height="25" viewBox="0 0 24 24" fill={stroke('cases')}>
          <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
        </svg>
      </button>
      <button type="button" aria-label="Map" onClick={() => onSelect('map')} style={tab}>
        <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={stroke('map')} strokeWidth={sw('map')} strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V3l-6 2.5L9 4z" />
          <path d="M9 4v13.5M15 6.5V20" />
        </svg>
      </button>
    </div>
  )
}
