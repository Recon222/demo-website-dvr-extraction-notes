'use client'

import type { CSSProperties, ReactNode } from 'react'
import { TAB_LABELS, TAB_VIEWS, type TabView } from '@/features/demo/engine/content/screens'

/** The tab bar's id space, sourced from the registry (kept as the module's public name). */
export type TabId = TabView

/** Single source of truth for the bottom tab bar's height — overlays sit flush above it (no seam). */
export const TAB_BAR_HEIGHT = 50

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

/**
 * Per-tab glyphs, mirroring the phone's Ionicons choices (`app/(tabs)/_layout.tsx:33,44,55,66`):
 * `desktop-outline` · `folder` · `map` · `archive-outline` — the phone's own comment marks the
 * archive box as an interim icon that "reads as 'evidence package'". A TOTAL record over
 * `TabView`, so a tab added to `TAB_VIEWS` cannot ship without one. The icons live here rather
 * than in the registry because they are JSX — the same reason the drawer's Media accordion rows
 * can't live in the engine (`content/explore.ts`).
 */
const TAB_ICONS: Record<TabView, (stroke: string, sw: number) => ReactNode> = {
  dashboard: (stroke, sw) => (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  cases: (stroke) => (
    <svg width="25" height="25" viewBox="0 0 24 24" fill={stroke}>
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  ),
  map: (stroke, sw) => (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V3l-6 2.5L9 4z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  ),
  export: (stroke, sw) => (
    <svg width="25" height="25" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="4" rx="1" />
      <path d="M5 8v10a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8" />
      <path d="M10 12h4" />
    </svg>
  ),
}

/**
 * The phone's bottom tab bar (Dashboard / Cases / Map / Export) — shown on the app-chapter
 * screens. Order is DERIVED from `TAB_VIEWS`, never hand-listed here, and the bridge decides
 * whether the bar shows at all from the same registry (`isTabView`).
 */
export function TabBar({ active, onSelect }: { active: TabView; onSelect(tab: TabView): void }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height: TAB_BAR_HEIGHT,
        boxSizing: 'border-box',
        zIndex: 18,
        background: 'linear-gradient(180deg,#1e3450,#16283c)',
        borderTop: '1px solid #28456b',
        padding: '8px 0 12px',
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 -6px 18px rgba(0,0,0,0.28)',
      }}
    >
      {TAB_VIEWS.map((id) => (
        <button key={id} type="button" aria-label={TAB_LABELS[id]} onClick={() => onSelect(id)} style={tab}>
          {TAB_ICONS[id](active === id ? '#4BA3D4' : '#5d7a9a', active === id ? 1.9 : 1.8)}
        </button>
      ))}
    </div>
  )
}
