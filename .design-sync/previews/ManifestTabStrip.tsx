// Preview for ManifestTabStrip — the numbered feature tab strip, and the one
// pathname-aware component in the set. Its whole reason to exist is the gold
// ACTIVE-tab state, driven by usePathname; a card that doesn't set a pathname
// would hide exactly the behaviour worth showing.
//
// PathnameProvider (the sync's next/navigation shim, re-exported onto the bundle
// via cfg.extraEntries) supplies that pathname so the active state renders true.
// Items are mapped from the real catalog, matching what the marketing layout does.
import { ManifestTabStrip, PathnameProvider } from 'open-pro-next'
import { features } from '@/lib/content/features'

const items = features.map((f) => ({ slug: f.slug, navLabel: f.navLabel }))

// The flagship tab active — gold border, gold number, gold label.
export function ActiveTab() {
  return (
    <PathnameProvider value="/features/time-calibration">
      <ManifestTabStrip items={items} />
    </PathnameProvider>
  )
}

// A different tab active — proves the active state tracks the pathname, not a
// hardcoded index.
export function DifferentTabActive() {
  return (
    <PathnameProvider value="/features/reports">
      <ManifestTabStrip items={items} />
    </PathnameProvider>
  )
}

// No tab active (a non-feature route) — the resting state: cyan numbers,
// carolina labels, no gold.
export function NoActiveTab() {
  return (
    <PathnameProvider value="/">
      <ManifestTabStrip items={items} />
    </PathnameProvider>
  )
}
