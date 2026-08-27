'use client'

import type { CSSProperties, ReactNode } from 'react'
import { TAB_LABELS, TAB_VIEWS, type TabView } from '@/features/demo/engine/content/screens'
import { colors } from '@/features/demo/ui/tokens/palette'

/** The tab bar's id space, sourced from the registry (kept as the module's public name). */
export type TabId = TabView

/**
 * Single source of truth for the bottom tab bar's height — overlays sit flush above it (no seam).
 *
 * **Decision D6: this 50 STAYS and is a documented divergence, not drift.** The phone sets NO
 * height — `app/(tabs)/_layout.tsx:15-19`'s `tabBarStyle` has `backgroundColor`, `borderTopColor`
 * and `paddingTop` and nothing else, so the bar takes `@react-navigation/bottom-tabs`' platform
 * default plus the safe-area inset. There is no number to port. Three overlays bottom-align
 * against this export (`export/ExportHub.tsx:66`, `map/CaseMapPicker.tsx:149`,
 * `map/MapBottomSheet.tsx:125`), and the demo's phone frame has no safe-area inset to resolve.
 */
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
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="12" rx="2" />
      <path d="M8 20h8M12 16v4" />
    </svg>
  ),
  cases: (stroke) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill={stroke}>
      <path d="M10 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-8l-2-2z" />
    </svg>
  ),
  map: (stroke, sw) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V3l-6 2.5L9 4z" />
      <path d="M9 4v13.5M15 6.5V20" />
    </svg>
  ),
  export: (stroke, sw) => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
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
        // A63/U8.3 — the phone's `tabBarStyle` verbatim (`app/(tabs)/_layout.tsx:15-19`):
        // a FLAT `colors.card` fill (the demo's `linear-gradient(180deg,#1e3450,#16283c)` had
        // no phone counterpart), `colors.border` hairline, `paddingTop: Layout.spacing.xsm`
        // (= 6). `backgroundColor` rather than the `background` shorthand so the flatness is
        // structural: a later gradient would have to delete a longhand, not just win a cascade.
        // The 12px BOTTOM padding is demo-only — it is what centres the icons inside D6's
        // fixed 50px, which the phone's inset-driven bar does not have.
        backgroundColor: colors.card,
        borderTop: `1px solid ${colors.border}`,
        padding: '6px 0 12px',
        display: 'flex',
        alignItems: 'stretch',
        boxShadow: '0 -6px 18px rgba(0,0,0,0.28)',
      }}
    >
      {TAB_VIEWS.map((id) => (
        <button
          key={id}
          type="button"
          aria-label={TAB_LABELS[id]}
          // The active tab was signalled by HUE ALONE across four destinations (WCAG 1.4.1 /
          // 4.1.2) — invisible to a screen reader and to anyone who can't separate the active
          // tint from the inactive one. `aria-current="page"` is the destination idiom (and what
          // React Navigation gives the phone's own tab bar for free); §67c's `aria-pressed`
          // stays with the media library's FILTER strip, which toggles what one sheet shows
          // rather than navigating. The port did not change this: it swapped WHICH two hues
          // are indistinguishable, so the announcement is still the only non-visual cue.
          aria-current={active === id ? 'page' : undefined}
          onClick={() => onSelect(id)}
          style={tab}
        >
          {/* `tabBarActiveTintColor` / `tabBarInactiveTintColor` (`(tabs)/_layout.tsx:13-14`).
              The two stroke widths are demo-only: the phone carries no `tabBarIconStyle` and
              Ionicons has no weight axis, so 1.9/1.8 has nothing to port against. */}
          {TAB_ICONS[id](active === id ? colors.primary : colors.textSecondary, active === id ? 1.9 : 1.8)}
        </button>
      ))}
    </div>
  )
}
