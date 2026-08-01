'use client'

import type { CSSProperties } from 'react'
import { GLASS } from '@/features/demo/ui/glass-tokens'

/**
 * The Settings sheet's header, in the phone's two variants
 * (`src/features/settings/components/SettingsNavBar.tsx`):
 *
 * - `master` — gear + "Settings" + close (×)
 * - `detail` — back (‹ Settings) + the category title, absolutely centred so it ignores the
 *   asymmetric sides, plus a right spacer balancing the back button's width.
 *
 * The back label is the LITERAL string "Settings", never the previous screen's name — phone
 * parity (`SettingsNavBar.tsx:65`), and the reason a detail's back button reads the same
 * whichever row opened it.
 *
 * Opaque on purpose, exactly as the phone's is: list content scrolls under the bar, and a
 * translucent bar would let it bleed through (`SettingsNavBar.tsx:5-10`).
 */

const barBase: CSSProperties = {
  position: 'relative',
  flex: '0 0 auto',
  minHeight: 52,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '12px 16px',
  borderBottom: GLASS.border,
  background: GLASS.gradientPanel,
}

const iconBtn: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'transparent',
  border: 'none',
  padding: 4,
  cursor: 'pointer',
}

/** Ionicons `settings-sharp` — the master bar's title glyph. */
function GearIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2B8CC1" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.4 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06A2 2 0 1 1 4.44 17l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06A2 2 0 1 1 7 4.44l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06A2 2 0 1 1 19.56 7l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z" />
    </svg>
  )
}

export type SettingsNavBarProps =
  | { variant: 'master'; onClose(): void }
  | { variant: 'detail'; title: string; titleId: string; onBack(): void }

export function SettingsNavBar(props: SettingsNavBarProps) {
  if (props.variant === 'master') {
    return (
      <div style={barBase}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <GearIcon />
          <div style={{ fontSize: 22, fontWeight: 700, color: '#f0f4f8', letterSpacing: 0.2 }}>Settings</div>
        </div>
        <button
          type="button"
          onClick={props.onClose}
          aria-label="Close settings"
          data-testid="settings-close-button"
          style={{ ...iconBtn, width: 30, height: 30, borderRadius: 15, background: 'rgba(255,255,255,0.06)' }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#99badd" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>
    )
  }

  return (
    <div style={barBase}>
      <button
        type="button"
        onClick={props.onBack}
        aria-label="Back to settings"
        data-testid="settings-back-button"
        style={{ ...iconBtn, gap: 1, marginLeft: -6, padding: '4px 4px 4px 0', zIndex: 2 }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#2B8CC1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M15 18l-6-6 6-6" />
        </svg>
        <span style={{ fontSize: 16, fontWeight: 500, color: '#2B8CC1' }}>Settings</span>
      </button>

      {/* Absolutely centred so the asymmetric sides never shift it (phone `centerTitle`). */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div id={props.titleId} role="heading" aria-level={2} style={{ fontSize: 16, fontWeight: 600, color: '#f0f4f8' }}>
          {props.title}
        </div>
      </div>

      {/* Right spacer balancing the back button (phone `rightSpacer`, width 92). */}
      <div style={{ width: 92 }} />
    </div>
  )
}
