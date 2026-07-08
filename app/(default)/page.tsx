import type { Metadata } from 'next'

import { Hero } from '@/components/home/hero'
import { ChainOfWork } from '@/components/home/chain-of-work'
import { EvidenceManifest } from '@/components/home/evidence-manifest'
import { RoadmapTease } from '@/components/home/roadmap-tease'
import { BetaCta } from '@/components/home/beta-cta'
import { getAllFeatures } from '@/lib/content/features'
import { siteConfig } from '@/lib/site-config'

export const metadata: Metadata = {
  title: `${siteConfig.name} — ${siteConfig.tagline}`,
  description: siteConfig.description,
}

/**
 * The Case-File home page, in design order: hero → chain of work → evidence
 * manifest → roadmap tease → beta CTA. All server-rendered; the only client
 * leaves live inside the sections (AppDemo video, chrome tab strip).
 */
export default function Home() {
  const features = getAllFeatures()

  return (
    // `isolate` creates the stacking context the -z-10 glow needs: without it the
    // negative-z child would paint BEHIND the layout wrapper's bg-ink-900 (painting
    // order: negative-z before in-flow block backgrounds) and vanish entirely.
    <div className="relative isolate">
      {/* hero top glow (blue radial, artboard 1a): the visible lower half of the
          design's 1100×520 ellipse, centered at the top edge so nothing pokes
          above <main>'s overflow clip; -z-10 keeps it behind the hero content. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 -z-10 h-[260px] w-[1100px] -translate-x-1/2 bg-[radial-gradient(550px_260px_at_50%_0%,rgba(43,140,193,0.16),transparent_70%)]"
      />
      <Hero />
      <ChainOfWork />
      <EvidenceManifest features={features} />
      <RoadmapTease />
      <BetaCta />
    </div>
  )
}
