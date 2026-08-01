'use client'

import type { ReactNode } from 'react'
import type { SettingsIconId } from '@/features/demo/engine/content/settings-catalog'

/**
 * The web equivalents of the ten Ionicons glyphs the phone's Settings rows draw
 * (`settings-catalog.tsx:177-265`). Same treatment the drawer's Media accordion got at P4.2:
 * this feature has no icon font, and on a settings row the glyph is the only thing that makes
 * the list scannable, so each one is drawn as inline SVG rather than dropped.
 *
 * `stroke="currentColor"` throughout — the chip owns the tint, so a restyle is one property at
 * the call site instead of ten here. The catalog's `SettingsIconId` values ARE the Ionicons
 * names, which keeps this table checkable against the phone by eye.
 */
const GLYPHS: Record<SettingsIconId, ReactNode> = {
  'person-circle-outline': (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="10" r="3.1" />
      <path d="M6.3 19.1a6.4 6.4 0 0 1 11.4 0" />
    </>
  ),
  'contrast-outline': (
    <>
      <circle cx="12" cy="12" r="9" />
      {/* The filled half is what makes this "contrast" rather than a plain circle. */}
      <path d="M12 3a9 9 0 0 1 0 18z" fill="currentColor" stroke="none" />
    </>
  ),
  'camera-outline': (
    <>
      <path d="M4 8h3l1.5-2h7L17 8h3a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z" />
      <circle cx="12" cy="13.5" r="3.5" />
    </>
  ),
  'location-outline': (
    <>
      <path d="M12 21s7-6.1 7-11a7 7 0 1 0-14 0c0 4.9 7 11 7 11z" />
      <circle cx="12" cy="10" r="2.6" />
    </>
  ),
  'time-outline': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.3l3.4 2" />
    </>
  ),
  'options-outline': (
    <>
      <path d="M4 7h9M17 7h3M4 12h3M11 12h9M4 17h9M17 17h3" />
      <circle cx="15" cy="7" r="2" />
      <circle cx="9" cy="12" r="2" />
      <circle cx="15" cy="17" r="2" />
    </>
  ),
  'shield-checkmark-outline': (
    <>
      <path d="M12 3l7 3v5.6c0 4.4-3 8-7 9.4-4-1.4-7-5-7-9.4V6l7-3z" />
      <path d="M9 12.2l2.2 2.2 4.3-4.4" />
    </>
  ),
  'lock-closed-outline': (
    <>
      <rect x="5" y="10.5" width="14" height="9.5" rx="2.5" />
      <path d="M8.5 10.5V8a3.5 3.5 0 1 1 7 0v2.5" />
    </>
  ),
  'cloud-upload-outline': (
    <>
      <path d="M7.2 18h9.6a3.5 3.5 0 0 0 .3-7A5.5 5.5 0 0 0 6.6 10.9 3.6 3.6 0 0 0 7.2 18z" />
      <path d="M12 20.8v-7.4M9.6 15.6L12 13.2l2.4 2.4" />
    </>
  ),
  'information-circle-outline': (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11.2v5.6" />
      <circle cx="12" cy="7.8" r="0.95" fill="currentColor" stroke="none" />
    </>
  ),
}

/** One settings glyph. Decorative — every caller supplies the accessible name in text. */
export function SettingsIcon({ id, size = 19 }: { id: SettingsIconId; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      data-settings-glyph={id}
    >
      {GLYPHS[id]}
    </svg>
  )
}
