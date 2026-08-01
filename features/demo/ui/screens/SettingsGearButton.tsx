'use client'

/**
 * The gear that opens Settings — the phone's `MainHeader` settings affordance
 * (`src/components/layout/MainHeader.tsx:64-73`), which sits at the right of BOTH tab headers
 * (`app/(tabs)/home.tsx:350`, `app/(tabs)/cases.tsx:1019`) and on Cases shares the row with the
 * New Case folder.
 *
 * One component for both call sites: the phone gets that for free from a shared header
 * component, and two hand-rolled copies of a 24px glyph is exactly how they drift.
 *
 * `accessibilityLabel="Open settings"` is the phone's, verbatim (`MainHeader.tsx:69`).
 */
export function SettingsGearButton({ onClick }: { onClick(): void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open settings"
      aria-haspopup="dialog"
      data-testid="header-settings-button"
      style={{ display: 'flex', alignItems: 'center', padding: 2, background: 'transparent', border: 'none', cursor: 'pointer' }}
    >
      {/* Ionicons `settings-outline`, at the phone's size 24 / `colors.primary`. */}
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#2B8CC1" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <circle cx="12" cy="12" r="3.2" />
        <path d="M19.4 14.6a1.6 1.6 0 0 0 .32 1.77l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V21a2 2 0 1 1-4 0v-.1a1.6 1.6 0 0 0-1.05-1.46 1.6 1.6 0 0 0-1.77.32l-.06.06A2 2 0 1 1 4.44 17l.06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H3a2 2 0 1 1 0-4h.1a1.6 1.6 0 0 0 1.46-1.05 1.6 1.6 0 0 0-.32-1.77l-.06-.06A2 2 0 1 1 7 4.44l.06.06a1.6 1.6 0 0 0 1.77.32H9a1.6 1.6 0 0 0 .97-1.47V3a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06A2 2 0 1 1 19.56 7l-.06.06a1.6 1.6 0 0 0-.32 1.77V9a1.6 1.6 0 0 0 1.47.97H21a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.47.97z" />
      </svg>
    </button>
  )
}
