// Preview for FeaturePage — the full Case File feature page (breadcrumb, class
// chip, headline + intro, tip card, content rows, prev/next, beta strip).
//
// This is the text-heaviest, most compound component in the set, so it's authored
// from the repo's OWN catalog data rather than invented props — the same Feature
// objects app/(default)/features/[slug]/page.tsx renders. That exercises the real
// font stack, the next/link shim (breadcrumb + prev/next), and the node:fs shim
// (the "under the hood" diagram probes the filesystem and correctly falls back to
// its DIAGRAM PENDING placeholder here — see .design-sync/shims/node-fs.ts).
//
// cardMode:single + a tall viewport is set in config.marketing.json so this
// full-page component renders in one wide cell instead of a cramped grid.
import { FeaturePage } from 'open-pro-next'
import { features } from '@/lib/content/features'

// time-calibration (index 5) is the MARQUEE flagship: gold class chip, a tip,
// two media rows, a diagram, a beta strip — the richest page in the catalog.
const MARQUEE = features.findIndex((f) => f.slug === 'time-calibration')

export function MarqueeFeature() {
  return (
    <FeaturePage
      feature={features[MARQUEE]}
      index={MARQUEE}
      prev={features[MARQUEE - 1]}
      next={features[MARQUEE + 1]}
    />
  )
}

// A CORE-class page (blue-free, no marquee dot) with a different tip variant and
// row shape — proves the class chip and tip axis actually vary.
const CORE = features.findIndex((f) => f.classLabel === 'CORE')

export function CoreFeature() {
  return (
    <FeaturePage
      feature={features[CORE]}
      index={CORE}
      prev={features[CORE - 1]}
      next={features[CORE + 1]}
    />
  )
}
