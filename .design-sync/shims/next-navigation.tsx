// Stands in for `next/navigation` when the marketing components are bundled
// outside Next (wired via .design-sync/tsconfig.sync.json `paths`).
//
// Only `usePathname` is actually imported by this repo's components — exactly one
// consumer, ManifestTabStrip, the sole client island in the marketing chrome. It
// reads the pathname to decide which tab gets the gold active state.
//
// That makes the return value a design decision, not a detail: hardcode "/" and
// every ManifestTabStrip preview renders with NO tab active, quietly hiding the
// one state the component exists to express. So the pathname comes from context
// with a "/" default — real behaviour outside a provider, and previews can wrap
// in PathnameProvider to show the active state truthfully.
//
// PathnameProvider is re-exported into the bundle via cfg.extraEntries so preview
// files can import it from the package like any other export.

import * as React from 'react'

/** Default matches Next's own behaviour at the site root. */
export const PathnameContext = React.createContext<string>('/')

/**
 * Drives the active state of pathname-aware components (ManifestTabStrip).
 * Wrap a preview in this to render a given route as the active one.
 *
 * @example
 * <PathnameProvider value="/features/rebuild-the-timeline">
 *   <ManifestTabStrip items={items} />
 * </PathnameProvider>
 */
export function PathnameProvider({ value, children }: { value: string; children: React.ReactNode }) {
  return <PathnameContext.Provider value={value}>{children}</PathnameContext.Provider>
}

/** Mirrors next/navigation's usePathname. */
export function usePathname(): string {
  return React.useContext(PathnameContext)
}
